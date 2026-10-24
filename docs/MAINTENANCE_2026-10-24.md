# Local simulation maintenance record

Evidence date: 24 October 2026. Starting application commit: `a7956fa5e475f6dbdf3751b0bb5ec951ca841013`, branch `feat/phase-a-application`. Work is isolated on `fix/local-simulation-handover` for review against that application branch. No production deployment or main-branch merge is included.

The supplied handover describes a working Windows simulation. This change preserves its existing data model, migration SQL, privacy boundaries, authentication, consent, escalation timings and real-provider restrictions. It addresses reproducible maintenance defects and adds regression evidence; it does not complete the planned live service.

## Findings and changes

| Finding | Evidence and cause | Change and verification | Result |
|---|---|---|---|
| F01 P0 confirmed | `scripts/migrate.ts` checked `process.argv[1].endsWith("/migrate.ts")`. Replacing argv with a Windows-style path reproduced a silent successful exit without migrations. | Added explicit `scripts/migrate-cli.ts`; `db:migrate` invokes it without path detection. The importable migration function and SQL are unchanged. CLI tests apply both migrations, rerun them, retain an unrelated record and reject failure without driver details. Windows CI runs these same child-process tests. | Fixed in code; Windows CI must independently pass. |
| F02 P1 observed wording issue | `publicIncident()` collapsed queued, submitting and accepted states into PENDING. Simulated acceptance correctly supplied no real delivery evidence. | Added ACCEPTED and SIMULATED public projections and honest scanner labels. Real receipts alone give CONFIRMED; owner response remains separate. Tests check the unchanged public field allowlist and simulated receipts never confirming real delivery. | Clarified expected behavior; no fabricated receipts. |
| F03 P1 confirmed input defect | `raw.split("/q/")[1]` retained URL query/fragment text in the token and accepted arbitrary URL prefixes. Invalid credential pairs themselves are not proven server defects. | `packages/shared/tag-input.ts` accepts trimmed raw codes or same-origin HTTP(S) sticker URLs, removes query/fragment and rejects credentialed/foreign/malformed input. The form trims surrounding secret whitespace and retains password masking. Tests check parsing, a one-time claim, invalid pairs and repeated claims. Server ownership/secret checks and generic failures are unchanged. | Fixed input handling; no tag-state disclosure added. |
| F04 P2 confirmed observability defect | The worker discarded every exception and refreshed heartbeat inside maintenance before dispatch finished. | `packages/server/diagnostics.ts` emits only fixed categories/hints, a random reference and suppression counts. Repeats are throttled; recovery is recorded. Heartbeat advances only after a successful iteration. Tests check redaction, throttling, recovery and heartbeat under transport failure. | Fixed; the existing stale threshold remains 60 seconds. |
| F05 P2 development configuration | The development CSP blocked React's eval-based debugging. The same policy was previously used for development and production. | Add `unsafe-eval` only when NODE_ENV is exactly development, following [Next.js guidance](https://nextjs.org/docs/app/guides/content-security-policy). Test development/production/test/unset modes. Actual local HTTP responses verify both policies. | Fixed configuration; browser console check remains outstanding. |
| F06 P3 confirmed warning | Installed Three.js 0.186.1's `WebGLShadowMap.js` warns and converts PCFSoftShadowMap to PCFShadowMap. | Select PCFShadowMap directly. No renderer settings, dependency versions or scene layout otherwise change. Typecheck and build pass. | Removed obsolete setting; browser appearance remains unverified. |
| F07 P2 observed repeated actions | `useTask` already prevents concurrent clicks within its mounted owner view; server actions lock the incident row. Distinct authenticated response requests intentionally retain audit history. | Added concurrent/repeated-response and resolution regression coverage. No server action or audit suppression was introduced. Terminal incidents stay closed and dispatch does not duplicate. | Expected behavior documented; no speculative logic change. |
| F08 P2 usability and expected support state | Vehicle display is color followed by model; repeating color inside model produces awkward text. A reported scanner concern correctly starts open. | Added input hints and a live public-description preview. The expanded HTTP smoke test confirms a staff review changes a concern to reviewed and writes audit. No concerns are auto-closed or deleted. | Improved entry guidance; support state is expected behavior. |

## Validation and limits

Local baseline: 34 tests, typecheck, build and formatting passed. Final local result: **45 tests passed**, typecheck passed, production build passed, formatting passed, and `npm audit --omit=dev` reported zero known runtime advisories. The HTTP handler smoke test covers the owner/scanner/admin regression contract, including consent, simulated MFA, QR generation, simulated acceptance, acknowledgement, resolution and concern review. PGlite serializes its connections and does not substitute for independent native PostgreSQL locking tests.

Server-render/header checks passed for development and production: HTTP 200, one main heading, SVG fallback, eval permitted only for development. Browser installation failed because the download endpoint returned truncated archives. Local native PostgreSQL initialization could not create its required operating-system user. These are execution-host limits, not observed Windows application regressions. The PR's native PostgreSQL and Windows jobs are the independent CI evidence; check their actual statuses.

| Remaining scenario | Existing evidence | Status beyond that evidence |
|---|---|---|
| Pause, transfer, consent, backup withdrawal, expiry, retention, deletion and tenant separation | SQL/domain regression coverage retained | Additional human interface checks not performed. |
| 90-second SMS and 180-second backup scheduling | Automated time/state policy tests retained | No timed real handset or live provider run. |
| Orders, export and complete owner controls | Existing implementation retained | Additional browser walkthrough not performed. |
| Landing, mobile, WebGL fallback, reduced motion, zoom and keyboard | Build, server-render fallback and source review | Browser and real-device visual/accessibility review not performed. |
| Real WhatsApp/SMS, Supabase phone possession and staff TOTP | Existing adapters and mocked transport tests | Live configuration, approval and staging validation remain required. |

## Review on the existing Windows checkout

Keep the database terminal running. Stop the web and worker processes with Ctrl+C before switching code. Check `git status` first; preserve any uncommitted work before switching. Do not reset the database or regenerate configuration.

```bat
cd /d "D:\ALL PROJECTS\carQR"
git status
git fetch origin
git switch --track origin/fix/local-simulation-handover
npm run db:migrate
```

If the tracking branch already exists locally, use `git switch fix/local-simulation-handover` instead. A successful migration prints `Migrations applied. Database schema is up to date.` A second run is harmless. Start `npm run dev` and `npm run worker` in separate terminals, then repeat the handover's scanner/owner walkthrough with disposable tags and identities. Tests use their isolated PGlite default; never point TEST_DATABASE_URL at development data.

The direct container/release entrypoint is now `node --import tsx scripts/migrate-cli.ts`; `scripts/migrate.ts` remains the importable function. The existing imported-function workaround still works. No migration SQL is added or edited, so no database rollback is required for these source changes.

## Security and rollback

No .env, local database directory, manifest, activation key, phone record, provider credential or existing user data is published or reset. Public tokens, issued QR URLs, sessions, rate limits, CSRF, owner scope, staff MFA and simulation gates are preserved. Secret validation stays on the server. No live provider send is used for verification.

Before merge, returning to `feat/phase-a-application` restores the previous code. After merge, revert the reviewed maintenance PR or the relevant isolated fix commit and rerun checks. Do not revert schema history, rotate keys or erase local data as part of a code rollback. The original Windows migration workaround may again be necessary if rolling back F01.
