# Decision brief

## What to build

Build a private vehicle-contact service for a small, bounded parking community in Karachi, initially a campus, office or residential building. The owner registers, verifies their number, claims a sealed sticker and controls permitted contact methods. A passerby scans without an account, chooses a reason and receives an honest progress status. The service, not the passerby, knows the owner’s number.

The opportunity is a hypothesis: an institution may pay for fewer unresolved parking incidents and safer contact. Existing sellers already offer tags, private contact and sometimes community features. A QR code, Urdu, emergency contacts, weatherproof printing or B2B sales alone is not a defensible invention. The proposed advantage is a measured operational package: acknowledgement-based escalation, controlled guard access, deployment assistance and evidence of resolution time. Validate it against real competing products before claiming superiority.

## Decisions

| Question | Recommended decision | Reason / condition |
|---|---|---|
| Web or mobile? | Responsive web + owner PWA first | One codebase, scanner has no install barrier. PWA caching cannot deliver a new request without connectivity. |
| Native owner app? | Revisit after pilot | Build React Native/Expo only if measured push, retention or fleet needs justify cost. |
| A then B? | Yes, but start supplier feasibility on day one | Backend abstraction and consent model support B without waiting to discover carrier restrictions in month two. |
| WhatsApp number privacy? | Business account sends to owner privately | Never redirect to owner wa.me, tel, contact card or a group. The business/provider still processes phone numbers. |
| Offline owner? | WhatsApp plus time-based SMS escalation | SMS can arrive with cellular coverage and no mobile data. Explicit acknowledgement governs escalation, not read receipts. |
| Local call? | Approved carrier bridge in B | Verified scanner and owner receive business caller ID. Both cellular legs require service. |
| WhatsApp call? | Separate B experiment | Needs API access, permission, supported topology and policy review. It still needs internet. |
| Map? | Optional incident location | Scanner position is a report, not live car tracking or proof of proximity. |
| First release audience? | 50–100 consenting owners at 1–2 sites | Target, not acquired customers. Assess incidents and willingness to pay. |

## Corrections to supplied AI advice

| Earlier claim | Correction used in this plan |
|---|---|
| Less than 1% adoption | No defensible denominator or measurement supplied. Omitted. |
| Nearly 100% WhatsApp open rate | Unsupported. Measure delivery and owner acknowledgement in the pilot. |
| Delivered proves online; sent proves offline | Neither proves human availability. Webhook delay, device state and provider problems can explain statuses. |
| WhatsApp utility conversations have a generous free tier | Pricing moved to a per-message framework. Confirm current category, destination rate and exceptions, plus BSP fees [S08]. |
| SMS costs PKR 0.20–0.50 | No verified quote. All economics inputs are explicit assumptions. |
| Every competitor has every baseline feature | Public marketing differs and some pages conflict. Unknown remains unknown. |
| A 100 m GPS rule prevents abuse | Browser location can be denied, inaccurate or spoofed. There is no live car position from a static sticker. |
| Twilio cannot be used in Pakistan at all | Too broad. Confirm each product, destination, caller ID, contract and carrier route. No blanket conclusion. |
| Asterisk alone enables private local calls | It is a telephony engine, not a telephone number or licensed carrier agreement. |
| Two-minute delivery means success | Successful notification and successful parking resolution are different metrics. |
| A QR tag works without any connectivity | The URL can be decoded offline, but opening an uncached web flow and sending an alert need connectivity. |
| All stakeholders can see contact details | Owner and tightly restricted service roles only. Public APIs expose an allowlist. |

Sources and access limitations are in docs/09-sources.md. No plan can guarantee business success or a deadline controlled by outside providers.
