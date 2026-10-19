# Identity and communication integration

These adapters are implemented and transport-mocked in tests. No real provider credentials, approved sender, SMS route, tariff, recipient or delivery result was supplied. Configure staging first; production remains gated.

## Mode and secret boundary

`APP_ENV=staging|production` requires HTTPS, `AUTH_MODE=supabase`, and `PROVIDER_MODE=live`. Fake OTP/MFA and simulated sends are refused in deployed environments. `APP_ENV=local|test` accepts only a loopback origin. Never expose a local simulation server through a tunnel.

Use independent 32-byte random hex values for `PHONE_ENCRYPTION_KEY`, `PHONE_LOOKUP_HMAC_KEY`, and `SESSION_SECRET`. The encryption format is AES-256-GCM `v1.iv.tag.ciphertext`; `v1` is a key-version marker, not a key-management service. Rotate by an offline, backed-up re-encryption migration. Replacing the environment key alone destroys decryptability. Changing lookup/session keys requires a planned reindex/session invalidation.

## Supabase phone identity

1. Create a separate Supabase project for staging and another for production. Configure its supported, approved SMS provider and Pakistan route; this is independent of the application alert-SMS gateway.
2. Enable phone OTP authentication. Set OTP lifetime to five minutes, rate limits, and CAPTCHA in the provider dashboard. The app also enforces phone/IP resend and verification limits, but provider limits must cover direct requests to its public Auth API.
3. Configure a Cloudflare Turnstile widget limited to the application hostname. Configure the same widget's secret in Supabase CAPTCHA settings. Put its public key in `TURNSTILE_SITE_KEY` and secret in `TURNSTILE_SECRET_KEY`.
4. Set `SUPABASE_URL` and the project's public/anon key in `SUPABASE_ANON_KEY`. The app does not use a Supabase service-role key. Its own PostgreSQL tables are not public Supabase client tables.
5. Test send/verify with consenting team-owned numbers. The server exchanges the OTP, verifies phone confirmation, maps the provider subject, encrypts the phone, stores a session hash and sets an HttpOnly cookie. Returning visitors use the same provider identity and lookup hash.
6. Live sessions expire with the provider access token; there is no silent refresh. Sign in again when prompted. Logout revokes access to this application by removing its session hash. Provider-wide account/session deletion is a separate operator action.
7. Staff use Administration to enroll a TOTP authenticator or select an existing verified factor. The server verifies the token with the provider and requires `aal2` plus a TOTP authentication time within 15 minutes. Role assignment still requires `npm run admin:grant -- ACCOUNT_UUID ROLE`.

Phone-number changes, recycled-number recovery and hosted identity erasure need a reviewed operator procedure in this alpha. A mismatched provider subject never silently inherits an earlier account. Test the complete hosted OTP/TOTP path before enabling staff access; mock tests do not prove live provider behavior.

## Cloudflare Turnstile

The live sign-in form passes the token to Supabase's configured CAPTCHA verification. The incident form calls the application's server-side Siteverify integration, checks success and exact hostname, and fails closed. Do not validate one sign-in token twice: Supabase consumes that token. Incident retries that already committed can return their original result without a new challenge, but cannot alter their body.

## WhatsApp Cloud API

Set `META_GRAPH_VERSION` to a provider-supported version selected during staging, `META_PHONE_NUMBER_ID`, `META_ACCESS_TOKEN`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_TEMPLATE_NAME`, and optional `META_TEMPLATE_LANGUAGE` (default `en`). No graph version or template approval is guessed by the application.

The configured template must have **two body text parameters**, in order:

1. The allowlisted reason, for example the configured label for lights left on.
2. The short incident reference.

This is an implementation change from the original three-variable proposed template. Use a static approved owner-portal URL in the template if desired. The current adapter does not process WhatsApp quick replies or conversational replies; acknowledgement occurs in the authenticated dashboard. Do not advertise reply-button acknowledgement as implemented.

The adapter submits `messaging_product=whatsapp`, a template, the server-resolved destination, and `biz_opaque_callback_data` containing the delivery UUID. Subscribe the sender to the application's WhatsApp webhook. Configure the verification token for the GET handshake. POST validation uses `X-Hub-Signature-256` over the original body and the app secret. No raw webhook body is retained. Duplicate payload hashes are ignored; out-of-order delivery events cannot undo explicit owner acknowledgement.

## Contracted SMS gateway

No Pakistani SMS supplier was selected or approved. `SMS_GATEWAY_URL` is an **operator-owned/contracted adapter endpoint**, not a claim that every supplier supports this schema. Implement the small mapping to your chosen supplier or adapt `LiveProvider` to its documented API before live use.

Request: HTTPS POST, bearer `SMS_API_KEY`, JSON, and `Idempotency-Key: DELIVERY_UUID`.

```json
{"to":"SERVER_RESOLVED_E164","reference":"DELIVERY_UUID","text":"ALLOWLISTED_REASON_AND_REFERENCE"}
```

Success must return a JSON object with a nonempty string `id`, the provider message ID. The body includes the reason and reference, so the SMS is useful without opening the portal. A supplement link points to the authenticated dashboard; it grants no access by itself.

The gateway must validate the idempotency key, keep a reconciliation ledger and expose the real provider ID. It must not accept arbitrary caller-supplied destinations from the public app. The app resolves every recipient on the server. Timeouts, rate-limit responses, 5xx responses and malformed successes are recorded as `UNKNOWN`; they are not blindly resent.

Receipt callback: POST `/api/webhooks/sms` with raw JSON:

```json
{"eventId":"SUPPLIER_EVENT_ID","id":"PROVIDER_MESSAGE_ID","state":"DELIVERED","reference":"DELIVERY_UUID"}
```

Allowed states are `ACCEPTED`, `DELIVERED`, `FAILED`. Include `X-Timestamp` as Unix seconds and `X-Signature` as the lowercase hex HMAC-SHA256 of `timestamp + '.' + rawBody`, using `SMS_WEBHOOK_SECRET`. A five-minute timestamp window and durable event-ID deduplication apply. The gateway must retry callbacks until 2xx, with a fresh signed timestamp and stable event ID. If supplier callbacks cannot be mapped and authenticated, keep the stage blocked.

## Reliability boundaries

- The worker rechecks consent, active ownership, pause/DND, incident state, backup acceptance and budgets before submission.
- Acknowledgement suppresses future work. A provider call already in flight can still complete; no database transaction can recall that external request.
- The delivery row is the transactional outbox. Each incident/channel/recipient/stage tuple is unique.
- A hard WhatsApp rejection accelerates the queued SMS fallback. Accepted/read receipts do not cancel fallback.
- Uncertain attempts require verified provider evidence in the admin reconciliation screen. No automatic retry of ambiguous sends is implemented.
- `DAILY_MESSAGE_LIMIT` is a reservation-count cap, not an exact currency budget. Supabase OTP spend needs provider-side caps too. Per-tenant currency accounting is deferred.

## Official references checked during implementation

- [Supabase phone login](https://supabase.com/docs/guides/auth/phone-login)
- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha)
- [Cloudflare server-side token verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
- [PostgreSQL SELECT and locking](https://www.postgresql.org/docs/current/sql-select.html)

Implementation review dates: 18–19 October 2026. The direct Meta payload page was inaccessible through the research tool. The adapter must be checked against the selected Graph API version and approved template in staging; it has only mock-transport evidence here.
