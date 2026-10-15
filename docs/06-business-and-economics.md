# Business model, pricing experiments and budget

All amounts below are planning assumptions in PKR, not quotations, forecasts or achieved revenue. Published competitor prices are in the competitor document. Provider tariffs, taxes, payment fees, delivery returns, support effort and currency conversion must replace assumptions before accepting paid commitments.

## Buyer and distribution

Start with one accessible university/office/building operator, where a named champion can organize installation and measure incidents. Owner is the user; institution may be payer; scanner is occasional and should not pay to report a blocked gate. A site-sponsored service may reduce individual acquisition cost, but sales and approvals may be slow. In parallel, test whether a small direct-to-owner cohort values paid cellular fallback.

Offer clear duration and usage limits. Avoid “lifetime unlimited” WhatsApp/SMS/voice because costs recur. Do not compete solely on sticker price. Candidate experiments: basic annual messaging entitlement with fair-use limits; premium local calling allowance after B; site setup plus monthly active-vehicle fee. Do not charge for features still gated or simulated.

## Illustrative first-year D2C unit economics

| Input | Assumption PKR per activated owner |
|---|---:|
| Selling price including first-year service | 999 |
| Printing and packaging | 120 |
| Delivery allocation | 180 |
| Payment/collection cost | 30 |
| Acquisition cost | 150 |
| Support/replacement reserve | 80 |
| 12 alerts × (WA 3 + 25% × SMS 2) | 42 |
| Total variable cost | 602 |
| Contribution before fixed costs, tax and founder labor | 397 |

With assumed fixed monthly costs of 25,000, about 63 new sales/month cover those fixed costs at this first-year contribution. This is **not recurring subscription break-even**: service liabilities remain after sticker sales, renewals/churn matter, and founders are unpaid in the scenario. If acquisition rises to 300 and delivery to 250, contribution drops to 177 and approximately 142 sales/month are needed. If alert volume rises to 120/year with the original other assumptions, contribution falls to 19. This shows why usage caps and pricing tests matter.

The reproducible calculator is tools/economics.py. It uses a ceiling for break-even volume. Actual margin may be negative. Provider billing may differ for delivered messages, failed calls, rounded minutes, setup fees or minimum commitments.

## Voice economics

For a bridge, estimate `ceil(scanner_leg_seconds/billing_unit)×scanner_rate + ceil(owner_leg_seconds/billing_unit)×owner_rate + platform_fee`. A 2-minute connected conversation can involve more than 4 charged leg-minutes if ringing/rounding is billable. Add number rental, minimum trunk capacity, deposits, taxes and fraud reserve. Sell a capped allowance only after measured cost per completed call. Do not assume a low local consumer SIM tariff applies to a business trunk.

## Site scenario

10 reachable sites × 200 eligible vehicles × 50% activation = 1,000 active tags (illustrative). At an experimental site-sponsored PKR 80/active tag/month, gross MRR = 80,000. Subtract channel usage, support, onboarding, payment, infrastructure and tax. No signed sites, users, contracts or recurring revenue are claimed. Quote setup and replacement separately; validate institutional procurement and renewal willingness.

## Two-month cash envelope (excluding founder salaries)

| Item | Planning range PKR | Gate |
|---|---:|---|
| Domain, infrastructure, backups, monitoring | 15,000–35,000 | Choose host, billing currency and data region |
| WhatsApp/SMS setup and test credit | 5,000–20,000 | Quotes and minimum commitments |
| Samples, pilot print and distribution | 10,000–25,000 | Material samples and local quote |
| Discovery, travel and support materials | 5,000–15,000 | Actual site access |
| Subtotal Phase A allowance | 35,000–95,000 | Assumptions only |
| 20% contingency | 7,000–19,000 | Keep reserve |
| Total Phase A allowance | 42,000–114,000 | Excludes salaries, legal/tax fees and B carrier deposits |

Phase B cash budget remains **TBD by written carrier quote**, not zero. Estimate founder time separately: 2 developers ×20 h/week ×8 weeks =320 developer-hours, plus 40–64 product/QA hours. A narrower solo 15 h/week plan yields only120 hours in eight weeks and cannot reasonably promise the same scope.

## Metrics and business gates

Activation = activated tags / distributed tags. Meaningful incident = a consented non-test contact, excluding abusive duplicates. Acknowledgement time = confirmed owner response minus incident acceptance. Resolution time needs explicit owner/scanner/staff evidence, with actor recorded. Channel delivery and human resolution remain separate.

Pilot targets: ≥70% activation, ≥80% of eligible controlled incidents acknowledged within 3 minutes, zero public phone leaks in defined tests, acceptable per-incident cost, and at least 2 site decision-makers willing to discuss a paid continuation. These are targets, not results. Report sample counts, network conditions, failure causes and drills separately. A useful product with no renewal interest is not yet a validated business.

## Launch and growth

Before launch: interviews, competing product tests, provider feasibility and name clearance. Pilot: assisted setup, bilingual signage, weekly issue review and baseline comparison. After evidence: publish consented aggregate outcomes, add nearby institutions, test accessory-shop distribution and referrals. Avoid broad paid ads until first-year contribution and support burden are understood. Stop or pivot if privacy, carrier cost or lack of demand defeats the proposition.
