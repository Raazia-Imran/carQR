# Implementation and release status · 18–19 October 2026

**Phase A alpha implemented; public launch blocked by live integration and operational gates.** No production deployment was performed. Changes are reviewed in [PR #9](https://github.com/Raazia-Imran/carQR/pull/9) on `feat/phase-a-application`; `main` retains the original plan until the PR is accepted.

## What we are targeting

A Pakistan-focused scanner web app and owner portal. A passerby intentionally submits a fixed reason from a QR sticker; the platform contacts the verified, consenting owner without revealing the owner's number publicly. Explicit acknowledgement governs escalation. The scanner needs internet; a configured real SMS fallback can reach an owner with cellular service but no mobile data. The product does not guarantee delivery, response or emergency assistance.

## Scope delivered

| Area | Implemented | Remaining boundary |
|---|---|---|
| Owner identity | Local single-use OTP; Supabase OTP adapter; HttpOnly sessions and local revocation; staff TOTP integration | Hosted OTP/TOTP configuration and live verification; phone-change/recovery workflow |
| Stickers | Batch manifest, separate claim secret, QR SVG, atomic claim, pause, revoke, transfer | Brand/domain clearance; physical print tests; support replacement tooling for lost unclaimed secrets |
| Scanner | Safe DTO, fixed reasons, confirmation, optional location, session-bound progress/cancel/report, live CAPTCHA verification | Real mobile/browser accessibility tests; stronger edge abuse tuning |
| Owner | Inbox, acknowledgement/cannot-attend/report, resolution, consent/DND, own history | Native push notifications and WhatsApp reply acknowledgement are not included |
| Reliability | Transactional PostgreSQL outbox/queue; separate worker; 90 s SMS fallback; 180 s backup; expiry; unknown reconciliation; signed receipts | Real providers, callback configuration, transport and operational evidence |
| Backups | Private invitation, independent sign-in/consent, one backup, withdrawal | Broader backup roles/actions beyond receiving an alert |
| Operations | Minimal admin/fulfilment/support separation, MFA gate, audit, manual order states | Named operator, fulfilment/settlement process and independently reviewed access policy |
| Sites | Site records, membership assignment, unclaimed-tag allocation, tenant-scoped read-only summaries | Full site staff incident creation/resolution, tenant budgets and reporting |
| Privacy | Encrypted contact field, HMAC lookup, minimal public projection, old-owner history snapshot, consent records, location/incident/audit retention | Legal/entity review, managed key lifecycle, hosted-account erasure and backup policy |
| UI | Responsive components, touch-size controls, English/Roman Urdu/Urdu reason labels and RTL selection, install manifest/offline page | Fluent Urdu review; full interface translation; real-device visual QA |
| Voice | No public calling endpoints or arbitrary dial destinations | Phase B carrier route/CLI approval and separate implementation |

## Decisions from the proposed architecture

- Next.js/React/TypeScript on Node 24; exact npm dependency versions are in package-lock.json.
- PostgreSQL uses parameterized SQL and numbered transactional migrations. The proposed Prisma choice was not retained: claim locks, dispatch leases and projections are directly reviewable, without adopting the registry's current prerelease Prisma version.
- PostgreSQL's delivery table doubles as outbox and durable queue. A separate worker uses SKIP LOCKED leases. Redis/BullMQ was deferred to avoid a second queue and dual-write/reconciliation boundary at this scale.
- Supabase handles live phone verification and TOTP. Contact values remain encrypted in the app database; the hosted identity provider also processes identity information. Live access tokens are HttpOnly and app sessions are independently revocable. Silent refresh is not implemented.
- Simulation is local/test only with a loopback origin. Production/staging refuse simulated identity or messaging. Configured deployment flags are an operator responsibility; do not expose a local process through a public proxy.
- Meta template submission uses two body variables (reason/reference); the original three-variable planning sketch is superseded for this adapter. Replies must be made in the authenticated dashboard. The generic SMS gateway is an explicit integration contract that requires a real supplier mapping.
- The worker uses conservative at-most-one application submission per logical stage. Ambiguous results remain UNKNOWN until receipt/operator evidence. It does not claim exactly-once external delivery.

## Verification

The first published checkpoint passed 28 integration tests locally and in native PostgreSQL GitHub CI, plus typecheck, build and runtime dependency audit. Further review adds regression coverage for immutable history after transfer, receipts arriving before send response, in-flight acknowledgement, provider request mapping, uncertain transports and live CAPTCHA checks. See [TESTING.md](TESTING.md) for the current result and limits.

Local native PostgreSQL could not start in the restricted execution environment because its OS-user setup was denied. PGlite provided local SQL testing; native multi-connection tests ran successfully in GitHub Actions. Browser automation was not available in this environment. No screenshot, device, carrier or physical sticker result is fabricated.

## What prevents a real-world launch

1. Approved WhatsApp business sender, selected Graph version and two-parameter template.
2. Contracted SMS route/gateway and real receipt/signature verification; separate Supabase OTP provider configuration.
3. Live Turnstile and Supabase phone/MFA setup, with direct-provider rate/spend controls.
4. HTTPS hosting, trusted ingress, monitoring, backup/restore rehearsal and rollback evidence.
5. Distinct brand/domain, reviewed privacy/terms/support identity, commercial and retention decisions.
6. Human code/security review, mobile/keyboard/RTL testing, printed-tag tests and all-network data-off owner testing.

These are launch gates, not invented evidence or hidden completed tasks. The existing Phase B roadmap remains conditional on approved carrier use and caller-ID masking tests.
