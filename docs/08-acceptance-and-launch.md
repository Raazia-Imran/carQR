# Acceptance tests and release gates

Tests below are planned, not executed application tests. The application does not yet exist. Each release record should attach environment, version, device, carrier and evidence.

| ID | Scenario | Required result |
|---|---|---|
| T01 | Scan/view source/network for active tag | No owner phone/email/address/internal identity in public output |
| T02 | Invalid, paused, revoked and unclaimed tag | Generic safe state; no owner/claim secret leak |
| T03 | Two owners claim same secret concurrently | One atomic success, other conflict |
| T04 | Public QR used as claim credential | Rejected |
| T05 | Owner A requests B’s vehicle or incident | Denied without data disclosure |
| T06 | Staff from tenant A requests B | Denied across API and export paths |
| T07 | Repeat incident POST same key/body | Same logical incident, one logical dispatch |
| T08 | Same key with different body | Conflict; no second dispatch |
| T09 | GET, link preview or crawler loads QR | No notification |
| T10 | Worker crashes after DB transaction | Outbox resumes; no silent lost incident |
| T11 | Provider timeout after potential acceptance | UNKNOWN/reconcile, no blind duplicate resend |
| T12 | Duplicate or reversed webhook order | Idempotent receipts, acknowledgement preserved |
| T13 | Invalid webhook signature | Reject without side effect |
| T14 | No acknowledgement for 90 s | Exactly one logical permitted SMS stage |
| T15 | Delivered/read but no acknowledgement | Same fallback policy, never report resolved |
| T16 | Acknowledgement just before fallback | Pending dispatch suppressed; accepted race documented |
| T17 | Owner data off and cellular on | SMS body conveys reason without web access; receipt vs response distinguished |
| T18 | Owner device off/out of coverage | Honest unconfirmed state, consented backup if configured |
| T19 | Scanner internet off | Honest offline failure; never claim submitted |
| T20 | Backup has not opted in | No backup message |
| T21 | Consent revoked or tag paused before send | No new dispatch |
| T22 | Multiple incidents and generic owner reply | Require unambiguous incident mapping |
| T23 | Flood/OTP attack | Rate controls and spend circuit breaker work |
| T24 | GPS denied or poor accuracy | Alert still works, no invented coordinates |
| T25 | Forwarded SMS/owner link | No broad account or cross-incident access |
| T26 | Changed owner phone / transferred tag | Verify new contact; revoke stale sessions and mappings |
| T27 | B: scanner edits destination in client | Server ignores/rejects arbitrary dialing |
| T28 | B: both legs on different networks | Only approved platform CLI shown; ported-number tests included |
| T29 | B: voicemail, rejection, busy and hangup | No unintended voicemail bridge; clean teardown, safe outcome |
| T30 | B: 120 s limit and spend quota | Call ends, ledger reconciles actual charged legs |
| T31 | Backup restore in isolated environment | RPO/RTO measured, secrets protected, submissions reconciled |
| T32 | Retention/deletion job | Intended records removed/anonymized, audit keeps minimal evidence |
| T33 | 360 px mobile, keyboard and RTL | Readable, usable controls, no horizontal scroll |
| T34 | Physical print through glass/glare | Record device/material acceptance; replace failures |
| T35 | 100 concurrent incident test | No lost incident or unbounded sends; latency measured |
| T36 | Fake provider enabled in production | Deployment/runtime fails closed |

## Release gates

Demo: T01–T09 plus simulated full flow, honest simulation label and limitations.

Phase A pilot: real WhatsApp/SMS permissions, opt-in, T01–T26 and T31–T36 relevant paths, privacy review, sample print acceptance, support owner, funded usage cap, backup restore and rollback. No unresolved critical privacy or authorization defect.

Phase B pilot: written carrier approval for use/CLI, service-specific regulatory review, actual pricing, T27–T30 with target networks, abuse stop switch and consent. WhatsApp voice requires its own provider/policy pass and does not inherit PSTN approval.

## Pilot measurement protocol

Record incident acceptance, each attempt, explicit acknowledgement, reported resolution actor/time, observed network condition and test/live classification. Never infer resolution from delivery. Report denominator, median/p90 time, unacknowledged fraction, abuse count, cost and qualitative owner/staff feedback. Compare similar sites/time periods when possible; acknowledge sampling bias. Suggested targets appear in business plan, not as current achievements.
