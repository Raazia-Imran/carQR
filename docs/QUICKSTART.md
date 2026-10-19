# First run · Windows, macOS or Linux

This walkthrough exercises the real database and application with simulated phone verification and messaging. It makes no external calls or sends. Do not enter production data while learning the system.

## 1. Install and start

Install Node 24 and Git. Clone the feature branch and run the commands in README.md. `npm run local:setup` creates an ignored `.env` with independent random keys. The app uses PostgreSQL on `localhost:55432` and the web server on port 3000.

Keep three terminal windows open: database, web, worker. If the embedded database fails because of OS permissions or binary compatibility, use Docker Desktop and the compose command in README instead. In restricted root-only containers, embedded PostgreSQL may be unable to create its OS user; this is an environment limitation, not a reason to weaken PostgreSQL permissions.

Run `npm run db:migrate` after starting the database and before using the app. Migrations are transactional and safe to rerun. Do not delete the database to apply a later migration.

## 2. Create your owner account

1. Open `http://localhost:3000` and choose **Set up your car**.
2. Enter a test number in the required `+92` plus ten digits format. In local simulation only, no phone ownership is proven and no SMS is sent. Do not use a real person's number for demonstration material.
3. Select **Send verification code**. The page visibly labels and displays its simulation code.
4. Enter that code and continue. A code is single-use and expires after five minutes. Resending is limited to once a minute.
5. Open **Settings**. Choose WhatsApp and/or SMS consent and save. These flags still matter in simulation.

## 3. Provision the local operator

1. In Settings, copy your **Account reference** (UUID).
2. In a terminal inside the repository, run `npm run admin:grant -- ACCOUNT_UUID admin`, replacing the placeholder with the copied ID.
3. Refresh the web page. **Administration** appears in the sidebar.
4. Open it and select **Simulate staff verification**. The local-only simulation notice must be present.
5. Production does not have this shortcut. It requires a real verified TOTP factor and a staff role assigned by the operator.

The `admin:grant` command requires direct access to the database and runtime secrets. It is an operator tool, not a public API. Roles are `admin`, `support`, `fulfilment` and `owner`. Support cannot create batches or manage roles/sites; fulfilment cannot create sites or memberships.

## 4. Make and claim a sticker

1. In Administration, create a batch of one sticker.
2. Expand its row and securely save the public scan URL and separate sealed activation secret, or download the private JSON manifest.
3. Open **Cars & stickers**, add a make/model and color, and select that car in the activation form.
4. Paste the public scan URL and sealed secret. Select **Activate sticker**.
5. Choose **View QR** to open the scanner page or download a QR SVG.

Only the scan URL belongs in the public QR. Never print the activation secret on the windshield. Secrets cannot be retrieved later from the database. Lost, unclaimed credentials require revocation/replacement through the operator's reviewed process, not guessing.

## 5. Run the incident flow

1. Open the sticker's scanner URL in a second browser profile or private window. This represents the passerby.
2. Pick a reason. Location is optional. Review and confirm the request.
3. The status page shows **recorded**. This means persisted, not delivered or acknowledged.
4. In the owner's browser, the request appears in the inbox. Choose **I'm coming**.
5. The scanner's status refreshes to the explicit response. The worker suppresses queued fallback stages.
6. For a separate fallback demonstration, use another sticker or wait for the per-scanner cooldown. Leave the request unacknowledged for 90 seconds with the worker running. The simulated SMS stage is accepted but never reported as real delivery.
7. Try pause, resume, cancellation and block/report. The no-acknowledgement lifetime is ten minutes. Rate limits deliberately prevent repeated rapid tests on the same sticker.

Localhost QR codes cannot be scanned from another phone to reach your computer: on that phone, localhost means the phone itself. Cross-device tests belong on a configured HTTPS staging deployment with separate test accounts and approved provider credentials. Simulation is intentionally restricted to loopback origins.

## 6. Backup, sites and orders

- **Invite backup** creates a private link with a fragment secret. The recipient signs in, enables SMS consent, opens Backup invitations and accepts the secret. If sign-in interrupts navigation, reopen the original invitation. They can withdraw there. The owner can replace the invitation; a new invitation removes the previous acceptance.
- Site administration creates a site, assigns an existing account reference to a staff/manager role, and allocates an **unclaimed** sticker. Members see only that site's redacted incident summaries. This version does not implement site-managed resolution or a full tenancy product.
- Settings records manual sticker requests. Admin/fulfilment can update their state. There is no online checkout, payment collection, address collection or automated shipping.

## Stop and resume

Stop web/worker with Ctrl+C. Stop the embedded database with Ctrl+C; it keeps `.local/postgres`. Docker users can run `docker compose --env-file .env -f infra/compose.yml stop`. Reopen the same terminals later; do not rerun setup with new secrets over existing data. Keep the encryption and HMAC keys with the database backup or encrypted contact records cannot be recovered.
