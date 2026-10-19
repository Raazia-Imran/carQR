# QR CAR Complete Local Setup and Feature Guide

Updated Windows walkthrough and technology learning reference

Prepared for Raazia Imran Reshamwala  |  Updated 19 October 2026

This updated guide covers the implemented application and new 3D landing page. Follow the Windows steps from a fresh clone through a complete scanner and owner demonstration. It also explains the technology stack, source files and official documentation so you can learn how the system works. Paid messaging accounts are not needed for the local simulation.

Current result: the Phase A alpha is implemented and stored on the feature branch. It includes an owner portal and a restricted administration portal. Login is based on a phone one time password. Google or GitHub OAuth login and email verification are not implemented.

| Release detail | Value |
| --- | --- |
| Repository | Raazia-Imran/carQR |
| Application branch | feat/phase-a-application |
| Documented code | 0f4bb0f419c2fb17e227b6ffc1692b76de0de7af |
| Pull request | PR 9 is a draft and is not merged into main |
| Verified checks | 34 tests on native PostgreSQL plus typecheck, migrations, build and runtime audit |
| Local communication | Simulation only; no real WhatsApp message or SMS is sent |

### What you will be able to do

Install the tools, clone the application branch, start the database and application processes, create an account, grant local staff access, generate and claim a sticker, submit a scanner alert, and acknowledge it as the owner. You will also know which features still need provider setup or further development.

Release boundary: this is an alpha with tested backend behavior. Live messaging, hosted identity verification, browser and device checks, physical sticker acceptance and operational launch gates still remain. It is not a zero defect or production readiness guarantee.

[Open the implementation pull request](https://github.com/Raazia-Imran/carQR/pull/9)

## How to use this guide

Use Chapters 4 through 11 for the first complete local run. Chapters 1 through 3 explain the product and code structure. Chapters 14 through 16 explain security and verification. Keep Chapter 17 available while setting up.

| Chapter | Setup and operation |
| --- | --- |
| 1 | Current release and implemented features |
| 2 | Login verification and portal access |
| 3 | Where the frontend backend and database are |
| 4 | Install the tools on Windows |
| 5 | Clone the correct branch and create configuration |
| 6 | Start the local database |
| 7 | Run migrations the web app and the worker |
| 8 | Create an owner account and choose consent |
| 9 | Create your local administrator and sticker batch |
| 10 | Add a car and activate a sticker |
| 11 | Test the complete scanner and owner flow |
| 12 | Use owner controls and manage account data |
| 13 | Use backups sites and manual sticker orders |
| 14 | Understand the implemented security controls |

Use Word View then Navigation Pane to jump by heading. The printed page number appears in each footer. Chapters 21 through 28 are the expanded landing page and technology reference.

## Guide contents and learning reference

| Chapter | Security maintenance and learning |
| --- | --- |
| 15 | Handle secrets sessions and retained data |
| 16 | Run checks and understand the test evidence |
| 17 | Fix common local setup problems |
| 18 | Stop restart and update the project safely |
| 19 | Prepare live services and understand remaining work |
| 20 | Command reference source files and next actions |
| 21 | Explore and maintain the 3D landing page |
| 22 | Understand the runtime and frontend stack |
| 23 | Understand database identity and delivery tools |
| 24 | Understand development and testing dependencies |
| 25 | Official documentation for the web and data stack |
| 26 | Official documentation for identity and project tools |
| 27 | Read the code and follow one request |
| 28 | Daily run checklist and completion record |

Commands are written for Windows PowerShell unless stated otherwise. Type or paste one command at a time. A command shown under a terminal label runs in that terminal, inside the carQR repository folder. Replace words such as ACCOUNT_UUID with your actual value; do not paste the placeholder literally.

## 1 Current release and implemented features

The target is a private vehicle contact service for Pakistan. A passerby uses a windshield QR sticker to submit a fixed reason. The platform records the request and privately contacts the responsible owner when real providers are configured. Public scanning does not reveal the stored owner phone number.

| Feature group | Implemented behavior |
| --- | --- |
| 3D landing page | Original cartoon car and streetscape, five scroll chapters, sample interactions, privacy features, pilot audiences and FAQs. |
| Scanner experience | Public tag page, fixed reasons, explicit confirmation, optional location and private request progress. |
| Owner portal | Account login, own dashboard, cars, requests, acknowledgement, resolution and preferences. |
| Sticker lifecycle | Private batch manifest, sealed activation, atomic claim, QR SVG, pause, resume, revoke and transfer. |
| Alert processing | Durable database queue and separate worker; primary WhatsApp stage and SMS fallback policy. |
| Backup contact | One separately invited and accepted backup with independent SMS consent. |
| Administration | Staff MFA gate, tag batches, delivery exceptions, audit, reports and manual order state. |
| Site access | Site records, membership assignment, unclaimed tag allocation and scoped read only summaries. |
| Privacy and data | Encrypted contact storage, minimal public responses, export, account disable and retention jobs. |
| Offline and language | Generic offline page, install manifest, three sets of scanner reason labels and Urdu RTL selection. |

### What a local demonstration proves

You can exercise real application logic and PostgreSQL records while OTP and outbound messaging are simulated. A visible simulation label must remain present. Provider acceptance in this mode is not real message delivery.

### What it does not include

There are no masked voice calls, Google or GitHub sign in buttons, email verification, password login, online payments, automatic shipping, full site operations or native mobile applications. WhatsApp quick reply acknowledgement is not wired up; owners respond in the authenticated portal.

## 2 Login verification and portal access

There is one application with different protected screens. The administration portal is not a separate installation, separate database or second website.

| Question | Current answer |
| --- | --- |
| Owner or user portal | Yes. Main routes are /dashboard, /vehicles, /settings and /backup. |
| Administrator portal | Yes. /admin requires a provisioned staff role and recent staff MFA. |
| Scanner account required | No. Fixed alerts use a high entropy scanner session cookie, not an owner account. |
| Phone verification | Local OTP simulation works. The live Supabase phone OTP adapter needs provider configuration and live checks. |
| Google or GitHub OAuth login | No. No social login UI or OAuth account linking flow has been implemented. |
| Email verification | No. There is no email sign up, verification email, magic link or SMTP integration. |
| Password login | No. Owner login is phone OTP rather than a stored application password. |
| Staff second factor | Local MFA is explicitly simulated. Live staff access requires a verified TOTP factor and a recent aal2 session. |

### Account creation and login

The first successful phone verification creates the application account. A returning verified identity accesses that same account. There is no separate username or sign up form. Local simulation does not prove possession of the typed phone number; it exists only to develop and demonstrate the flow.

### Roles

The account role can be owner, admin, support or fulfilment. Role assignment is an operator command with database access. Support and fulfilment permissions are narrower than platform admin permissions. Site staff and manager memberships are separate tenant records; they do not grant global administration.

### Why Supabase does not mean OAuth is already present

Supabase is used here for phone OTP and TOTP integration. Its broader provider capabilities do not automatically become application features. Adding social sign in or email verification requires new flows, identity linking rules, validation and tests.

## 3 Where the frontend backend and database are

The frontend and request handling backend share the Next.js application and the same browser origin. There is no separate Express server to start on port 5000. The background worker is a second Node process and has no browser page or listening HTTP port.

| Location | Responsibility |
| --- | --- |
| app/layout.tsx and globals.css | Global document layout, metadata and responsive styling. |
| app/[[...path]]/page.tsx | Entry point that selects the application screen for a URL. |
| app/ui.tsx | Top level client application shell. |
| app/components/landing/ | 3D story, page sections, procedural scene, illustrated fallback and scoped styles. |
| app/components/public.tsx | Phone login, scanner, progress, help and policy screens. |
| app/components/owner.tsx | Owner dashboard, cars, stickers, settings and backup screens. |
| app/components/admin.tsx | Administration and site summary interfaces. |
| app/api/[...path]/route.ts | Next.js GET and POST entry point for /api routes. |
| packages/server/ | Backend identity, permissions, incidents, tags, providers, SQL access and security logic. |
| packages/shared/ | Validated request shapes, fixed reason codes and translated labels. |
| apps/worker/main.ts | Independent dispatch, escalation and retention loop. |
| migrations/ and scripts/ | Database structure and local setup, migration and role commands. |

### The three running parts

Web app: http://localhost:3000 serves screens and /api endpoints. Database: PostgreSQL on localhost:55432 stores the application records. Worker: npm run worker reads eligible delivery rows from the same database and processes them.

### Follow one alert through the code

The scanner component submits to the API route. http.ts validates the request and calls incidents.ts. Incident and delivery rows commit together. worker.ts later checks consent and policy, calls providers.ts, and records the result. The owner action updates the incident; the scanner polls its safe projection.

Database choice: the current implementation uses PostgreSQL with the pg package and SQL migrations. Prisma, Redis and BullMQ from the proposed plan are not required by the implemented alpha.

## 4 Install the tools on Windows

Run this project directly on Windows. Your existing Ubuntu virtual machine is not required. The first database option uses the bundled embedded PostgreSQL development dependency; Docker Desktop is an optional fallback, not a mandatory extra installation.

### Install Node 24 and npm

1. Open the official Node download page below. Choose a maintained Node 24 LTS Windows installer that matches your computer architecture. This repository requires Node 24; do not choose another major just because it is newer.

[Official Node downloads](https://nodejs.org/en/download)

2. Install it with npm and the normal PATH integration. Close and reopen PowerShell or VS Code after installation so the new commands are available.

### Install Git

3. Use the official Git for Windows installer. A standard installation is sufficient for cloning this public repository. Restart the terminal afterward.

[Official Git for Windows installation](https://git-scm.com/install/windows)

### Choose an editor

4. VS Code is suitable but optional. Open the repository folder in the editor so its integrated terminals start in a predictable location.

[Official VS Code downloads](https://code.visualstudio.com/download)

### Verify the tools

```powershell
node --version
npm --version
git --version
```

Expected: Node begins with v24, npm is available, and Git prints a version. The project records npm 11.9.0; use npm 11 for the documented workflow. If PowerShell blocks npm.ps1, use npm.cmd in place of npm in every command. You do not need to relax machine wide execution policies.

For local simulation you need an initial internet connection for cloning and npm installation. You do not need WhatsApp credentials, a Supabase project, a paid SMS account or a public domain. Close unnecessary applications if memory is limited. Docker, if used, needs additional resources.

## 5 Clone the correct branch and create configuration

### Create a working folder

Open PowerShell. The following puts the repository in a Projects folder under your own Windows profile, avoiding a protected system directory.

```powershell
$projectRoot = Join-Path $env:USERPROFILE "Projects"
New-Item -ItemType Directory -Force $projectRoot
Set-Location $projectRoot
```

### Clone the application branch

```powershell
$repo = "https://github.com/Raazia-Imran/carQR.git"
git clone --branch feat/phase-a-application $repo
Set-Location carQR
git branch --show-current
git log -1 --oneline
```

Expected branch: feat/phase-a-application. The documented application commit is 0f4bb0f. The main branch still contains the earlier planning baseline at the time of this guide. Cloning main alone will not give you the implementation described here.

### Install exactly the recorded dependencies

```powershell
npm ci
```

Let it finish successfully. npm ci uses package-lock.json; it does not upgrade the application to arbitrary new package versions. The embedded PostgreSQL package uses an installation script, so do not use --ignore-scripts for this workflow.

### Generate local configuration

```powershell
npm run local:setup
```

Expected: a local configuration created message, or an existing .env kept unchanged message. The script generates independent secret keys, a local database password and local simulation flags. It does not overwrite an existing .env.

The .env file is at the repository root, beside package.json. Open it in your editor if needed; do not paste it into a public chat or commit it. Use the generated file for this first run rather than copying the blank .env.example unchanged.

Checkpoint: package.json, package-lock.json, node_modules and .env now exist. Git reports the feature branch. No database, web server or worker has started yet.

## 6 Start the local database

Choose one of the two database methods below. Do not start both on port 55432. The embedded option is the simpler first attempt on a normal Windows account. Docker is useful if that binary cannot run on your system.

### Option A Embedded PostgreSQL

In Terminal A, inside the carQR folder, run:

```powershell
npm run local:db
```

Wait for the local PostgreSQL ready message. Leave this terminal open. The process uses the password and port from DATABASE_URL, creates the qrcar database if absent, and keeps its data in .local/postgres. It binds to the loopback address.

This is a real PostgreSQL development process, not the test suite database. On an unsupported binary platform or a restricted account, it may fail. Record the error and use Option B rather than weakening operating system permissions.

### Option B Docker Desktop

Use this only if Docker Desktop is installed and running. Open a terminal in the repository and run:

```powershell
docker compose --env-file .env -f infra/compose.yml up -d
docker compose --env-file .env -f infra/compose.yml ps
```

Expected: the db service becomes healthy. Docker maps container port 5432 to your computer at localhost:55432. It reads POSTGRES_PASSWORD from the generated .env and stores records in its pgdata volume. The embedded .local/postgres directory is a separate dataset; the methods do not share records.

### Confirm configuration matches the chosen database

DATABASE_URL must point to the database you actually started, using user qrcar, database qrcar, port 55432 and the matching generated password. Do not replace the password with a guessed value. Docker initializes its password only when its database volume is first created; editing .env later does not change an existing database password.

Checkpoint: the database is running. No application tables exist until migrations are applied. Do not continue if the database startup failed.

## 7 Run migrations the web app and the worker

### Terminal A Database

Keep the embedded PostgreSQL terminal from Chapter 6 open, or leave the Docker service running in the background. It is normal for an active server terminal not to return to a command prompt.

### Terminal B Migrations and web application

Open a new terminal. Set the repository folder explicitly, then create the tables:

```powershell
Set-Location "$env:USERPROFILE\Projects\carQR"
npm run db:migrate
```

Expected: Migrations applied. The migration runner records applied SQL files and can be rerun. It creates tables, constraints and indexes; it does not create a default administrator or sample sticker.

Start the web app in the same Terminal B:

```powershell
npm run dev
```

Open http://localhost:3000 in your browser. Keep this terminal running. Expect the cartoon car landing story and a simulation banner. Scroll to explore it; choose Set up your car to start the real local application journey. The page example acknowledgement sends no alert. Frontend screens and the /api backend share this web process.

### Terminal C Background worker

```powershell
Set-Location "$env:USERPROFILE\Projects\carQR"
npm run worker
```

Expected: the worker started message. Keep it running. Without this process, an incident can be recorded and shown to the owner, but background delivery, expiry and retention work will not run normally.

### Optional health check

Visit http://localhost:3000/api/health. With valid configuration and database connectivity it returns an ok response. It does not prove that the worker is running; check the worker terminal or the administration heartbeat for that.

If Next.js chooses port 3001 because 3000 is busy, stop and resolve the conflict, or deliberately update APP_ORIGIN and use the matching origin everywhere. Browser writes require the exact configured origin. Do not mix localhost with 127.0.0.1.

## 8 Create an owner account and choose consent

### Create or access an owner account

1. At http://localhost:3000 choose Set up your car, or open /signin.

2. Enter a phone value in the format +92 followed by ten digits. For your own domestic mobile number, remove its leading zero before adding +92. The text +92XXXXXXXXXX describes the format; the X characters are not accepted input. Do not use someone else's identity for a demonstration.

3. Choose Send verification code. In local simulation the page displays a clearly labelled simulation code. No real SMS was sent. This code is generated for your local challenge; it is not a permanent password.

4. Enter the six digit code and choose Verify and continue. The first successful verification creates the application account and opens /dashboard. Returning verification accesses the existing account.

5. Open Settings. Select the WhatsApp and SMS permissions you want to test, then save. Consent is separate from login, and is checked even for simulated dispatch.

### What you should see

The owner area contains Overview, Cars and stickers, Settings and Backup invitations. A new account initially has no cars, no stickers and no incidents. It does not automatically have administration access.

### Consent and availability

The WhatsApp checkbox grants permission for vehicle alerts over that channel. The SMS checkbox grants permission for alert and fallback messages. Do not disturb pauses vehicle contact. Neither a safety reason nor an urgent reason silently overrides consent.

### OTP limits and common confusion

Local codes expire after five minutes and allow at most five incorrect attempts. Resending is limited to once a minute, with additional recipient and IP caps. A used code cannot be reused. If it fails, request a fresh code after the cooldown; do not keep guessing.

Email and passwords: there is no email confirmation step and no application password to set. You are not missing a screen. This alpha intentionally implements phone OTP only. Local verification is simulated and cannot establish real phone possession.

## 9 Create your local administrator and sticker batch

### Grant the account an administrator role

1. In Settings, copy the Account reference. This is a UUID for the local database account, not your phone number, public QR token or activation secret.

2. Open a fourth temporary terminal in the repository. Replace ACCOUNT_UUID below with the copied reference, without angle brackets.

```powershell
Set-Location "$env:USERPROFILE\Projects\carQR"
npm run admin:grant -- ACCOUNT_UUID admin
```

3. Expected: Role updated. Refresh the web page. Administration should appear in the sidebar; its direct route is /admin.

4. Open Administration and choose Simulate staff verification. This button is explicitly limited to local simulation. The permission lasts for a recent verification window of 15 minutes, so repeat it if the gate reappears.

There is no default admin email, password, shared master login or publicly exposed role upgrade endpoint. The operator command has database access and writes an audit record. Protect access to the machine and configuration that can run it.

### Create a sticker batch

5. Under Create a sticker batch, set Quantity to 1 and generate the batch. The allowed range is 1 to 100, subject to creation rate limits.

6. Expand the sticker row. Save the public scan URL and sealed activation secret privately, or download the private batch JSON manifest. The activation secret is returned during generation and cannot later be recovered from its stored hash.

7. Keep that manifest private. Only the scan URL is intended for the windshield. Never put the sealed secret on the visible sticker, in public screenshots, or in GitHub.

### Other staff roles

```powershell
npm run admin:grant -- ACCOUNT_UUID support
npm run admin:grant -- ACCOUNT_UUID fulfilment
npm run admin:grant -- ACCOUNT_UUID owner
```

Run only the command for the role you intend. Support can review operations and reconcile uncertain sends; fulfilment handles batches and order states. Creating sites and memberships requires platform admin. Normal owners cannot enter global administration even if they edit the frontend.

## 10 Add a car and activate a sticker

### Add your vehicle

1. Open Cars and stickers at /vehicles. In Add a car, enter its make or model and color, then add it.

2. Use only a generic vehicle description. These fields appear on the public tag page, so do not put your name, phone number, email address or home address there. This version does not require a registration plate, CNIC or vehicle document.

### Claim the sticker

3. In Activate a sticker, choose the vehicle you just added.

4. Paste the public scan URL or raw tag code from the batch manifest. Paste the separate sealed activation secret in its own field. Choose Activate sticker.

5. Expected: the tag becomes active and appears under the car in the garage. The database consumes the claim secret. Competing claims cannot both succeed.

A public QR alone cannot activate a sticker. An authenticated account and the correct sealed secret are required. The account must own the selected vehicle. This proves control of the account and tag, not legal ownership of the car.

### View and download the QR

6. Choose View QR for the active sticker. Download the SVG or open the scanner page. The SVG encodes the public contact URL, not the owner's phone number.

7. For the local demonstration, open that URL on the same computer. You can paste it into an incognito or separate browser profile to act as an independent scanner.

### Why scanning from your phone will not work yet

A URL beginning http://localhost:3000 points to the device opening it. On a phone, localhost means the phone, not your Windows computer. Simulation is deliberately restricted to loopback origins. Do not change APP_ORIGIN to your LAN IP or use a public tunnel to bypass that restriction.

Cross device and print acceptance belong on configured HTTPS staging with appropriate test identities and provider permissions. A downloaded local QR is for same computer testing. Physical print size, glare, windshield placement and scanner compatibility still require actual tests.

## 11 Test the complete scanner and owner flow

### Use two browser sessions

Keep the owner logged in in the normal browser. Open the sticker URL in a private window or a different browser profile for the passerby. The scanner does not need to create an owner account.

1. Read the generic vehicle description. Choose English, Roman Urdu or Urdu if desired. Urdu selects RTL presentation for the relevant scanner content; the whole product is not fully translated.

2. Select one reason: blocked access, lights on, window open, visible damage or urgent safety concern. Location sharing is optional; refusing GPS must not block an alert.

3. Continue to confirmation, then confirm and send. Merely opening or scanning the URL must not submit an alert.

4. Expected: a progress page opens with a request reference and recorded status. A database record is not proof of a delivered message or owner response.

5. In the owner browser, open Overview. The inbox refreshes automatically; use Refresh if necessary. Choose I'm coming for that specific request.

6. Expected: the scanner progress page shows the explicit owner response. Future queued escalation stages are suppressed. An already submitted external message could still complete in live mode.

### Demonstrate fallback separately

For a new test, leave the incident unacknowledged with the worker running. The primary WhatsApp stage is eligible immediately. One consented SMS fallback is scheduled after 90 seconds. If an independently accepted backup existed when the incident was created, one backup SMS becomes eligible after 180 seconds. At ten minutes, active unresolved requests expire and new dispatch stops.

Simulation does not create real delivered receipts. A pending or unconfirmed delivery label can therefore be correct. To test another request quickly, use a different tag or wait for the cooldown. Per tag and scanner limits deliberately prevent repeated contact storms.

### Other scanner actions

The scanner can cancel an active request, mark that the way is clear, or report a concern. A scanner session can view and act on only its own incident. Copying an incident URL to an unrelated session should not grant access.

## 12 Use owner controls and manage account data

### Respond to incoming requests

I'm coming records an explicit response. Cannot attend also records a response and stops escalation, but it does not claim that the vehicle moved. Mark resolved records owner reported resolution. Block and report records an abuse concern and blocks that scanner session for the tag.

### Control a sticker

| Action | Effect |
| --- | --- |
| Pause | Makes contact unavailable and ends active incidents for the tag. Queued work is suppressed. |
| Resume | Reactivates a paused tag. It does not undo a permanent revocation or recreate old incidents. |
| Revoke | Permanently disables an owned tag. The UI asks for confirmation. |
| Transfer | Releases the tag from the old vehicle, ends active incidents and returns a fresh sealed claim secret for the next owner. |

During transfer, give the new claim secret privately to the new owner. The public scan token remains usable as the public sticker address, but the old secret no longer activates it. Old history retains the original vehicle description so it does not reveal the new owner's car details.

### Manage settings

Settings stores WhatsApp and SMS consent, do not disturb, and the preferred initial scanner reason language. Revoking consent prevents new eligible dispatches; it cannot recall a message already in a provider's hands. A delivery or read receipt is never treated as acknowledgement.

### Export and delete

Export downloads a JSON file containing the user's minimal profile, vehicles, consent records and incidents. Treat the exported file as private. The export does not include another person's private account data.

Delete account disables it, erases its encrypted contact value, revokes stickers, removes application sessions and ends active incidents. This is not complete erasure of every historical identifier: minimal HMAC, consent, audit, financial or other operational records can remain, and hosted identity and backup deletion require the separate reviewed process.

### Not yet self service

Changing a phone number, recovering a recycled number, or replacing an unclaimed sticker whose sealed secret was lost is not a completed self service workflow. Do not grant ownership using only a photographed public QR or an unlogged database edit.

## 13 Use backups sites and manual sticker orders

### Backup invitations

1. As owner, use Invite backup on a car. Save the private invitation link and share it directly with the intended person. Its secret is in the URL fragment.

2. The invited person signs in separately, enables SMS consent in Settings, opens the invitation, and accepts on /backup. If sign in interrupted the URL, reopen the original invitation link.

3. Acceptance must be independent. The owner cannot silently opt someone else in. A new incident then snapshots that accepted backup as an eligible recipient. An invitation accepted after an existing incident was created does not retrofit that incident's delivery rows.

4. The backup can withdraw from the Backup invitations page. Replacing the owner's invitation removes the previous acceptance. The worker rechecks the current agreement before sending.

A backup receives only the agreed escalation in this version. It does not become the vehicle owner and does not automatically receive the owner's full incident history or administration permissions.

### Site summaries

5. A platform admin creates a site in Administration, selects that site, and assigns an existing account UUID as staff or manager.

6. Allocate an unclaimed sticker to the site before it is claimed. Allocation does not claim it on behalf of an owner.

7. A member sees the site in the sidebar and can open its scoped incident summary. Another site's incidents must remain inaccessible. Current site staff and manager views are minimal read only summaries, not a full guard console.

### Manual sticker order requests

In Settings, choose a quantity between 1 and 20 and submit a sticker request. The account can see its recorded request state. Admin or fulfilment can mark it contacted, fulfilled or cancelled. The system does not take a payment, validate a shipping address, quote a binding price or send an order notification.

Fulfilment remains an operator process. The current redacted order list is not a complete customer relationship or shipping system; agree the identity verified contact and settlement process before running real orders.

## 14 Understand the implemented security controls

These are implemented controls that can be inspected in the code and tested. They reduce specific risks; they do not establish that every security threat is eliminated or that an independent penetration test has passed.

| Control | Purpose and implementation |
| --- | --- |
| Separate secrets | Public tag tokens and sealed claim secrets are independent random values. Claim is authenticated and atomic. |
| Minimal public data | Public projections allowlist generic descriptions, reasons and safe status. They do not return the stored contact record. |
| Contact encryption | AES 256 GCM encrypts contact values. A separate HMAC key supports lookup without plaintext database search. |
| Session cookies | HttpOnly and SameSite Strict cookies. Secure is enabled for HTTPS origins; local HTTP is a development exception. |
| Server authorization | Owner, intended incident actor, tenant membership and staff permissions are checked in backend functions. |
| Mutation protection | Browser mutations require the exact configured Origin, JSON content and validated inputs. Body size is bounded. |
| Abuse limits | OTP, scanner, tag and ingress rate buckets; owner pause and session blocking; platform daily message reservation cap. |
| Safe request handling | No alert on GET. Idempotency binds a key to its principal and body, so retries cannot create another logical incident. |
| Provider verification | Raw WhatsApp signatures and timestamped SMS signatures are verified. Duplicate receipts are deduplicated. |
| Failure handling | Uncertain sends are kept UNKNOWN. Workers do not blindly repeat a potentially accepted external message. |
| Staff accountability | Provisioned roles, recent MFA and audit records for sensitive mutations. Logs omit raw provider and contact payloads. |

### Additional protections and limits

The app sets browser security headers, uses parameterized SQL and applies a live CAPTCHA check. Real deployment still needs correct TLS, trusted ingress and log redaction, provider side abuse and billing limits, secret management, human review and operational monitoring. Audit rows are not a tamper proof external ledger.

## 15 Handle secrets sessions and retained data

### Local environment variables

| Variable | Meaning |
| --- | --- |
| APP_ENV and APP_ORIGIN | Local uses local and http://localhost:3000. The origin must match browser requests exactly. |
| AUTH_MODE and PROVIDER_MODE | Generated values are simulation. Staging and production require Supabase and live messaging. |
| DATABASE_URL | Connection string for your chosen PostgreSQL instance. It includes a private password. |
| POSTGRES_PASSWORD | Used by local Docker Compose. It must match DATABASE_URL for that database. |
| PHONE_ENCRYPTION_KEY | Independent 32 byte hex key for encrypted contact and tag token values. |
| PHONE_LOOKUP_HMAC_KEY | Independent lookup key. Changing it requires a planned reindexing process. |
| SESSION_SECRET | Independent key used for session and other purpose separated HMAC hashes. |
| DAILY_MESSAGE_LIMIT | Default 500 dispatch reservations per database day. It is a count cap, not an exact currency limit. |
| MESSAGING_ENABLED | False stops new worker submissions after restart; maintenance still runs. |
| TRUST_PROXY | False locally. True is appropriate only behind an ingress that overwrites X Real IP and blocks direct access. |

The generated .env must stay private and remain with the matching database. Do not rename it .env.txt. Blank secrets from .env.example cannot replace it. Do not regenerate encryption or lookup keys over existing records without a migration and backup plan.

### Session lifetime

Local owner sessions last up to 12 hours. Local staff verification is recent for 15 minutes. Live sessions expire with the identity provider access token and are not silently refreshed. Sign out removes the application session hash. Live provider identity and provider wide sessions require separate handling.

### Retention

With the worker running, exact optional location is cleared after 24 hours, incident and delivery history after 30 days, webhook deduplication records after seven days and redacted audit after 90 days. Expired sessions, OTP challenges and rate buckets are cleared. Consent, order, budget and disabled account records are not all covered by those deletion intervals.

Backups must include the appropriate encrypted data and protected key versions. No complete key rotation service, legal retention assessment or measured backup recovery drill has been completed.

## 16 Run checks and understand the test evidence

### Run the normal checks

Use an extra terminal in the repository. Keep the development database separate from disposable tests.

```powershell
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Typecheck validates TypeScript. npm test runs the integration and failure scenarios. Build creates the optimized Next.js output. The runtime audit checks published dependency advisories. An audit with zero findings does not prove that the application itself has no vulnerabilities.

### What has actually passed

At documented application and landing commit 0f4bb0f, all 34 tests passed locally and in GitHub CI using native PostgreSQL. CI also passed installation, typecheck, local configuration creation, the migration command, the production build and runtime dependency audit.

[Verified native PostgreSQL CI run](https://github.com/Raazia-Imran/carQR/actions/runs/39168287688)

| Risk area | Examples in the suite |
| --- | --- |
| Privacy and permissions | Safe DTOs, different owners and scanners, site membership, transfer history. |
| Concurrency | One winning claim, same key retries, 100 concurrent incidents and unique logical delivery stages. |
| Identity and controls | OTP attempt caps and reuse, session logout, staff role and MFA gates, rate and daily count limits. |
| Reliability | Consent withdrawal, pause, fallback timing, worker lease recovery, early receipts and acknowledgement races. |
| Provider boundaries | Signed callbacks, replay and ordering, mocked request bodies, uncertain timeouts and CAPTCHA hostname checks. |

### Test database warning

Without TEST_DATABASE_URL, the suite creates an isolated in memory PGlite database and serializes its connections. Native CI uses a dedicated PostgreSQL database. Supplying TEST_DATABASE_URL makes setup drop that database's public schema. Never point it at local data you want to keep or at production. The tests do not read .env to choose their native test database.

Browser rendering, real mobile OTP and MFA, actual messaging, physical sticker scanning and a timed restore are still separate acceptance tasks. The 100 incident test checks correctness; it is not a production latency or capacity benchmark.

## 17 Fix common local setup problems

### Command not recognized

If node, npm or git is missing, complete installation and reopen the terminal. Check node --version. If npm.ps1 is blocked, use npm.cmd ci and the corresponding npm.cmd run commands. Do not disable machine wide PowerShell protections just to run npm.

### Repository contains only planning files

Check git branch --show-current. You need feat/phase-a-application, not main. If the folder already has work, inspect git status first. Fetch the remote and switch to the feature branch only after preserving your edits.

### No package json or wrong folder

Run Get-Location and Test-Path package.json in PowerShell. Navigate to the actual carQR folder, not its parent, node_modules, or a second nested copy. All npm scripts here run from the repository root.

### Database startup or connection fails

Confirm exactly one database method is running and port 55432 is free. Use the generated DATABASE_URL and matching password. An embedded binary or account permission failure can be handled with the Docker alternative. A Docker database with an old volume keeps its original password. Do not delete valuable data to fix a password mismatch.

### Database relation does not exist

Start the selected database, then run npm run db:migrate. If that command fails, fix its error before opening the application. An empty database is not populated just by starting the web server.

### Invalid origin or writes fail

Use http://localhost:3000 consistently. Do not switch between localhost and 127.0.0.1, use a different port, or add a trailing slash to APP_ORIGIN. Restart web and worker after deliberate .env changes. Preserve all secret values.

### Admin access is denied

Sign in first, grant the correct local account UUID the intended staff role, refresh, and complete recent staff verification. A copied phone number, tag UUID or claim secret is not the account reference. An owner account cannot bypass role checks by editing the browser.

### Request or code is rejected

OTP may be expired, used or attempt limited. Repeated scanner alerts can hit the five minute tag and scanner cooldown or three per tag in ten minutes. With TRUST_PROXY=false, local users share a conservative ingress bucket. Wait or use a fresh tag for a controlled separate test; do not remove security checks.

### No SMS or QR fails on a phone

Local simulation never sends a real SMS. Check the worker and the expected simulated state. A localhost QR cannot reach your computer from another phone; use the same computer for the local demo. Cross device testing requires configured staging.

## 18 Stop restart and update the project safely

### Stop without losing data

1. Press Ctrl+C in the web terminal. Press Ctrl+C in the worker terminal.

2. For embedded PostgreSQL, press Ctrl+C in its terminal so it can stop cleanly. It retains .local/postgres. Do not close it first while the web app is actively writing.

3. For Docker, stop the service with the following command. Keep its volume.

```powershell
docker compose --env-file .env -f infra/compose.yml stop
```

### Restart on another day

Open the same repository folder. Start your chosen database, rerun migrations if code added any, then start the web app and worker in their separate terminals. You do not need to generate new secrets, create another account or claim the same tag again.

### Update the application safely

Before pulling, save edits and inspect status. Do not discard uncommitted work or force reset shared history. When your working tree is clean and you want the current feature branch:

```powershell
git status
git fetch origin
git switch feat/phase-a-application
git pull --ff-only
npm ci
npm run db:migrate
```

Stop the web and worker before replacing their dependencies; keep the database available for migrations. Restart web and worker after updating. If fast forward fails, stop and inspect the branch history instead of force pushing.

### Development versus optimized local run

npm run dev provides development rebuilds. To run the optimized server locally, stop the development server first, build, then start it on the same configured port:

```powershell
npm run build
npm start
```

The database and worker still need to run separately. Successful building does not create a database or start the worker. Never run two web processes on the same port.

### Protect local data

Deleting .next only removes generated build output. Deleting .local/postgres or a Docker volume destroys that database. Deleting .env loses matching credentials and key material. Keep private backups before destructive cleanup. Do not use Docker down -v unless you deliberately intend to erase its local data.

## 19 Prepare live services and understand remaining work

Local demonstration is the first target. Turning flags to live does not by itself create approved providers, a secure hosted service or production readiness. Use isolated staging and consenting test accounts before real customer use.

### Live identity and staff verification

Create a separate Supabase project for the environment, enable phone OTP, configure an appropriate SMS provider, and configure provider side rate and spending limits. Set SUPABASE_URL and SUPABASE_ANON_KEY. The app does not require a Supabase service role key. Configure a hostname limited Turnstile widget, with matching application and Supabase CAPTCHA settings. Verify real OTP and staff TOTP on controlled accounts.

### Live alert delivery

Obtain a WhatsApp business sender and approved template with two body text variables: reason and reference. Set the chosen Graph API version and Meta sender, access, signature and verification secrets. Subscribe signed callbacks. Owner acknowledgement remains in the portal; inbound WhatsApp reply handling is not implemented.

Select and contract an SMS route. The provided gateway adapter expects an HTTPS endpoint with the documented request, stable provider message ID, idempotency handling and signed receipts. A supplier specific mapping must be supplied or implemented. Supabase sign in SMS and vehicle alert SMS are separate integrations; configuring one does not configure the other.

### Hosting and operational acceptance

Set staging or production with HTTPS, AUTH_MODE=supabase and PROVIDER_MODE=live. Deployed simulation is rejected. Configure the trusted ingress, private runtime secrets, database backups, monitoring, a separate worker, consent and support identity. Run real device, data off owner, physical sticker, authorization, callback, restore and rollback checks.

### Features still needing development

- Google or GitHub OAuth login, email verification and password authentication are not implemented.

- Masked local voice is Phase B and needs carrier use and caller ID approval before implementation and handset testing.

- Phone change and support recovery, lost unclaimed secret replacement, full site operations, full interface translation and online checkout are not complete.

The platform processes private contact data and providers process delivery destinations. The product promise concerns what scanners receive; it is not end to end anonymity, guaranteed emergency help or a claim that the platform cannot know the contact number.

## 20 Command reference source files and next actions

### Everyday command reference

| Task | Command from repository root |
| --- | --- |
| Install locked packages | npm ci |
| Generate local configuration | npm run local:setup |
| Start embedded database | npm run local:db |
| Apply database changes | npm run db:migrate |
| Start development web app | npm run dev |
| Start worker | npm run worker |
| Grant a staff role | npm run admin:grant -- ACCOUNT_UUID admin |
| Check types and tests | npm run typecheck   then   npm test |
| Build and start optimized web | npm run build   then   npm start |

### Where to read more in the repository

README.md is the entry point. docs/QUICKSTART.md covers the first demonstration. docs/IMPLEMENTATION.md distinguishes implemented scope from remaining work. docs/API.md and contracts/openapi.yaml describe endpoints. docs/PROVIDERS.md contains the live SMS gateway contract. docs/OPERATIONS.md covers hosting, reconciliation, backups and deletion. docs/TESTING.md records tests and acceptance gaps. docs/LANDING.md explains the new 3D page and device review checklist. TASKS.md and planning/backlog.csv track remaining work.

### Source and version

This guide describes code commit 0f4bb0f419c2fb17e227b6ffc1692b76de0de7af. The feature branch head was checked before authoring. If the repository changes later, compare its README, package scripts and release notes before using this guide unchanged.

[Reviewed application code snapshot](https://github.com/Raazia-Imran/carQR/tree/0f4bb0f419c2fb17e227b6ffc1692b76de0de7af)

[Repository first run guide](https://github.com/Raazia-Imran/carQR/blob/0f4bb0f419c2fb17e227b6ffc1692b76de0de7af/docs/QUICKSTART.md)

[Release status and limitations](https://github.com/Raazia-Imran/carQR/blob/0f4bb0f419c2fb17e227b6ffc1692b76de0de7af/docs/IMPLEMENTATION.md)

Chapters 22 through 24 explain the pinned packages; Chapters 25 and 26 link to their official documentation. These sites may evolve independently of the recorded code.

## 21 Explore and maintain the 3D landing page

The home route now contains an original Three.js streetscape, a mint cartoon car, a small building and a visitor with a phone. Scrolling changes the camera and the story. This is browser 3D; it does not need Blender, a model download, a separate graphics server or special 4D hardware.

### Try the complete landing story

1. With the web app running, open http://localhost:3000. Scroll through Park, Scan, Alert, Reply and Go. The scene indicators can jump to each chapter.

2. In the Scan chapter, choose a sample reason. The later sample alert changes. In Reply, try the example acknowledgement. Both interactions change only page state; no real incident or message is created.

3. Explore the feature cards, switch between driver, campus and workplace descriptions, and open the FAQs. Pilot prices and terms are operator confirmed; there is no fabricated checkout or claimed customer traction.

4. Use Set up your car or Owner area to reach the real account flow. The decorative QR drawing in the landing scene is not a valid issued tag.

### Source files and safe editing

| File under app/components/landing | Edit here for |
| --- | --- |
| Landing.tsx | Story copy, reason examples, sections, audiences, FAQs and navigation. |
| scene.ts | Car and streetscape geometry, materials, lights, camera and scroll movement. |
| CarScene.tsx | Lazy loading, WebGL lifecycle and original SVG fallback. |
| landing.css | Cream and green palette, typography, sticky layout, overlays and responsive rules. |

The scene respects reduced motion, has a pause control, caps pixel density and stops its render loop offscreen or in a background tab. If WebGL or loading fails, the illustrated SVG remains. Text and navigation remain ordinary HTML. Existing owner, scanner and admin routes keep their application layouts.

### Visual review still to do

Browser automation was unavailable during implementation. Check 360 px through desktop widths, short screens, keyboard focus, 200 percent zoom, reduced motion, menu links, overlay collisions and low power devices. Verify the SVG fallback with WebGL unavailable. Build and SQL test success do not prove that every graphics device is glitch free. See docs/LANDING.md for the full checklist.

## 22 Understand the runtime and frontend stack

A stack is the collection of languages, libraries and services used by the application. npm ci installs the recorded packages together. Do not install each library separately or replace its version while following this guide.

| Technology and recorded version | Role in QR CAR |
| --- | --- |
| Node.js 24.x | Runs the web server, setup scripts, migrations, tests and worker. The engine range is >=24 and <25. |
| npm 11 with packageManager 11.9.0 | Installs package-lock.json and runs the scripts in package.json. |
| Next.js 16.4.2 | Serves the React pages and /api handlers together at localhost:3000. Its build tool compiles the application. |
| React and react-dom 19.3.1 | Render components and update page state for forms, inboxes and interactive landing sections. |
| TypeScript 7.0.2 | Checks types before deployment. TSX is TypeScript with component markup; .ts holds ordinary TypeScript. |
| Three.js 0.186.1 | Renders the procedural 3D landing scene in a browser canvas. The application does not require it for message dispatch. |
| CSS and SVG with browser APIs | Provide the visual layouts, fallback illustration, icons, media queries, pointer input and accessibility semantics. |

### What runs where

React components run in the page and Next.js renders the initial view. Backend modules run on Node, where they can access database credentials and private keys. Three.js initializes on the client through a dynamic import. Never import server secrets into a browser component or add them to a public environment variable.

### There is one web application

You do not start a separate frontend and Express backend. npm run dev starts both page serving and HTTP route handling. The worker is separate because delivery and expiry must continue outside a browser request. PostgreSQL is a third running service.

### What to read first

Start with React components, props, state and effects. Then read Next.js App Router pages and route handlers, followed by the TypeScript handbook. Use the project files beside the docs. Learn Three.js scenes, cameras, geometry, materials and cleanup after you can run the normal scanner journey.

## 23 Understand database identity and delivery tools

| Technology and recorded version | Actual use in the implementation |
| --- | --- |
| PostgreSQL 17 in Docker and CI | Stores accounts, vehicles, tags, incidents, consent, deliveries and audit data. Local embedded binaries use their bundled PostgreSQL version. |
| pg 8.23.1 | Node PostgreSQL driver for pooled connections, parameterized queries and transactions in packages/server/db.ts. |
| Zod 4.6.7 | Validates allowlisted request bodies, phone formats, IDs and configuration at runtime. TypeScript alone cannot validate an incoming JSON request. |
| @supabase/supabase-js 2.118.0 | Live phone OTP and staff TOTP adapter. Local simulation does not need a Supabase project. |
| jose 6.2.12 | Decodes identity token claims used after provider validation. Decoding a JWT is not by itself signature verification or permission to trust it. |
| qrcode 1.5.4 | Generates a real SVG from an issued public tag URL. It does not create owner phone links or sealed activation credentials. |
| Node crypto built in | Random tokens, AES 256 GCM contact encryption, HMAC lookup/session hashes, signature checks and safe comparisons. |

### SQL migrations and the queue

migrations/001_initial.sql creates the main schema. 002_incident_descriptor.sql preserves a historical vehicle description after transfers. scripts/migrate.ts records applied migrations. The delivery table is also the durable queue; no Redis or BullMQ service is used. An incident and its initial delivery rows commit in a single transaction.

### Live services are separate from installed packages

Meta WhatsApp Cloud API uses server fetch calls rather than a separate WhatsApp SDK. Turnstile uses its browser challenge and server verification endpoint. The application SMS gateway is a contract for a chosen supplier; the supplier mapping and approved route are not supplied automatically by npm. Supabase login SMS and vehicle alert SMS are two different delivery paths.

### Durability does not mean blind retries

The worker reserves due rows, checks current consent and handles one application submission per logical stage. An ambiguous provider timeout becomes UNKNOWN. Investigate or reconcile it with provider evidence rather than sending again without knowing whether it was accepted. Delivery, acknowledgement and physical resolution remain different facts.

## 24 Understand development and testing dependencies

These tools support development and verification. Their presence does not mean that every feature of the tool is used in this project. package.json records the exact direct versions; package-lock.json also records transitive dependencies.

| Dependency or tool | Version or configuration | Purpose |
| --- | --- | --- |
| tsx | 4.23.15 | Runs TypeScript scripts via node --import tsx, including the worker. |
| Prettier | 3.9.10 | Formats source files consistently. npm run format:check checks without rewriting. |
| @electric-sql/pglite | 0.5.10 | Isolated local SQL engine for tests when TEST_DATABASE_URL is absent. |
| embedded-postgres | 18.4.0-beta.17 | Development helper used by npm run local:db. This prerelease package can have platform limitations; Docker PostgreSQL 17 is the alternative. |
| Node test runner | Built into Node 24 | Executes tests/application.test.ts. No Jest or Vitest dependency is required. |
| GitHub Actions | ci.yml with PostgreSQL 17 | Installs locked packages and checks types, native SQL tests, migrations, build and runtime audit. |
| Docker Compose | Optional host installation | Runs the local database from infra/compose.yml. It is not required if the embedded method works. |
| Git and VS Code | Host tools | Git downloads/version-controls source. VS Code is an optional editor; it is not the application runtime. |

### Type declaration packages

The direct development dependencies are @types/node 26.6.5, @types/pg 8.23.1, @types/qrcode 1.5.6, @types/react 19.3.0, @types/react-dom 19.3.0 and @types/three 0.186.0. These describe APIs for TypeScript; they do not install a new Node runtime or React renderer. In particular, @types/node 26 does not change the supported runtime from Node 24. Avoid introducing newer runtime APIs without Node 24 verification.

### Planned technologies that are not in this implementation

Tailwind, Prisma, Redis, BullMQ, Express, a Python backend, a native phone app, a payment SDK and a voice carrier integration are not required or implemented here. Styles are plain CSS, queries use pg and SQL, and PostgreSQL holds the queue. The install manifest and generic service worker provide limited offline behavior, not offline submission of new alerts.

## 25 Official documentation for the web and data stack

Read the topic named below, then open the matching project file. These are official project or maintainer references checked during this update. The code versions remain those in package-lock.json; a documentation site may default to a newer version.

### Runtime installation and version control

[Node downloads choose the required Node 24 line](https://nodejs.org/en/download)

[Node 24 documentation and API reference](https://nodejs.org/docs/latest-v24.x/api/)

[npm ci clean lockfile installation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

[Git for Windows installation](https://git-scm.com/install/windows)

[Git tutorial clone status branches and commits](https://git-scm.com/docs/gittutorial)

### Components types routes and browser presentation

[React learn components props state and events](https://react.dev/learn)

[TypeScript handbook and learning paths](https://www.typescriptlang.org/docs/)

[Next.js App Router documentation](https://nextjs.org/docs)

[Three.js manual scenes cameras and rendering](https://threejs.org/manual/)

[Three.js maintainer source and usage example](https://github.com/mrdoob/three.js)

### Data validation and generated stickers

[PostgreSQL 17 tutorial](https://www.postgresql.org/docs/17/tutorial.html)

[node postgres parameterized queries](https://node-postgres.com/features/queries)

[Zod runtime schema validation](https://zod.dev/)

[node qrcode generator documentation](https://github.com/soldair/node-qrcode)

Apply the reading: inspect app/ui.tsx to see route selection, a public component to see React state, packages/shared/contracts.ts to see Zod inputs, and packages/server/db.ts to see parameterized SQL. Do not copy a framework tutorial over the working repository or run create next app inside it.

## 26 Official documentation for identity and project tools

### Authentication messaging and anti abuse

[Supabase phone OTP documentation](https://supabase.com/docs/guides/auth/phone-login)

[Supabase TOTP multi factor authentication](https://supabase.com/docs/guides/auth/auth-mfa/totp)

[jose maintainer documentation](https://github.com/panva/jose)

[Cloudflare Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

[Meta WhatsApp Cloud API documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/)

The Meta documentation endpoint could not be retrieved by the reference checker during this update. Use the official portal and verify the supported API version, sender and template requirements in the actual account before configuring live mode. No live approval or successful send is inferred from this link.

### Tests local database and developer tools

[PGlite local test engine](https://pglite.dev/docs/)

[Embedded PostgreSQL package and platform notes](https://github.com/leinelissen/embedded-postgres)

[tsx TypeScript execution maintainer project](https://github.com/privatenumber/tsx)

[Prettier formatting documentation](https://prettier.io/docs/)

[Node 24 built in test runner](https://nodejs.org/docs/latest-v24.x/api/test.html)

[Node 24 cryptography API](https://nodejs.org/docs/latest-v24.x/api/crypto.html)

[Docker Desktop Windows setup and requirements](https://docs.docker.com/desktop/setup/install/windows-install/)

[GitHub Actions documentation](https://docs.github.com/en/actions)

[VS Code Windows setup](https://code.visualstudio.com/docs/setup/windows)

For optional offline behavior, read the Service Worker API overview at developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API and inspect public/sw.js. The worker in public/sw.js is a browser service worker; apps/worker/main.ts is the separate server delivery worker. They are different processes with different responsibilities.

## 27 Read the code and follow one request

### A practical reading order

1. Read README.md and docs/IMPLEMENTATION.md. Compare the implemented alpha with the older planning architecture; follow current code and scripts for setup.

2. Open package.json. Read scripts first, then dependencies. Next inspect app/[[...path]]/page.tsx and app/ui.tsx to understand how a URL selects a view.

3. Read app/components/common.tsx for API requests and polling. Follow the Scanner and Progress components in public.tsx and the owner inbox in owner.tsx.

4. Read app/api/[...path]/route.ts and packages/server/http.ts. This is the request boundary that checks method, origin, cookie, size, input and role before calling domain code.

5. Read packages/shared/contracts.ts, then tags.ts and incidents.ts. Follow activation, request creation and the owner response transaction.

6. Read db.ts and migrations, then worker.ts, providers.ts and webhooks.ts. Notice how scheduled time, provider outcome and owner acknowledgement stay separate.

7. Read auth.ts, crypto.ts, policy.ts, account.ts and admin.ts. Connect each security control with a test rather than assuming a hidden UI button provides protection.

| Browser action | Example backend route |
| --- | --- |
| Open a sticker | GET /api/public/tags/{token} |
| Confirm an alert | POST /api/public/tags/{token}/incidents |
| Poll scanner progress | GET /api/public/incidents/{id} |
| Read owner inbox | GET /api/owner/dashboard |
| Owner response | POST /api/owner/incidents/{id} |
| Create sticker batch | POST /api/admin/batches |

Use browser Developer Tools then Network during your own local demo. Observe safe requests and status changes. Never share cookies, full tag paths, claim secrets, environment values or private response payloads in public screenshots. Exact bodies, idempotency rules and all endpoints are in docs/API.md and contracts/openapi.yaml.

## 28 Daily run checklist and completion record

### The short start sequence after the first setup

Terminal A: start your chosen PostgreSQL method. Terminal B: enter the repository, apply any new migrations, then start the web app. Terminal C: start the worker. For Docker users, Terminal A can close after the service is healthy.

```powershell
npm run local:db
```

In Terminal B:

```powershell
npm run db:migrate
npm run dev
```

In Terminal C:

```powershell
npm run worker
```

### Record your first successful local demonstration

| Check | What successful completion means |
| --- | --- |
| Correct source | Feature branch contains the application and new landing page, not only planning documents. |
| Three running parts | PostgreSQL, web and delivery worker remain running with matching local configuration. |
| Owner and operator | OTP demonstration account exists; role is assigned through CLI; staff verification gate is exercised. |
| Private sticker claim | Public QR URL and separate secret are generated; an owner claims the tag for their own vehicle. |
| End to end application | A different browser session submits a confirmed request; owner response appears in scanner progress. |
| Fallback and controls | A separate eligible test shows queued timing; pause or opt out suppresses future work. No simulated event is called real delivery. |
| Landing and review | Scroll story and examples are understandable. Actual device and browser results are recorded separately. |

### After changing code

Run npm run typecheck and the relevant tests. Before publishing an application change, run the production build and inspect the affected views. Use npm run format:check for formatting. Document new behavior and changed provider contracts. Never add real contacts, local databases or secrets to Git.

Complete the local milestone above before attempting live integration. Approved providers, real device checks and operational acceptance remain a separate pilot stage.
