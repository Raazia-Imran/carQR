# Contributor instructions

Scope: this repository and descendants. Read README.md, PRD.md, ARCHITECTURE.md, roadmap.md and memory.md before implementation.

- This is currently a planning repository. Do not label mock behavior, contracts or presentation mockups as a running product.
- Phase A precedes Phase B. Provider feasibility starts early. Do not remove the SMS fallback or privacy controls to meet a date.
- Never expose owner phone, email, address, claim secret or provider credentials in public DTOs, HTML, URLs, logs or fixtures.
- No alert on GET/scan. Require intentional POST and abuse controls.
- Public token cannot claim a tag. Use separate sealed secret and transactional claim.
- Explicit acknowledgement governs escalation. Delivery/read receipts are not resolution or proof of online presence.
- Validate owner/tenant scope server-side. Strongly authenticate admin. Audit sensitive mutations.
- Durable outbox/worker, idempotency and ambiguous-send reconciliation are required. No request-handler-only timers.
- Use official communication APIs and authorized carrier routes. No unofficial WhatsApp automation, SIM-box workarounds or prohibited WhatsApp/PSTN bridging.
- Current technical/legal/pricing claims require dated official sources or provider evidence. Mark assumptions and unknowns explicitly.
- Keep implementation small, dependency versions supported/pinned, code TypeScript unless a documented reason differs.
- Tests should cover meaningful risks, especially privacy, authorization, concurrency and provider failure. Follow docs/08-acceptance-and-launch.md.
- Update task status only with evidence. Keep public repo free of private pilot data and vendor contracts.
- Use small reviewed commits and never overwrite unrelated work. Do not add licenses without owner decision.
- Record decisions in memory.md and note impact on product, data, security and schedule.
