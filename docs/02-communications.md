# Communications design and feasibility

## Four different channels

| Channel | Transport / endpoint | Who needs internet? | Number visibility | Release |
|---|---|---|---|---|
| WhatsApp message | Business Cloud API to owner | Owner for timely receipt; scanner for web request | Scanner sees business identity only; platform/provider knows owner | A |
| SMS | Transactional carrier/aggregator to owner | Owner does not need mobile data but needs cellular service | Platform sender displayed; owner number stays server-side | A fallback |
| Local masked call | Two carrier PSTN legs bridged by approved service | Web scanner for request; phones need cellular service | Approved business caller ID on both legs; verify on real handsets | B |
| WhatsApp / browser audio | Approved API VoIP or WebRTC | Both media endpoints need internet | Depends on topology and signaling; must audit | Separate gated experiment |

[S08–S14] support provider concepts. They do not constitute approval for this exact marketplace-like relay service. Do not use unofficial WhatsApp Web automation or SIM-box bypass routes.

## Phase A relay

A public QR contains only `https://<owned-domain>/q/<random-token>`. The API resolves the token privately. It never returns the owner’s destination number. The scanner chooses a reason and submits on our web page; a WhatsApp account is not needed for the scanner. The service sends an approved template to the owner from the business account.

Obtain explicit channel opt-in and a verified number. Verify business onboarding, sender eligibility, production permissions and billing. Use approved templates outside the owner’s 24-hour customer-service window. A scan by another person does not open the owner’s messaging window. Template category and approval are Meta decisions. Budget for delivered template messages under current rules and BSP charges; do not assume old free conversation tiers [S08,S09].

Suggested template draft, subject to approval: “A vehicle contact request was submitted for your registered tag {{1}}. Reason: {{2}}. Reference: {{3}}.” Quick actions: Coming / Cannot attend / Report abuse. Use fixed allowlisted variables, no arbitrary user URL. Do not include private owner identity in scanner responses. Inbound webhook sender and incident context must match the intended contact; reject stale/ambiguous actions. If several incidents exist, require selection by reference rather than “latest incident.”

SMS fallback must include the reason and incident reference in the body, so it is useful without opening an internet link. A link may supplement it. Receiving SMS is not an acknowledgement. If a provider supports two-way SMS, an incident-scoped keyword can acknowledge; do not assume an alphanumeric sender accepts replies. Otherwise offline owner may physically respond or use the B voice flow later.

## Proposed escalation policy

The timings below are configurable pilot defaults, not provider promises.

1. At t=0 persist incident and outbox atomically; enqueue WhatsApp. Return “Request received.”
2. Record accepted/sent/delivered/read/failure per attempt. Never label someone offline solely from a missing receipt.
3. At 90 seconds from incident acceptance, if not acknowledged/resolved/cancelled/expired, reserve one SMS fallback under a unique incident/channel/recipient/stage key. On permanent WhatsApp rejection, schedule SMS earlier. Transient failures get bounded retries within incident lifetime.
4. At 180 seconds, if still unresolved and not acknowledged, notify one explicitly opted-in backup if owner policy allows. This must not become a cascade to all contacts.
5. In B, a voice request requires deliberate scanner action and verification; no unsolicited automatic call storm. A site may enable a separately consented, rate-limited policy later.
6. At 10 minutes, mark unresolved incident expired and cease dispatch. Show “No acknowledgement yet; contact site staff if available.” Do not imply the vehicle moved.

Acknowledgement cancels future escalation. There is still an unavoidable race if a provider has accepted a message just before cancellation; log it rather than promising zero late notifications. Recheck terminal state and consent immediately before provider submission. Preserve explicit acknowledgement even if a delayed provider failure arrives later.

## Failure and connectivity cases

| Situation | Expected behavior |
|---|---|
| Owner data off, cellular on | SMS reason can arrive; B local call can ring once available |
| Owner phone off / no cellular coverage | No channel guarantees immediate contact; backup/site path if consented |
| Scanner has no internet | QR URL may decode but web alert cannot submit; printed business helpline + opaque code is a future IVR/manual fallback |
| WhatsApp restriction or provider outage | SMS through a separately contracted route, honest status, budget and incident expiry |
| Entire service unavailable | Static unavailable page if possible; no false confirmation; printed site help only with authorization |
| Owner sees delivered but ignores | Escalate based on lack of acknowledgement, subject to consent/DND and caps |
| DND enabled | Respect chosen policy, show contact unavailable without revealing schedule; urgent category must not silently override consent |
| Duplicate webhook / worker restart | Deduplicate event and dispatch; reconcile unknown provider outcome before unsafe retry |

## Phase B: local masked voice

Prefer a managed, licensed carrier-supported callback/bridge API if a supplier supports this use. Alternative: private Asterisk ARI/control service with approved SIP trunk. PTCL and Nayatel publish SIP products [S12,S13], but neither publication proves automatic third-party bridging or a specific caller-ID arrangement is approved.

Flow: scanner requests call → verify scanner phone and record consent → enforce destination/incident limits → call scanner with platform CLI → require keypress confirmation → dial owner with platform CLI → require owner acceptance → bridge for up to 120 seconds → tear down both legs and store minimal outcome. On busy/rejected/no answer, update status and do not retry indefinitely. Avoid connecting owner voicemail automatically; voicemail greetings may disclose identity. Explain that people can verbally reveal information during a call.

Do not expose a general-purpose dialing API. The backend chooses owner destination from the incident, restricts scanner country/destination class and rejects premium-rate/international abuse unless explicitly approved. One bridge uses two simultaneous call legs/channels. Shared platform caller ID can work without one virtual number per vehicle, but inbound callbacks need a safe menu and never a stale automatic mapping.

Provider gates: legal use approval; local CLI rights; +92 mobile network reachability and ported numbers; approved hosting/SIP routing; two-leg fees and rounding; capacity; KYC; fraud controls; webhook reliability; voicemail; retention; tax and deposits. Get written advice from carrier/regulatory counsel about requirements for this precise service. We have not established a universal Pakistan licensing answer from public sources.

## WhatsApp voice feasibility track

WhatsApp Business Calling exists, but it is a business API with eligibility, country, permission and topology constraints. It is not an API for silently linking two arbitrary personal WhatsApp accounts. Twilio documents restrictions on WhatsApp/PSTN connections [S11]. Keep the local phone bridge independent.

For a future in-app/browser-to-WhatsApp route, obtain written BSP approval for a vehicle-owner relay use case and check both endpoints, permission windows and allowed routing. Confirm caller identity on actual devices and inspect logs. Do not include WhatsApp voice in the committed first-month MVP. If unavailable, local voice B still meets the planned cellular fallback; WebRTC remains optional internet-dependent audio.

## Provider adapters

`sendAlert(incident, recipient, reason, idempotencyKey)`; `normalizeWebhook(raw)`; `getAttemptStatus(providerId)` where supported. Voice separately exposes `startVerifiedBridge`, `hangup`, `normalizeCallEvent`. Store provider identifiers, not secret credentials, in normal tables. Configuration chooses fake/test/live explicitly. Simulated receipts must never enter production outcome metrics.
