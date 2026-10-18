# Task board · Phase A implementation

Status updated 18–19 October 2026. The application exists on `feat/phase-a-application` in [PR #9](https://github.com/Raazia-Imran/carQR/pull/9). The original planning package remains the requirements baseline. No task is marked RELEASED.

## Implemented, awaiting review or remaining acceptance evidence

K07–K15: workspace, phone-auth integration, schema/migrations, secure claim/lifecycle, scanner, incident sessions/idempotency, outbox/worker and owner acknowledgement. Initial native PostgreSQL CI passed all 28 tests; regression additions are documented in TESTING.md.

K18–K23: escalation, owner dashboard, minimal admin, backup opt-in, rate/CAPTCHA/message caps, consent and retention. Live delivery, independently reviewed permissions, exact currency budgets and hosted-erasure operations are not complete.

K24–K27: localized scanner reasons/RTL, optional location, owner transfer/revocation and minimal tenant summaries. Full interface translation, fluent Urdu/real-device review, support recovery tooling and full site operations remain partial.

K30–K31: automated privacy/security tests and operating/restore/rollback guides are implemented. Independent security review, external monitoring configuration and a measured restore drill remain open. REVIEW does not mean all acceptance criteria have passed.

## External integration blockers

| Tasks | Dependency / next evidence |
|---|---|
| K03, K16 | Business sender, selected Graph version, approved two-variable WhatsApp template, consenting live test |
| K04, K17, K29 | Contracted SMS gateway, real signed receipts, target-network/data-off handset evidence |
| K05, K35, K41 | Carrier use/CLI approval and Phase B implementation/testing |
| K33 | All pilot gates, named support owner, privacy/terms, print/device acceptance and restore rehearsal |

## Open product and field work

K01 team/budget, K02 commercial name/domain, K06 discovery, K28 physical stickers, K32 actual support/order process, K34 pilot outcomes, and K36–K42 follow-on voice/site/paid validation remain uncompleted. No teammates or vendor actions are invented.

## Next implementation work after this alpha

1. Configure and validate live identity, MFA, CAPTCHA and messaging in isolated staging.
2. Add reviewed recovery/replacement and full assisted-erasure tools; finish automated provider-specific reconciliation if supported.
3. Review web flows on 360 px Android, desktop keyboard, iOS and Urdu/RTL; verify print through glass.
4. Configure monitoring, managed backups and release rollback; record a real restore rehearsal.
5. Complete the Phase A pilot gates before real customer use. Start Phase B only with approved carrier evidence.

Detailed task IDs remain in [planning/backlog.csv](planning/backlog.csv). Status vocabulary: TODO → IN_PROGRESS → REVIEW → VERIFIED → RELEASED. BLOCKED names an external dependency. The existing [eight GitHub workstream issues](https://github.com/Raazia-Imran/carQR/issues) are not auto-closed by a code-only alpha.
