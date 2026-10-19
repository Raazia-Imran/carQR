# Project memory

Updated: 15 October 2026. This records decisions and provenance, not hidden reasoning.

## User intent

Build a Pakistan-focused private vehicle contact product. Complete Phase A messaging before Phase B calls. Prepare a strong pitch, full technical/business planning, roles, competitors, roadmap and coding kickoff. Target first-month MVP, broader development over one to two months. Upload planning and deck to Raazia-Imran/carQR. Owner identity must not be exposed to scanners. Account for owners without internet.

## Repository baseline

Connected GitHub inspection found an empty public repository with main as default branch. No pre-existing application, README or AGENTS instructions existed. Uploaded source was Pasted text.txt, containing prior AI-generated search/advice. It is input context, not authoritative research. Raw transcript is not published because it is unnecessary and includes unsupported claims.

## Decisions proposed in this package

Web/PWA first. Scanner has no account requirement for fixed alerts. Six roles, 12 modules, 30 route/view inventory. Official WhatsApp plus SMS fallback in A. Explicit acknowledgement cancels escalation. Separate local PSTN bridge in B. WhatsApp voice requires its own feasibility approval. No mandatory GPS gate, live tracking or medical profile in A. Managed carrier API preferred over self-hosted PBX where approved. One modular application plus worker.

Working name QR CAR only; CarQR already exists in Pakistan. No name/domain clearance performed. Competitor public presence confirmed to differing degrees, no production quality or customer numbers verified. No supplier contacted or pilot recruited.

## Open decisions

Team size/hours; budget; distinct brand/domain; first pilot institution; auth provider; official WhatsApp sender/BSP; transactional SMS supplier; carrier route and approvals; final tariffs; print material; retention/legal review; institution pricing. These do not block planning, but some block real-world launch.

## Next session

Read TASKS.md, select K01–K05, confirm available hours and begin provider/auth feasibility while building fake-provider vertical slice. Record implementation evidence. Do not silently reinterpret this planning package as production readiness.

## Change log

2026-10-15: initial researched planning package and pre-development pitch. Corrected unsupported adoption/open-rate/pricing claims and delivery-versus-acknowledgement logic. Preserved A→B user intent with honest external gates.

## 2026-10-18 implementation decisions

User authorized coding the project in this repository with proper documentation. Development is on `feat/phase-a-application`, preserving the planning baseline. Phase A is the implementation target; no carrier approvals or production readiness are implied. See docs/IMPLEMENTATION.md for SQL/outbox/auth decisions and verification evidence. Exact dependencies and operations files are tracked with the code. External sender, route, identity configuration, name clearance and pilot gates remain real dependencies.

### Continued verification, 18–19 October 2026

Published Phase A code in draft PR #9, branch `feat/phase-a-application`, initial remote commit `9238240ca6ffa80c0761bfe0dd12a3da7a2cfedd`. Native PostgreSQL GitHub Actions passed the 28-test initial suite, typecheck, production build and runtime dependency audit. Local native database startup was blocked by host permissions; local testing used PGlite instead. Browser QA and live provider verification were not performed. Further review fixed immutable incident descriptions after tag transfer, corrected CLI scripts, split UI components, and added provider/race/CAPTCHA regressions. See the current README, IMPLEMENTATION, QUICKSTART, PROVIDERS, API, OPERATIONS and TESTING guides. Commercial/field work and Phase B are still open; no forced completion percentages.

### 2026-10-19 complete local guide

Added the verified 22-page Word guide to docs and linked it from README. It documents clone-to-demo Windows setup, code locations, owner/admin portals, implemented security, and explicit absence of OAuth login and email verification. Application code remains the tested 0f50794 implementation; this addition changes documentation only.

### 2026-10-19 3D landing story

Replaced the simple homepage with an original procedural Three.js car/streetscape and five scroll chapters: park, scan/confirm, private alert, acknowledgement and departure. Added illustrative reason selection and acknowledgement (no API sends), owner-control/privacy features, driver/campus/workplace audiences, honest pilot ordering and FAQs. Retained owner/scanner/admin flows. The scene loads separately, limits pixel density, stops offscreen/in background, disposes GPU resources, respects reduced motion and has an SVG fallback. No external models, tracking or fabricated customer evidence. WhatsApp remains implemented but live approval/configuration is unverified; calls remain Phase B. Typecheck, 34 local SQL tests, production build and runtime audit passed. Browser capability was unavailable, so visual/device QA remains outstanding; see docs/LANDING.md.

### 2026-10-19 updated setup and technology manual

Updated the complete Word manual from 22 to 31 pages to cover application and 3D landing code at 0f4bb0f. Preserved the Windows clone to owner scanner demonstration, added eight landing and technology learning chapters, direct package versions, official maintainer documentation links, a code reading path and a daily checklist. Added docs/COMPLETE_SETUP_GUIDE.md as a readable companion and updated README. Rendered and visually checked all 31 pages; no application code or provider configuration changed. Meta documentation retrieval was unavailable and is identified in the reference section; no live approval or new field evidence is claimed. The existing application CI evidence remains the 34 test native PostgreSQL run 39168287688.
