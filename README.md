# QR CAR · private vehicle contact

**Working Phase A alpha. Live service launch is not approved.** The repository now includes an application, a durable worker, database migrations, tests and operating guides. The original product plan remains in [PRD.md](PRD.md) and [the planning handbook](QR_CAR_Master_Plan.md).

A passerby scans a sticker, chooses a fixed reason, and intentionally submits an alert. The owner responds through a private dashboard. Public pages never receive the owner's contact record. In configured live mode, WhatsApp is the primary channel and one consented SMS fallback becomes eligible after 90 seconds without acknowledgement.

## What works in this version

- Responsive scanner, sign-in, owner, sticker, preferences, support/admin and site-summary surfaces.
- OTP simulation locally; Supabase phone verification and TOTP adapters for live configuration.
- Separate sealed activation secrets, atomic sticker claims, downloadable QR SVGs, pause, revoke and transfer.
- Scanner-session-bound progress, idempotent incident creation, acknowledgement, resolution, cancellation and abuse reporting.
- PostgreSQL outbox/queue, separate worker, SMS fallback, independently accepted backup invitations and expiry.
- Encrypted contact storage, consent records, rate limits, a daily message-count cap, signed receipts, admin MFA and redacted audit logs.
- Optional location, short-lived location retention, account export/deactivation, manual order requests, basic tenant isolation.
- Install manifest and generic offline page. Private pages and API responses are never cached by the service worker.

Simulation never sends real messages. Live providers, approved templates, the SMS route, real-device checks and pilot operations are still required. Masked calls are Phase B and are not implemented. See [release status and limitations](docs/IMPLEMENTATION.md).

## Run locally

Install Node.js **24** and npm **11**. From a terminal:

```sh
git clone --branch feat/phase-a-application https://github.com/Raazia-Imran/carQR.git
cd carQR
npm ci
npm run local:setup
npm run local:db
```

Keep the database terminal open. In another terminal:

```sh
npm run db:migrate
npm run dev
```

In a third terminal:

```sh
npm run worker
```

Open **http://localhost:3000**. Follow the complete [first-run walkthrough](docs/QUICKSTART.md) to create an owner, grant local staff access, generate a sticker, claim it and submit a test request.

If embedded PostgreSQL is unavailable on your system, use Docker Desktop:

```sh
docker compose --env-file .env -f infra/compose.yml up -d
```

Use one database method, not both. Local setup generates random secrets and a database password; it never overwrites an existing `.env`. Keep `.env`, `.local/`, private print manifests and production data out of Git.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

`npm test` defaults to an isolated in-memory PGlite database. CI uses native PostgreSQL through `TEST_DATABASE_URL`; the tests **erase the schema of that dedicated test database**. Never point it at development or production data. [Verification evidence](docs/TESTING.md) distinguishes local tests, native CI, mock provider tests and checks that require real devices.

## Project layout

| Location | Purpose |
|---|---|
| `app/` | Next.js routes, responsive UI components and styles |
| `packages/server/` | Auth, permissions, tags, incidents, queue, providers, webhooks and HTTP boundary |
| `packages/shared/` | Validated inputs, fixed reasons and language labels |
| `apps/worker/` | Separate durable dispatch and retention process |
| `migrations/` | Versioned PostgreSQL migrations |
| `scripts/` | Local configuration, database and role provisioning |
| `tests/` | Database integration, privacy, concurrency and provider-failure checks |
| `infra/`, `Dockerfile` | Database compose file and application container |

## Documentation

- [First run and demonstration](docs/QUICKSTART.md)
- [Implemented scope, decisions and remaining work](docs/IMPLEMENTATION.md)
- [API contract](contracts/openapi.yaml) and [API usage](docs/API.md)
- [Live authentication and messaging integration](docs/PROVIDERS.md)
- [Deployment, backups, reconciliation and incident response](docs/OPERATIONS.md)
- [Tests and release evidence](docs/TESTING.md)
- [Task board](TASKS.md), [original requirements](PRD.md), [architecture](ARCHITECTURE.md), [roadmap](roadmap.md), [decisions](memory.md)

“QR CAR” is a working name. The original research identified a Pakistani competitor using CarQR; commercial name/domain clearance is still open. No license, supplier approval, customer traction, live delivery rate or zero-bug guarantee is claimed.
