# Roadmap and staffing

Planning baseline: start 16 October 2026, subject to team availability. Two developers at 20 focused h/week each plus product/QA 5–8 h/week. Feature estimates include some integration/testing but not provider approval lead time. Do not interpret dates as guarantees.

## Two weeks: 16–29 October · demonstration and feasibility

| Working day | Deliverable | Owner role | Exit evidence |
|---|---|---|---|
| 1 | Scope freeze, repo conventions, provider enquiries prepared, auth spike | Both + product | Scope accepted, gaps recorded |
| 2 | DB/tag design, public DTO, basic scanner and owner layout | Dev A/B | Sample schema and no-PII response |
| 3 | Authentication/OTP abstraction, consent and claim flow | Dev A | Atomic claim test |
| 4 | Scanner reason flow, incident/session APIs | Dev B | Real browser can submit safely |
| 5 | Outbox, worker and fake providers | Dev A | Restart-safe dispatch simulation |
| 6 | Owner acknowledgement and scanner status | Dev B | End-to-end simulated incident |
| 7 | WhatsApp test integration and signatures | Dev A | Approved team test message or labeled simulation |
| 8 | SMS adapter and fallback timer | Dev A/B | Data-off scenario if supplier ready |
| 9 | Minimal admin, abuse caps, print samples | Both + product | Staff permissions and sample scans |
| 10 | Test, demo rehearsal, pitch and gate review | Whole team | Demo, known limitations and next decision |

A two-week full production A+B release is not credible under these assumptions. Demo may use clearly labeled provider simulations if approval is pending. Never fake live receipts in a pitch.

## First month: through 12 November · Phase A controlled pilot target

Week 1: architecture, identity, secure tag claim, provider onboarding in parallel with development.
Week 2: incident, outbox, WhatsApp, acknowledgement and SMS vertical slice.
Week 3: admin/support, language review, rate limits, backup consent, real carrier tests and production configuration.
Week 4: privacy audit, restore rehearsal, printed sample acceptance, 50–100-owner site pilot if all gates pass. Review incidents weekly. Delivery approval delays move the pilot, not privacy or testing gates.

## Second month: through 10 December · hardening and conditional Phase B

Week 5: pilot fixes, bounded tenant/staff dashboard, support process, actual cost model.
Week 6: approved carrier integration, scanner verification, call acceptance and teardown.
Week 7: all-network masking tests, toll-fraud controls, billing reconciliation and rollback drill.
Week 8: limited B pilot if supplier/legal/privacy gates pass; renewals and next-stage pitch with real outcomes. WhatsApp voice has an independent feasibility decision and can remain deferred.

## Critical path

Business sender/template approval and SMS route → real A integration → offline-owner tests → pilot. Carrier commercial use approval/CLI/trunk → local bridge integration → handset masking/fraud tests → B pilot. Start provider work on day one even though A ships before B. Printing depends on final domain and secure activation design.

## Capacity and trade-offs

If solo: preserve scanner, owner, tag claim, WhatsApp, SMS, support and security. Defer self-service checkout, broad sites dashboard, native app and free-text chat. Expect four-week demo/closed alpha and eight-week limited A pilot depending on hours; B may slip. If providers are unavailable: continue mock/demo and interviews, but do not advertise cellular fallback as live.

## Estimated workload

The detailed backlog currently totals 201 developer-hours: 140 through the Phase A pilot preparation and 61 for follow-on hardening/voice/reporting. The four-week developer capacity assumption is 160 hours, leaving only 20 hours of initial buffer. Provider waiting, interviews, printing, site recruitment and legal review are additional calendar/product work. Re-estimate after the first vertical slice; the month-one target is ambitious for a learning team. The eight-week 320-hour capacity leaves more integration reserve, but external approvals still govern Phase B.

## Definition of done

Code reviewed, meaningful tests pass, user-visible states honest, permissions verified, provider cost measured where applicable, deployment reversible, documentation updated and no secrets committed. “Merged” alone does not mark a feature done. Track work in TASKS.md and planning/backlog.csv.
