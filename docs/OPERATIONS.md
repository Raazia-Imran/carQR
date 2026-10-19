# Operating QR CAR

## Deployment shape

One Next.js web process, one separate Node worker, and PostgreSQL. The same source image serves web and worker. PostgreSQL holds the queue; Redis is not required. Prefer a managed database with TLS and backups. Keep development, staging and production databases, identity projects, provider senders and secrets separate.

1. Complete the launch gates in docs/08-acceptance-and-launch.md and the current test matrix.
2. Build the Docker image from the reviewed commit. Never pass runtime secrets as build arguments. `.dockerignore` excludes environment files and local data.
3. Provision the database and runtime secrets from `.env.example` in your hosting secret manager. Set `APP_ENV=staging` initially and both live adapters. `APP_ORIGIN` must exactly match the HTTPS browser origin without a trailing slash.
4. Run migrations once as a release job before starting the new web/worker versions. In a container with injected environment variables, run `node --import tsx scripts/migrate.ts` directly; the npm development shortcut expects a local `.env` file.
5. Start web with `npm start`. Start worker with `node --import tsx apps/worker/main.ts` when environment variables are injected, or `npm run worker` for local development.
6. Put the web process behind a trusted HTTPS ingress. Block direct internet access to its port. Overwrite, never append/trust client values for, `X-Real-IP`; then set `TRUST_PROXY=true`. When false, the conservative shared ingress bucket is used, so unrelated users share that bucket.
7. Configure edge request/body limits, TLS/HSTS, route redaction and alerts. Do not log full `/q/:token` paths, cookies, auth bodies, provider payloads or private manifests. The application itself only logs request IDs on API failures.
8. Verify `/api/health`, worker heartbeat, authenticated role boundaries, signed callbacks, opt-out, message caps, backup restore and rollback on staging before a controlled pilot.

The container retains development runtime tools because migrations and worker TypeScript run with `tsx`. It runs as the unprivileged `node` user. Supply a read-only root filesystem where practical and writable temporary storage if your hosting platform requires it. The provided database compose file is for local development, not a production architecture or managed-backup service. Image tags currently track supported major lines; select and record image digests during release.

## Health and alerting

- `/api/health`: database connectivity; returns no contact or queue details.
- Admin overview: queued and uncertain counts, recent failures, reports, inventory, orders and worker heartbeat.
- Alert if worker heartbeat exceeds 60 seconds, database connections fail, oldest queued due time grows, `UNKNOWN` attempts appear, or the daily reservation budget approaches exhaustion.
- No external monitoring service is configured by this repository. Configure one and test its alert path. Availability and latency targets in PRD.md remain targets, not measured SLAs.

## Stop sends quickly

Set `MESSAGING_ENABLED=false` and restart **all** workers. In-flight network requests can finish. Maintenance still expires incidents and removes retained data. Pause/revoke a specific tag in the portal or withdraw the owner's channel consent to stop its queued work. Do not modify provider state to claim that a request already accepted was cancelled.

## Reconcile UNKNOWN attempts

1. Stop any investigation that might send another message.
2. Use the delivery UUID and provider's audited records to establish whether it accepted the request. The adapter supplies correlation data/idempotency keys where available.
3. A valid signed receipt can reconcile the attempt automatically.
4. In Administration, select **Confirm accepted** only with the real provider message ID, or **Confirm failed** only with evidence that submission did not succeed.
5. The application records an audit entry. This action does not resend the message. If uncertainty remains, leave it UNKNOWN. Pending incident expiry and independent SMS policy still apply.

A crashed process leaves a submitting lease. After 60 seconds, maintenance marks it UNKNOWN rather than risking a duplicate external send. A crash before reservation leaves the queued row available to another worker. The tests exercise both logical states; native CI also exercises competing database connections.

## Backup and restore rehearsal

Back up PostgreSQL using the managed provider or `pg_dump` from a controlled operator host. Back up the encryption, lookup and session key versions separately in a secret manager. Do not commit dumps or keys. Encrypt exports and restrict access. The original planning target is a 24-hour RPO and four-hour RTO; neither has been demonstrated yet.

For a rehearsal: restore a backup into an isolated database and isolated configuration with sends disabled; confirm migrations, account/vehicle counts and decryption using consenting test data; compare snapshot time and restore completion time; record RPO/RTO; inspect submitting/accepted attempts against the provider ledger before allowing sends; destroy the rehearsal copy according to the retention process. Never replay a restored queue automatically against live recipients.

## Rollback

Disable sends, preserve the current database, and roll the web/worker back to a compatible prior image. Migrations 001–002 are forward-only and additive; no destructive automatic down migration is provided. A source rollback must not assume newer tables/columns disappeared. Repair forward or restore into an isolated environment after assessing records created since the backup. Keep the previous known-good image until the next release is verified.

## Data retention and deletion

The worker clears optional coordinates after 24 hours, incidents/deliveries after 30 days, webhook deduplication records after seven days, expired sessions/OTP/rate buckets, and audit events after 90 days. Short request references, aggregate budgets, consent and order records have separate operational meaning and are not described as automatically erased.

Account deletion immediately disables the account, removes its encrypted phone value, deletes app sessions, revokes tags and ends active incidents. The minimum HMAC identifier prevents a disabled account being silently reactivated. The operator must separately review hosted identity deletion, unneeded vehicle/order/consent records, backups, legal holds and incident obligations. This is a documented assisted-erasure process, not a claim of complete statutory compliance. Do not use real customer data before policy and entity review.

## Recovery and tag replacement

This alpha supports deliberate transfers by the authenticated owner, and revocation of owned stickers. It does not yet provide self-service phone-number change or a support override for lost sealed credentials. Recover through a reviewed operator procedure; never accept a public QR alone as ownership evidence. Unclaimed tags whose secrets were lost should not be reissued without a separately audited operational migration/tool and new secret. Do not improvise an unlogged database ownership change.

## Release record

Record commit, schema version, dependency audit, CI URL, deployment environment, configured provider/template versions, reviewer, device/carrier matrix, print sample, support operator, consent wording, monitoring alerts, backup rehearsal and rollback result. No production deployment was performed in this implementation session.
