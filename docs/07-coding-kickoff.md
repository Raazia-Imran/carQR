# Coding kickoff and repository workflow

This repository currently contains planning, contracts and presentation assets. The product application has not been built. Start implementation with a single vertical slice rather than building every dashboard first.

## Proposed implementation layout

```text
apps/web/                 Next.js scanner, owner, admin and site routes
apps/worker/              outbox dispatch, escalation and retention jobs
packages/domain/          incident state, permissions and channel policy
packages/db/              Prisma schema and migrations
packages/providers/       fake, WhatsApp, SMS and later voice adapters
packages/contracts/       validated request/response schemas
packages/ui/              accessible shared components and translations
infra/                    local compose and deployment configuration
```

## First coding session

1. Read PRD.md, ARCHITECTURE.md, AGENTS.md and docs/02-communications.md.
2. Select currently supported Node LTS and compatible Next.js/Prisma/BullMQ versions using official docs; pin the package manager and commit lockfile. No dependency versions are asserted by this planning package.
3. Create the web workspace using the official scaffold, enable TypeScript, linting and tests. Add PostgreSQL/Redis local services with local-only credentials. Create environment examples containing placeholders only.
4. Build a fake provider adapter that returns deterministic accepted/delivered/failure states. Give local UI a visible “Simulation” indicator.
5. Implement owner/contact/consent/vehicle/tag models and atomic claim with random token fixtures. Do not seed real numbers.
6. Implement public tag response allowlist, incident POST with idempotency and outbox, then worker dispatch and explicit acknowledgement.
7. Test worker restart, duplicate webhook, consent withdrawal and two-owner isolation before connecting a real provider.
8. Add actual WhatsApp sandbox/test phone integration, then contracted SMS. Maintain separate credentials and databases for staging/production.

## Provider interface sketch

```ts
type Channel = 'whatsapp' | 'sms';
type SendResult =
  | { state: 'accepted'; providerId: string }
  | { state: 'failed'; retryable: boolean; safeCode: string }
  | { state: 'unknown'; reconciliationKey: string };
interface AlertProvider {
  send(input: {
    destinationE164: string; // server-only decrypted destination
    templateKey: string;
    safeVariables: Record<string, string>;
    idempotencyKey: string;
  }): Promise<SendResult>;
}
```

This is an interface sketch, not deployable production code. Some providers do not support idempotency keys; the adapter must document that and handle ambiguous acceptance. Phone values must never enter browser bundles or log statements.

## Working practices

Feature branches, small reviewed pull requests, named reviewer, linked task ID, tests and screenshot of user-visible change when relevant. No force-push to shared main. If a task changes permissions, pricing or retention, update the corresponding plan and record the decision. Distinguish code done, integrated, tested and released in task status.

Two-developer split: Dev A owns domain/DB/provider/worker work; Dev B owns scanner/owner/admin UI and integration tests. Both review authorization and webhook code. Product/QA obtains consented pilot access, gathers quotes and checks language/print quality. Do not assign teammates by name without their agreement.

## Environment variable plan

Server-only: DATABASE_URL, REDIS_URL, AUTH_SECRET, PHONE_ENCRYPTION_KEY, PHONE_LOOKUP_HMAC_KEY, META_ACCESS_TOKEN, META_APP_SECRET, META_PHONE_NUMBER_ID, WEBHOOK_VERIFY_TOKEN, SMS_API_KEY, SMS_SENDER_ID, PROVIDER_MODE, STORAGE credentials. B adds carrier credentials and allowed caller ID. Public: only safe application origin and nonsecret UI flags. Live keys are provisioned outside GitHub source. Use explicit fail-closed checks against accidentally enabling fake providers in production.
