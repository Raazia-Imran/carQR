# Product requirements · v1.0

Owner: Raazia Imran Reshamwala (project initiator). Team positions below are unassigned. Status: proposed scope for implementation. Phase A is mandatory first. Phase B remains part of the roadmap with external gates.

## Objective and scope

Help someone contact the responsible driver about a vehicle while keeping the driver’s phone number out of public pages and peer-to-peer contact metadata. Measure acknowledgement and resolution, while controlling harassment and channel cost. The platform and contracted communication providers necessarily process contact information.

Primary incidents: blocked exit/gate, lights on, window open, visible damage and urgent safety concern. For immediate danger, show instructions to seek local emergency assistance and site security. Do not promise emergency dispatch, rescue, towing avoidance, theft prevention or guaranteed response.

## Six human roles and service actors

| Role | Identity | Allowed | Not allowed |
|---|---|---|---|
| Scanner / passerby | Anonymous session for fixed alerts; verification for voice | View minimal tag page, submit reason, see own incident, cancel/report | Obtain owner number, enumerate vehicles, view unrelated incidents |
| Owner / registered driver | Verified phone, authenticated session | Claim tags, manage own vehicles, acknowledge, close, pause, block session, set preferences | Claim via public QR alone, read another owner’s data |
| Backup contact | Verified invited contact with separate opt-in | Receive agreed escalations, withdraw consent | Automatically become account owner or see history |
| Guard / site operator | Invited staff membership | Site-scoped incident creation and resolution assistance | Browse all personal numbers, export residents, see private chat by default |
| Site administrator | Tenant-scoped authenticated manager | Invite staff, allocate tag batches, see aggregate outcomes | Global administration or unrestricted owner contact access |
| Platform administrator / support | Strong authentication and separate permissions | Handle fulfilment, abuse, audits and provider failures | Unlogged contact disclosure, bulk PII export by default |

Platform admin divides into super-admin, support and fulfilment permissions. API workers and provider webhooks are non-human principals with least privilege. Backup and site roles can initially have limited workflows, but the data and authorization boundary must exist before site rollout.

## Twelve product modules

1. Marketing and onboarding: explanation, pricing disclosure, ordering enquiry, help, terms/privacy, language selection.
2. Identity: sign-in, OTP protection, verified channels, session/recovery, consent history.
3. Vehicle management: minimal make/color/optional plate, responsible driver, own vehicle list.
4. Tag lifecycle: batch generation, sealed activation secret, claim, pause, revoke, replace and transfer.
5. Scanner gateway: privacy-safe public page, reason buttons, optional location, incident submission.
6. Incident handling: explicit acknowledgement, status, cancellation, closure and report.
7. Channel orchestration: official WhatsApp, SMS fallback, durable jobs, receipts, retries and budgets.
8. Owner dashboard: incident inbox, history, acknowledgement, language, availability, backup invitation.
9. Administration: fulfilment, inventory, abuse review, channel health, audited changes, support.
10. Site operations: tenant membership, limited staff workflow, aggregate reporting and allocations.
11. Billing: pilot manual settlement, order reconciliation, later verified payment webhooks and quotas.
12. Phase B voice: callback verification, carrier sessions, consent, duration caps, usage and blocking.

## Screen inventory (30 planned routes / views)

| Surface | Screens / routes | Release |
|---|---|---|
| Public | Home; how it works; pricing/order; help/contact; privacy; terms | A |
| Identity | Sign-in; verify OTP; recovery; onboarding/consent | A |
| Scanner | `/q/:token`; reason/confirmation; `/incident/:id` progress; unavailable/revoked; abuse report | A |
| Owner | Dashboard; vehicles; claim tag; vehicle settings; incident detail; contact preferences; account/consent; transfer/replacement | A |
| Admin | Overview/health; inventory/orders; support/abuse; audit/access | A |
| Site | Site overview; staff/membership; site incident queue | A pilot minimal, B expanded |

Call request/OTP/progress dialogs extend scanner and incident screens in B. A backup invite/consent flow reuses onboarding, with restricted permissions. Payments can initially use pricing/order plus admin reconciliation. Screens may combine responsively, but authorization must not combine accidentally.

## Functional requirements

| ID | Requirement | Acceptance |
|---|---|---|
| FR01 | Sign in and verify phone ownership | Expiring, single-use OTP, attempt and resend limits; no full number in logs |
| FR02 | Separate channel consent | Record time, wording version and channel; revocation prevents future sends |
| FR03 | Atomic sticker claim | Valid sealed secret plus authenticated owner required; one winner under concurrency |
| FR04 | Minimal public response | No phone, email, address, internal user ID or secret in HTML, API or metadata |
| FR05 | Intentional contact | GET/QR scan alone sends nothing; confirmed POST creates an incident |
| FR06 | Fixed reason buttons | Allowlisted reason enum and translated labels; no arbitrary links in A |
| FR07 | Abuse controls | Per-tag/session/IP budgets, deduplication, adaptive challenge and owner pause |
| FR08 | Transactional incident creation | Incident and outbox commit together before worker processing |
| FR09 | WhatsApp alert | Approved template to verified opted-in owner with incident-bound actions |
| FR10 | Explicit acknowledgement | Owner “Coming” or authenticated reply records actor/time and cancels eligible jobs |
| FR11 | SMS fallback | At 90 s without acknowledgement, queue one SMS if permitted; known hard WhatsApp failure accelerates fallback |
| FR12 | Honest scanner status | Distinguish accepted, provider-delivered, owner-acknowledged, resolved and unreachable |
| FR13 | Safe backup escalation | At 180 s if configured, notify opted-in backup once; no automatic broadcasts |
| FR14 | End lifecycle | Default unresolved expiry 10 min; suppress late dispatch, retain safe history |
| FR15 | Owner controls | Pause, revoke, session-block, preferences, contact re-verification on change |
| FR16 | Transfer | Old owner consent or reviewed recovery, revoke old sessions and claim secret |
| FR17 | Admin accountability | Role checks and audit entries for mutations; support sees masked fields |
| FR18 | Tenant separation | Site staff access only their membership scope; bulk allocations cannot claim for owner |
| FR19 | Local voice | B only: verified scanner, explicit owner consent, approved caller ID, 120 s bridge cap |
| FR20 | Data rights | Documented export/deletion process, retention jobs and lawful hold handling |

## Flows

**Owner registration:** sign in → verify contact → consent → add minimal vehicle → enter sealed claim secret → test alert → place sticker. Treat control of tag and phone as account evidence, not legal ownership of a vehicle. Avoid collecting CNIC/registration documents by default.

**Scanner:** scan → inspect official domain → choose English/Roman Urdu/Urdu → choose reason → optional location permission → confirm → receive incident session → view acknowledgement. Fixed reason examples: “Please move your car” / “Gaari hata dein”; “Lights are on” / “Lights on hain”. Use proper RTL and reviewed Urdu translations before launch.

**Owner action:** WhatsApp quick reply or authenticated owner portal → Coming / Cannot attend / Report abuse. Owner dashboard can close after moving. Scanner can separately confirm cleared. Store who reported resolution. A forwarded SMS link cannot grant broad account access.

**Admin:** batch creation → print manifest → allocate/order → confirm dispatch → owner claims → support handles replacement using audited state changes. Site staff cannot activate someone else’s identity.

## Non-functional targets (proposed, not achieved)

Public page LCP ≤2.5 s in the chosen low-end Android test profile; accessible keyboard flow and 44 px touch targets; no horizontal scrolling at 360 px. API accepted response p95 <1 s excluding provider time. In a controlled 100-incident concurrency test, no duplicate logical sends or lost incidents. Monthly availability target 99.5% for pilot, measured from external probes, not a contractual SLA. Recovery point ≤24 h and recovery time ≤4 h initially, proven by restore test. Store all timestamps UTC and display Asia/Karachi.

## Exclusions from first month

Native apps, continuous GPS tracking, medical profiles, marketplace/sale mode, insurance-document vaults, ANPR, boom barriers, AI chatbots, unlimited free calling and mass marketing. Optional two-way free text should follow fixed alerts only after moderation and metadata redaction work. Do not delay the pilot for these.

## Release dependencies

Phase A real-world launch requires working approved WhatsApp templates, a contracted transactional SMS route, privacy/consent text, support availability and real device tests. If approvals slip, show a clearly labeled simulated demo, never market it as live. Phase B needs a signed-off carrier route and masking evidence. See roadmap.md and docs/08-acceptance-and-launch.md.
