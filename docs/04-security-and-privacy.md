# Security and privacy design

## Privacy promise

“The scanner does not receive the owner’s phone number through our public interface.” This is testable. “100% anonymous,” “unhackable,” “no privacy risk” and “guaranteed emergency contact” are not acceptable claims. The platform, telecom/WhatsApp providers and narrowly authorized personnel process contact data. A person may disclose identity in speech or a message; do not promise to prevent all human disclosure.

## Threat model

| Threat | Control | Verification |
|---|---|---|
| Number leaks through API, HTML, hydration, error or source map | Public DTO allowlist, encrypted contacts, log redaction, no owner tel/wa.me links | Inspect browser network, source, metadata and error paths with seeded test number |
| Public sticker claim theft | Separate sealed claim secret, OTP and atomic one-time claim | Concurrent two-user claim test; public QR alone must fail |
| QR copying or photographs | Revoke/rotate, session/tag limits, abuse review | Copied token still cannot be treated as proof of physical proximity |
| Sticker replacement/phishing | Official domain on sticker, tamper evidence, education and reporting | Physical onboarding demonstration; avoid generic URL shorteners |
| Harassment and spend attack | No alert on scan GET; reason-only A, per-incident/tag/IP/session caps, adaptive challenge | Replay/load tests and usage circuit breaker |
| IDOR / cross-tenant data access | Server-side owner and membership checks on every object | A/B owner and tenant fixtures for every route |
| Forged provider callbacks | Signature on raw body, event dedupe, short verification endpoint | Invalid signature and duplicate/out-of-order events |
| OTP abuse/account takeover | Short-lived single-use codes, max attempts, resend cooldown, admin MFA | Brute force, reuse, number-change and recovery scenarios |
| Sensitive SMS link forwarding | Scoped link, short expiry, authenticated sensitive action | Forwarded link cannot access account or other incidents |
| Telephony toll fraud | Verified scanner, allowlisted destination classes, per-account budgets, duration cap | Attempts to override destination and simultaneous bridge test |
| Staff misuse | Least privilege, masked contacts, reason-based break-glass and audit | Support account cannot bulk export or silently unmask |
| Map stalking | Optional permission, no public owner map/history, short retention | Denied GPS still permits alert; logs omit coordinates by default |

## Abuse defaults for pilot

Proposed tunable values: one active incident per tag+scanner session per 5 minutes, 3 submissions per tag in 10 minutes, adaptive challenge at risk threshold, 10 public submissions/IP/hour with allowances for shared institutional networks. OTP 5 guesses/code, 60-second resend delay and daily recipient/IP limits. Provider spend has a daily platform cap and per-tenant cap. Operators must be able to pause a tag/channel quickly. These are initial policies to calibrate, not universal safe values.

Restrict A to preset reasons. If free text arrives later, limit length, escape HTML, prevent links/attachments initially, support reporting and explain voluntary PII leakage. Do not blindly forward raw WhatsApp sender metadata or quoted contact cards to the other party.

## Proposed retention policy, subject to review

| Data | Proposed retention | Reason |
|---|---|---|
| Active account/contact | While account active | Service delivery and recovery |
| Incident text/status | 30 days | Support and pilot outcomes |
| Exact optional incident GPS | 24 hours | Immediate assistance only; no location history |
| Raw webhook payload | 7 days max if needed, encrypted/redacted | Provider debugging |
| Redacted security/access audit | 90 days | Abuse investigation |
| Call metadata | 30 days | Reconciliation; no audio recording default |
| Backups | 30-day rolling policy | Recovery; deletion propagates on expiry |
| Financial records | Period confirmed by accountant/legal review | Do not invent a statutory term |

Define deletion jobs and evidence, not just policy text. Review lawful holds and contractual retention before deleting relevant records. Data export excludes third-party private content. Contact verification and consent records must support provenance without indefinitely retaining unnecessary payloads.

## Provider and legal review

Confirm lawful route, sender registration, commercial relay use, consent, DND/opt-out handling, data processing agreements, cross-border processing, breach escalation, refunds, tax and retention. No blanket conclusion that a particular PTA license is always required or never required is made here. Obtain written service-specific advice before voice launch. Do not treat internet searches or a corporate SIP product page as regulatory approval.

## Production controls

TLS, encrypted secrets and phone fields, separate encryption/lookup keys, rotation plan, restricted DB role, parameterized access, CSP, secure cookies, no shared admin passwords, admin MFA, audited backups and restore drills. Never commit production data in tests or pitch examples. A privacy incident stops rollout until containment, user communication obligations and remediation are assessed.
