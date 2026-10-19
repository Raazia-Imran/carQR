CREATE TABLE app_user (
 id uuid PRIMARY KEY, auth_subject text UNIQUE, phone_hash text NOT NULL UNIQUE,
 phone_cipher text, verified_at timestamptz NOT NULL DEFAULT now(),
 role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','support','fulfilment')),
 locale text NOT NULL DEFAULT 'en', disabled boolean NOT NULL DEFAULT false,
 whatsapp boolean NOT NULL DEFAULT false, sms boolean NOT NULL DEFAULT false,
 dnd boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_session (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_user(id), expires_at timestamptz NOT NULL, mfa_until timestamptz);
CREATE TABLE otp_challenge (id uuid PRIMARY KEY, phone_hash text NOT NULL, phone_cipher text NOT NULL, code_hash text NOT NULL, attempts integer NOT NULL DEFAULT 0, expires_at timestamptz NOT NULL, used boolean NOT NULL DEFAULT false);
CREATE TABLE consent_event (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_user(id), channel text NOT NULL, granted boolean NOT NULL, version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE tenant (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE membership (tenant_id uuid NOT NULL REFERENCES tenant(id), user_id uuid NOT NULL REFERENCES app_user(id), role text NOT NULL CHECK (role IN ('staff','manager')), PRIMARY KEY(tenant_id,user_id));
CREATE TABLE vehicle (id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES app_user(id), make text NOT NULL, color text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE tag_batch (id uuid PRIMARY KEY, created_by uuid NOT NULL REFERENCES app_user(id), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE tag (
 id uuid PRIMARY KEY, batch_id uuid REFERENCES tag_batch(id), tenant_id uuid REFERENCES tenant(id),
 token_hash text NOT NULL UNIQUE, token_cipher text NOT NULL, claim_hash text,
 vehicle_id uuid REFERENCES vehicle(id), state text NOT NULL DEFAULT 'unclaimed' CHECK(state IN ('unclaimed','active','paused','revoked')),
 version integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tag_vehicle_idx ON tag(vehicle_id);
CREATE TABLE backup_link (id uuid PRIMARY KEY, vehicle_id uuid NOT NULL UNIQUE REFERENCES vehicle(id), token_hash text NOT NULL UNIQUE, contact_id uuid REFERENCES app_user(id), accepted_at timestamptz, expires_at timestamptz NOT NULL);
CREATE TABLE incident (
 id uuid PRIMARY KEY, tag_id uuid NOT NULL REFERENCES tag(id), owner_id uuid NOT NULL REFERENCES app_user(id),
 scanner_hash text NOT NULL, reason text NOT NULL CHECK(reason IN ('blocked_access','lights_on','window_open','visible_damage','urgent_concern')),
 state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','ACKNOWLEDGED','RESOLVED','CANCELLED','EXPIRED')),
 response text CHECK(response IN ('coming','unavailable','report_abuse')),
 idempotency_hash text NOT NULL UNIQUE, fingerprint text NOT NULL, location jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, acknowledged_at timestamptz, resolved_by text
);
CREATE INDEX incident_owner_idx ON incident(owner_id,created_at DESC);
CREATE INDEX incident_tag_idx ON incident(tag_id,created_at DESC);
CREATE INDEX incident_expiry_idx ON incident(state,expires_at);
CREATE TABLE delivery (
 id uuid PRIMARY KEY, incident_id uuid NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES app_user(id), channel text NOT NULL CHECK(channel IN ('whatsapp','sms')),
 stage text NOT NULL CHECK(stage IN ('primary','fallback','backup')),
 state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','SUBMITTING','ACCEPTED','DELIVERED','READ','FAILED','UNKNOWN','CANCELLED')),
 available_at timestamptz NOT NULL, lease_until timestamptz, provider_id text UNIQUE, safe_code text,
 submissions integer NOT NULL DEFAULT 0, simulated boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(incident_id,channel,recipient_id,stage)
);
CREATE INDEX delivery_queue_idx ON delivery(state,available_at);
CREATE TABLE webhook_event (event_hash text PRIMARY KEY, provider text NOT NULL, received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE rate_bucket (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE message_budget (day date PRIMARY KEY, count integer NOT NULL);
CREATE TABLE scanner_block (tag_id uuid NOT NULL REFERENCES tag(id), scanner_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tag_id,scanner_hash));
CREATE TABLE abuse_report (id uuid PRIMARY KEY, incident_id uuid REFERENCES incident(id) ON DELETE SET NULL, category text NOT NULL, state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','reviewed')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_log (id uuid PRIMARY KEY, actor_id uuid, action text NOT NULL, target_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE manual_order (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_user(id), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 20), state text NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','contacted','fulfilled','cancelled')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE worker_health (name text PRIMARY KEY, heartbeat_at timestamptz NOT NULL);
