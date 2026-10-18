CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, phone_cipher text NOT NULL, phone_hash text UNIQUE NOT NULL,
 name text NOT NULL DEFAULT 'Driver', role text NOT NULL DEFAULT 'OWNER' CHECK(role IN ('OWNER','ADMIN','OPERATOR')),
 tenant_id uuid, alerts_enabled boolean NOT NULL DEFAULT true,
 totp_cipher text, totp_last_step bigint NOT NULL DEFAULT -1,
 created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
 admin_verified boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS otp_challenges (
 id uuid PRIMARY KEY, phone_hash text NOT NULL, phone_cipher text NOT NULL,
 code_hash text NOT NULL, attempts integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tags (
 id uuid PRIMARY KEY, serial text UNIQUE NOT NULL, public_hash text UNIQUE NOT NULL,
 public_cipher text NOT NULL, claim_hash text NOT NULL,
 owner_id uuid REFERENCES users(id), tenant_id uuid,
 label text NOT NULL DEFAULT 'My vehicle', state text NOT NULL DEFAULT 'UNCLAIMED' CHECK(state IN ('UNCLAIMED','ACTIVE','PAUSED','REVOKED')),
 created_at timestamptz NOT NULL DEFAULT now(), claimed_at timestamptz
);
CREATE TABLE IF NOT EXISTS backup_invites (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id), token_hash text UNIQUE NOT NULL,
 accepted_by uuid REFERENCES users(id), expires_at timestamptz NOT NULL,
 accepted_at timestamptz, revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS incidents (
 id uuid PRIMARY KEY, tag_id uuid NOT NULL REFERENCES tags(id), owner_id uuid NOT NULL REFERENCES users(id),
 scanner_hash text NOT NULL, idempotency_key text NOT NULL, request_hash text NOT NULL,
 reason text NOT NULL CHECK(reason IN ('BLOCKING','LIGHTS','DAMAGE','URGENT')),
 state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','ACKNOWLEDGED','RESOLVED','CANCELLED','EXPIRED')),
 response text, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 acknowledged_at timestamptz, resolved_at timestamptz,
 UNIQUE(scanner_hash,idempotency_key)
);
CREATE INDEX IF NOT EXISTS incidents_owner_idx ON incidents(owner_id,created_at DESC);
CREATE TABLE IF NOT EXISTS outbox (
 id uuid PRIMARY KEY, incident_id uuid REFERENCES incidents(id), challenge_id uuid REFERENCES otp_challenges(id),
 channel text NOT NULL CHECK(channel IN ('WHATSAPP','SMS','BACKUP','OTP')),
 state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','SUBMITTING','ACCEPTED','DELIVERED','READ','FAILED','UNKNOWN','CANCELLED')),
 due_at timestamptz NOT NULL, recipient_id uuid REFERENCES users(id),
 payload_cipher text, provider_id text, error_code text, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(incident_id,channel)
);
CREATE INDEX IF NOT EXISTS outbox_due_idx ON outbox(due_at) WHERE state='QUEUED';
CREATE UNIQUE INDEX IF NOT EXISTS outbox_provider_idx ON outbox(provider_id) WHERE provider_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS webhook_events (id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (
 id uuid PRIMARY KEY, actor_id uuid, action text NOT NULL, subject_id text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS worker_health (id text PRIMARY KEY, seen_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS notification_budget(day date PRIMARY KEY, used integer NOT NULL DEFAULT 0);
