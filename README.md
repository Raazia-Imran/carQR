# QR CAR · Pakistan vehicle contact platform

**Status: planning and pre-development. Research checked 15 October 2026.** No production application, customer traction or provider approval is claimed. “QR CAR” is a working name. An existing Pakistani competitor uses CarQR, so choose and clear a distinct commercial name before launch.

A driver should be reachable about a blocked gate without publishing a personal phone number. A QR tag opens a mobile web page. The platform sends a private alert and tracks explicit acknowledgement. SMS provides a fallback when the owner lacks mobile data. Local masked voice follows after carrier approval.

Download/read the [complete planning handbook](QR_CAR_Master_Plan.md) for a consolidated version, or use the modular files below. Track the eight workstreams in [GitHub Issues](https://github.com/Raazia-Imran/carQR/issues).

## Start here

1. [Executive decision and corrections](docs/00-decision-brief.md)
2. [Product requirements and complete role/screen inventory](PRD.md)
3. [Competitors and research evidence](docs/01-market-and-competitors.md)
4. [Architecture](ARCHITECTURE.md), [data model](docs/03-data-and-api.md) and [API contract](contracts/openapi.yaml)
5. [Messaging, SMS and voice feasibility](docs/02-communications.md)
6. [Privacy and security](docs/04-security-and-privacy.md)
7. [Stickers, maps and operations](docs/05-operations.md)
8. [Business model and economics](docs/06-business-and-economics.md)
9. [Two-week, one-month and two-month roadmap](roadmap.md)
10. [Execution board](TASKS.md), [detailed backlog](planning/backlog.csv), [coding kickoff](docs/07-coding-kickoff.md)
11. [Tests and launch gates](docs/08-acceptance-and-launch.md)
12. [Evidence register](docs/09-sources.md) and [provider questions](docs/10-provider-validation.md)
13. [Pitch deck](pitch/QR_CAR_Pitch_Deck.pptx), [PDF](pitch/QR_CAR_Pitch_Deck.pdf), [presenter guide](pitch/PRESENTER_GUIDE.md)

14. [Technical glossary](docs/11-glossary.md)

## Recommended commitment

**Phase A:** scanner web flow, owner dashboard, official WhatsApp templates, acknowledgement, SMS escalation, minimal admin and support, secure sticker activation.

**Phase B:** approved local PSTN call bridge, verified scanner callback, call budgets and abuse controls. WhatsApp voice is a separate gated experiment, not the offline fallback.

**Timeline assumptions:** two developers plus part-time product/QA, 20 focused hours each per week. Two weeks produces a demonstration, four weeks targets a controlled Phase A pilot, eight weeks targets a hardened pilot plus conditional Phase B. External approvals can move these dates. Solo part-time execution needs a smaller scope or more time.

## Working rules

Read [AGENTS.md](AGENTS.md) before implementation. Record new decisions in [memory.md](memory.md). Mark factual claims, hypotheses and estimates separately. Never commit phone numbers, tokens, participant identities or live claim secrets. No outbound customer/vendor messages have been sent by preparation of this repository.

## Local planning tools

Run `python3 tools/economics.py` to reproduce illustrative unit economics. These inputs are assumptions, not vendor tariffs. The OpenAPI contract is a design starting point, not a running API. Backlog tasks remain TODO until implementation evidence exists.
