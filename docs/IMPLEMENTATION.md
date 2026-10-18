# Implementation checkpoint · 18 October 2026

Status: Phase A implementation under verification. No public launch or live-provider approval is claimed.

## Target

A Pakistan-focused scanner web flow and owner portal: intentional fixed-reason alerts without revealing the owner's phone number. Verified owner identity, separate sealed sticker activation, explicit acknowledgement, durable WhatsApp dispatch and SMS fallback, consented backup, scoped site summaries, minimal fulfilment/support and auditable operations. Local masked voice remains Phase B and is disabled by omission.

## Decisions from the proposed architecture

- Next.js/React/TypeScript on Node 24; exact package versions in package-lock.json.
- PostgreSQL with parameterized SQL and numbered transactional migrations. The proposed Prisma choice was not retained: explicit SQL makes the claim locks, dispatch leases and public projections directly reviewable and avoids adopting the registry's current prerelease Prisma release. Existing planning remains the historical baseline.
- PostgreSQL transactional delivery table doubles as the outbox and durable queue. A separate worker leases with SKIP LOCKED. Redis/BullMQ is deferred because a second queue adds an unnecessary dual-write boundary at this scale. This changes operations, not the requirement for durable jobs.
- Supabase phone OTP verifies live identities. The application stores only encrypted contact values and HMAC lookups. Live staff must have verified, recent TOTP MFA. App-session revocation is recorded locally. Access tokens are HttpOnly and never returned to browser JavaScript. Sessions expire without silent refresh in this version.
- Local OTP and staff MFA are explicitly simulated, guarded by APP_ENV, loopback origin and AUTH_MODE. They must never run in staging/production.
- Meta adapter implements template submission and signed receipt processing. A contracted SMS gateway adapter defines an explicit supplier contract. Neither adapter is evidence of a live integration or supplier permission.

## Working tree at this checkpoint

Core schema, identity, vehicle/tag lifecycle, incident creation/status, worker, provider adapters, webhook processing, backup opt-in, basic tenant boundaries, audit and UI have been written. Tests, build and operational review are in progress. Do not infer completion from file presence.

## Environment limit

The current execution environment blocked the development runner's IPC socket and native PostgreSQL's OS-user creation. The runner was changed to Node's direct tsx import. Tests will support in-process PGlite locally and real PostgreSQL in CI; native multi-connection results must be reported separately. Browser QA is unavailable in this environment; visual usability must be checked on real devices before launch.
