# Pitch presenter guide

Main pitch: slides 1–17. Technical appendix: slides 18–24. Suggested main delivery: 8–10 minutes. All proposed targets and budgets are assumptions, not achieved results.

## Slide 1 · QR CAR

Working name only. CarQR is already a Pakistani competitor, so commercial brand clearance is an explicit launch task. This is a pre-development proposal with no claimed customers or live integrations.

## Slide 2 · The parking contact problem

Use a recognizable situation: a vehicle blocks an exit and the driver is away. A paper number helps contact but exposes the number to every passerby. Guard-mediated contact can take staff time. These are problem hypotheses to validate at the first site, not quantified national prevalence.

## Slide 3 · A private route to the driver

The public QR carries a random URL token. Scanner sees minimal vehicle information and fixed contact reasons. The server holds verified destinations and calls providers. The platform and providers process numbers, even though peers do not see them. No notification occurs on scan alone.

## Slide 4 · The first customer segment

Target a campus, office or residential building with an accessible decision-maker. Owners opt in, site management may pay, and scanners are occasional users. One site concentrates distribution and measurement. This is a proposed entry strategy, not exclusive positioning or a signed partnership.

## Slide 5 · Pakistan already has competitors

These are self-published public offers, not audited products. Amanat lists PKR499 for one sticker and PKR99 delivery. TrackMate catalog lists PKR1499 car sticker. Qonnect indexed official content shows PKR1780, but SKU and live price require checking. CarQR and Nishaaan are relevant local offerings; price not verified. Do not infer market share, installations or reliable fulfilment. Detailed limitations in docs/01-market-and-competitors.md.

Sources: https://www.amanat.app/parking-stickers ; https://www.trackmate.pk/products ; https://qonnect.pk/ ; https://carqr.pk/ ; https://nishaaan.com/vehicle-qr-tag-pakistan

## Slide 6 · International product benchmarks

QrMyCar describes private contact and society workflows. CarQRCode/Abtara advertises multi-channel contact and reminders. Neither public page establishes Pakistan availability. We do not repeat customer-count or durability claims. The business should validate service performance, not claim global novelty.

Sources: https://www.qrmycar.in/how-it-works ; https://www.carqrcode.com/

## Slide 7 · Our differentiation hypothesis

This is a hypothesis, not a claim that competitors cannot do these things. The proposed package combines intentional contact, acknowledgement-based SMS escalation, restricted staff access, assisted installation and reporting. Competitor trials and pilot data must show whether this package creates value.

## Slide 8 · When the owner has no internet

Suggested pilot timings are design defaults. At zero send WhatsApp after consent and validation. At90seconds without explicit acknowledgement send one permitted SMS stage. At180seconds notify one opted-in backup if configured. Missing WhatsApp receipts do not prove offline status. SMS needs cellular reachability. Phone off or no coverage defeats immediate contact. Late provider acceptance can race cancellation.

Sources: https://jazz.com.pk/business/solutions/messaging-solutions/bulk-messages-and-notifications ; https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview

## Slide 9 · Phase A and Phase B

PhaseA commits to private messaging and SMS fallback. PhaseB local PSTN callbacks use approved business caller ID and two bridged legs. WhatsApp voice remains separate: it needs internet, eligibility and an approved topology. Twilio explicitly rejects connections between WhatsApp and PSTN endpoints. Do not promise an arbitrary personal-account relay.

Sources: https://www.twilio.com/docs/voice/whatsapp-business-calling ; https://nayatel.com/business/sip-trunk

## Slide 10 · Web first, native app later

Scanners need a short mobile web flow with no install. Owners get an installable web dashboard, staff/admin use the same codebase under distinct authorization. Native app comes later only if evidence justifies push, retention or fleet work. An installed PWA cannot send a new request without connectivity.

## Slide 11 · Business model experiments

Proposed commercial models, not validated prices. Test annual owner plan, optional capped voice allowance and site-sponsored active-vehicle subscription. Keep sticker, service term and usage clear. Do not sell lifetime unlimited calling. Pilot billing can be manually reconciled; gateway integration is later.

## Slide 12 · Illustrative first-year contribution

Illustrative selling price999, printing120, delivery180, payment30, acquisition150, support80 and communications42. Communications assumes12 alerts at WhatsApp3 plus25% SMS fallback at2. Variable cost602, contribution397 before fixed costs, tax and labor. This does not establish recurring break-even. See tools/economics.py. No voice allowance included.

## Slide 13 · A bottom-up market test

Scenario only:10accessible sites times200vehicles times50%activation equals1000active tags. At hypothetical80PKR per active tag per month, gross recurring revenue would be80000PKR before costs. There are no signed sites. Validate site size, conversion, buyer budget, retention and channel economics.

## Slide 14 · Two, four and eight weeks

Two weeks produces a demo with clearly marked mocks if provider access is delayed. Four weeks targets an approved PhaseA controlled pilot. Eight weeks targets hardening and conditional local voice. Dates assume start16October2026: demo29October, PhaseA12November, week8 10December. Product/QA adds5to8hours weekly. Provider approval can move dates.

## Slide 15 · The pilot evidence we need

Proposed target50to100owners at1to2sites. Target activation70% and80% eligible controlled incidents acknowledged within3minutes. Need zero public phone leaks in defined tests, feasible per-incident cost and paid-continuation discussion with2site decision-makers. Use at least30evaluable incidents as an operational learning aim, not statistical proof. Separate drills from live incidents.

## Slide 16 · Risks that can change the plan

Provider approval and cost, privacy/harassment, low willingness to pay and founder availability are the largest uncertainties. Use consented trials, budgets, kill switches and a small pilot. Do not remove gates to claim a launch date. Distinct brand needed because CarQR already operates locally.

## Slide 17 · The pilot partnership request

Ask a campus, office or building for a sponsor and50to100consenting owners. Ask the team to commit two developer roles and product/QA time. Proposed PhaseA two-month cash envelope42000to114000PKR includes20%contingency and excludes salaries, legal/tax fees and B deposits. These are assumptions, not a funding valuation or vendor quote. First milestone is a real private alert and SMS fallback on team-owned phones.

## Slide 18 · Appendix · Roles and permissions

Backup contact needs separate consent. Site staff are tenant-scoped and cannot browse private numbers. Platform support uses masked fields and audited sensitive access. Scanner gets an incident-bound session, not owner access. This role model supports the30screen inventory in PRD.

## Slide 19 · Appendix · System architecture

Editable diagram of proposed architecture. Public scanners and authenticated portals enter separate API boundaries. Domain services transact to PostgreSQL and outbox. Worker dispatches through adapters; authenticated provider webhooks return receipts. Redis queue is scheduling infrastructure, database remains source of truth. No production infrastructure exists yet.

## Slide 20 · Appendix · Technology choices

Proposed choices, current versions to pin at kickoff. Next.js for one responsive codebase and server endpoints, TypeScript domain, PostgreSQL/Prisma, Redis/BullMQ worker, official Meta/BSP and contracted SMS. Managed carrier API preferred for B if approved. No Kubernetes or native app needed for first pilot.

Sources: https://nextjs.org/docs/app/guides/self-hosting ; https://docs.bullmq.io/patterns/idempotent-jobs

## Slide 21 · Appendix · Connectivity boundaries

Scanner web needs internet to create request. Owner WhatsApp needs internet; cellular SMS and local calls can work without mobile data but need cellular service and an available handset. Browser/WhatsApp audio cannot solve total disconnection. Future printed business helpline plus tag code requires an actual approved service, not just printing digits.

## Slide 22 · Appendix · Privacy controls

Public token is at least128random bits with private lookup. Claim secret is distinct and sealed. Contacts encrypted, public DTO allowlist, tenant checks, signed webhook, rate/cost caps and admin MFA. The service and providers necessarily process numbers. No third-party production privacy audit has yet happened.

## Slide 23 · Appendix · Physical tag and maps

Print samples after final brand/domain. Use independent hidden activation secret and random public token. Test material, quiet zone, contrast, glass, glare and older cameras before bulk order. Proposed70x50mm sticker and30to35mm QR are prototype dimensions, not validated specifications. Optional scanner location needs permission and can be inaccurate/spoofed. OSM public tiles have usage rules.

Sources: https://operations.osmfoundation.org/policies/tiles/

## Slide 24 · Appendix · Release gates

Full planned36scenario acceptance catalog is in docs/08-acceptance-and-launch.md. PhaseA gates cover real provider permissions, zero public PII leaks in defined tests, auth/tenant controls, escalation/restarts, print QA, backup restore, support and cost cap. PhaseB additionally requires written carrier use/CLI approval and multi-network masking/toll-fraud tests. All implementation tasks remain TODO.

## Likely questions

**Why another QR tag?** The proposed differentiation is managed site deployment and measured acknowledgement/response. We must prove that it beats existing alternatives.

**Why no native app first?** Scanner friction and development cost. The owner web dashboard is sufficient for initial validation.

**What if the owner is unreachable?** SMS and later local calls help without mobile data, but no service guarantees contact when the handset has no cellular coverage.

**Is the number anonymous to everyone?** No. It stays private from the scanner, while the platform and providers process it.

**Can WhatsApp call a normal phone through this system?** The proposed architecture keeps these paths separate because provider policy restricts WhatsApp/PSTN bridging.

**Are there customers yet?** No traction is claimed. The ask is pilot access and validation.

**How much funding?** The planning envelope is PKR42,000–114,000 for PhaseA-related two-month cash costs, excluding founder salaries/legal fees and PhaseB deposits. Replace it with quotes before commitment.
