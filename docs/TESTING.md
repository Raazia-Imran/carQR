# Verification record

The automated suite is `tests/application.test.ts`. It drives domain functions and the actual HTTP handler against SQL storage. HTTP tests exercise request parsing, cookies, origins and scope without starting a browser. Provider-transport tests replace fetch with controlled responses; no real messages are sent.

## Recorded evidence

- Initial published application checkpoint: `9238240ca6ffa80c0761bfe0dd12a3da7a2cfedd`.
- [Native PostgreSQL CI run](https://github.com/Raazia-Imran/carQR/actions/runs/39136588231): passed typecheck, all 28 initial integration tests, production build and runtime dependency audit. The push-triggered run also passed.
- Local PGlite run: all 28 initial tests passed. The test harness serializes its in-process connections, so it is not the evidence for independent PostgreSQL connection locking.
- Final local suite: all 34 tests passed after adding six regression/transport tests. Final typecheck and production build passed. The final native CI result is tracked on PR #9.
- `npm audit --omit=dev` reported zero known runtime dependency vulnerabilities at the tested checkpoint. This is a registry advisory result, not a guarantee that the software contains no security flaws.

## Risk coverage

| Original scenario | Automated evidence | Remaining check |
|---|---|---|
| T01–T02, T09 | Public DTO allowlist, uniform unavailable view, GET has no alert side effect | Browser HTML/network inspection with real devices |
| T03–T05 | Competing claim, public-token rejection, owner/scanner isolation | Human security review |
| T06 | Membership required and tenant-safe projection | Full multi-site workflow not implemented |
| T07–T08 | Concurrent same-key retries and changed-body conflict | Long-running abuse profiling |
| T10–T13 | Lost submitting lease, unknown-send handling, receipt replay/order, bad signatures | Actual process termination/restart and live supplier callback behavior |
| T14–T16 | Exact 90-second schedule, delivery does not acknowledge, queued fallback suppression, in-flight response race | Real handset timing and accepted-message race acceptance |
| T17–T19 | SMS text includes reason/reference; offline UI exists | Data-off, phone-off and scanner-offline device tests |
| T20–T21 | No unaccepted backup, separate consent, withdrawal, paused tags and revoked channel checks | Real delivery/opt-out checks |
| T22 | Dashboard action explicitly identifies the incident | WhatsApp conversational replies are not implemented |
| T23 | OTP attempts/reuse, per-tag caps, atomic platform message reservation cap, mocked live CAPTCHA | Real challenge UI, edge limits and OTP provider billing caps |
| T24 | Optional location validation and UI non-blocking design | GPS-denied and poor-accuracy browser test |
| T25 | Owner actions require authenticated owner, not a message link | Forwarded-link manual check |
| T26 | Transfer cancels old incidents, rotates claim secret, preserves original history description | Phone-change and support-recovery workflows remain assisted/deferred |
| T27–T30 | Not applicable to this implementation | Phase B unimplemented and approval-gated |
| T31 | Runbook only | Timed isolated backup restore and rollback rehearsal |
| T32 | Coordinates removed, expired incidents suppressed, old records deleted, contact erased on account disable | Hosted identity/backup deletion and legal retention review |
| T33 | Responsive CSS, semantic forms, touch controls, RTL reason selection | Browser accessibility/360 px/keyboard/contrast review |
| T34 | QR SVG generation and download | Printed material through glass/glare |
| T35 | 100 concurrent incident creations, 200 unique initial stages, 100 distinct primary reservations; native PostgreSQL CI | Production load/latency SLO measurements |
| T36 | Production simulation configuration rejected | Review actual deployment secrets and flags |

## Run it

`npm test` uses an isolated in-memory PGlite database by default. For native PostgreSQL, set `TEST_DATABASE_URL` to a disposable database whose name includes `test`, then run the same command. The setup **drops its public schema**. The tests never use `.env` or the development DATABASE_URL as their native-test target.

CI uses PostgreSQL 17, Node 24, the committed npm lockfile and a separate test database. No production credentials are required. Do not replace the provider mocks with real recipients in CI.

## What has not been claimed

No live WhatsApp/SMS delivery, live Supabase MFA, supported carrier route, actual masked call, real-phone offline success, external uptime, production p95 latency, complete accessibility compliance, independently reviewed security, or measured recovery RPO/RTO has been demonstrated here. The 100-incident test is a correctness check, not a production benchmark.
