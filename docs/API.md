# Implemented API

The executable request boundary is `packages/server/http.ts`. The OpenAPI file describes this implementation, replacing the earlier proposal. Base URL is the configured origin, with `/api` prefix.

## Rules

Cookie mutations require exact `Origin: APP_ORIGIN`, `Content-Type: application/json`, and a body no larger than 64 KiB. Cookies are HttpOnly, SameSite=Strict, and Secure for HTTPS origins. All JSON responses use `Cache-Control: no-store`. IDs are UUIDs. Inputs are allowlisted by Zod. Errors contain only `{error, requestId}`. Unknown database/provider errors return a generic 503 and a request reference, not raw messages.

The scanner obtains its cookie with `POST /api/session {}` before submitting. This creates no incident and sends no notification. Public GETs never create alerts. Scanner cookies may access only incidents created by that same session. A public QR token never grants owner permissions.

| Surface | Method and path | Body / behavior |
|---|---|---|
| Configuration | GET `/api/config` | Safe mode flags and public CAPTCHA site key |
| Health | GET `/api/health` | Database connectivity only |
| Scanner session | POST `/api/session` | Empty JSON; sets scanner cookie if absent |
| Sign in | POST `/api/auth/start` | `phone`, optional `captchaToken` (required live) |
| Verify | POST `/api/auth/verify` | `phone`, six-digit `code`, `challengeId`; sets owner cookie |
| Sign out | POST `/api/auth/logout` | Revokes the application session |
| Public sticker | GET `/api/public/tags/{token}` | Available flag, descriptor, default locale, fixed reasons; uniform unavailable projection |
| Submit | POST `/api/public/tags/{token}/incidents` | `reason`, optional `location`, live `challengeToken`; required `Idempotency-Key` |
| Progress | GET `/api/public/incidents/{id}` | Safe state, response, expiry, delivery projection; scanner cookie required |
| Scanner action | POST `/api/public/incidents/{id}/{action}` | Empty JSON; action `cancel`, `resolve`, `report` |
| Owner dashboard | GET `/api/owner/dashboard` | Own vehicles, tags, incident history, consent flags, orders and site memberships |
| Add vehicle | POST `/api/owner/vehicles` | `make`, `color`; no phone, plate or legal-ownership evidence |
| Claim sticker | POST `/api/owner/tags/claim` | `token`, `claimSecret`, `vehicleId`; one atomic claim |
| Sticker SVG | GET `/api/owner/tags/{id}/sticker` | Own tag's public scan URL and QR SVG |
| Sticker action | POST `/api/owner/tags/{id}/{action}` | Empty JSON; `pause`, `resume`, `revoke`, `transfer` |
| Owner response | POST `/api/owner/incidents/{id}` | `action`: `coming`, `unavailable`, `report_abuse`, `resolve` |
| Preferences | POST `/api/owner/preferences` | `whatsapp`, `sms`, `dnd`, `locale`; records consent version |
| Backup invitation | POST `/api/owner/backup/invite` | `vehicleId`; returns a private fragment-secret link |
| Accept backup | POST `/api/owner/backup/accept` | `secret`; requires separate SMS consent |
| Withdraw backup | POST `/api/owner/backup/remove` | `vehicleId`; owning user or accepted backup only |
| Backup list | GET `/api/owner/backups` | Vehicles for which the current user is accepted backup |
| Export | GET `/api/owner/export` | Own minimal account, consent, vehicles and incidents; no third-party private data |
| Delete | POST `/api/owner/delete` | `confirm: DELETE`; deactivates/erases contact value, revokes tags and app sessions |
| Manual order | POST `/api/owner/orders` | `quantity`, 1–20; no payment |
| Staff MFA | POST `/api/mfa/{action}` | `enroll`, `factors`, or `verify` with `factorId`/`code`; `simulate` is local only |
| Admin overview | GET `/api/admin/overview` | Redacted queue, audit, inventory, reports and order state; staff plus recent MFA |
| Batch | POST `/api/admin/batches` | `quantity`, 1–100; admin/fulfilment; private secret manifest returned once |
| Reconcile | POST `/api/admin/reconcile` | `deliveryId`, `result` (`failed`/`accepted`), accepted `providerId`; never resends |
| Review report | POST `/api/admin/reports/{id}` | Empty JSON; marks reviewed and audits |
| Order update | POST `/api/admin/orders/{id}` | `state`: `contacted`, `fulfilled`, `cancelled`; admin/fulfilment |
| Create site | POST `/api/admin/tenants` | `name`; platform admin |
| Membership | POST `/api/admin/memberships` | `tenantId`, `userId`, `role` (`staff`/`manager`); platform admin |
| Allocate | POST `/api/admin/allocate` | `tenantId`, `tagId`; admin/fulfilment; unclaimed tag only |
| Site summary | GET `/api/site/{tenantId}` | Membership required; safe incident summaries only |
| WhatsApp | GET/POST `/api/webhooks/whatsapp` | Verification handshake / signed raw provider payload |
| SMS | POST `/api/webhooks/sms` | Signed raw gateway receipt; see PROVIDERS.md |

## Submission example

Obtain the scanner cookie first, then submit the same request key on retries. Generate keys on the client; never reuse a key for a different reason, tag or location.

```http
POST /api/public/tags/OPAQUE_PUBLIC_TOKEN/incidents
Origin: https://YOUR_CONFIGURED_ORIGIN
Content-Type: application/json
Idempotency-Key: RANDOM_REQUEST_UUID
Cookie: scanner_session=OPAQUE_SESSION

{"reason":"blocked_access"}
```

In live mode add a fresh `challengeToken`. Optional location is a strict object containing numeric `latitude`, `longitude` and `accuracy`. Free text and arbitrary destination numbers are rejected. A successful result is 201 with `{id, state, expiresAt}`. Matching retries return the same logical incident, including its current state.

Reason values: `blocked_access`, `lights_on`, `window_open`, `visible_damage`, `urgent_concern`.

## Status semantics

Incident state: OPEN, ACKNOWLEDGED, RESOLVED, CANCELLED, EXPIRED. `unavailable` and `report_abuse` are explicit owner responses, not false resolutions. Both stop escalation. Acknowledgement does not prove the car moved. Resolution records whether owner or scanner reported it.

Public delivery: PENDING (queued/submitting), ACCEPTED (a live provider accepted the alert without delivery evidence), SIMULATED (simulated acceptance or receipt; no real send), CONFIRMED (a real delivered/read receipt), UNCONFIRMED (no confirmation evidence). Simulated acceptance or receipts cannot produce CONFIRMED. Provider delivery state is separate from incident outcome; owner acknowledgement and resolution do not manufacture delivery evidence.

## Errors and limits

400 invalid body/challenge; 401 missing/invalid identity; 403 forbidden role/MFA/origin; 404 unavailable or unowned record; 409 consumed claim, changed idempotency body or closed incident; 413 body too large; 415 wrong content type; 429 rate/abuse limit; 503 unavailable service.

Current policy: per-tag 3 incident submissions/10 minutes; per-scanner 10/hour; per-IP 10/hour; one recent request per tag/scanner/5 minutes. OTP resend once/minute, 10/recipient/day, 20/IP/hour; at most five guesses for a simulation challenge; live phone verification five/5-minute bucket plus provider protections. Fixed windows can permit boundary bursts; production edge controls and calibration are still necessary.
