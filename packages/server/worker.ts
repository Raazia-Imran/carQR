import { pool, rows, one, transaction, type DB } from "./db";
import { config } from "./config";
import { decrypt, id } from "./crypto";
import { provider, type Provider } from "./providers";
import { audit } from "./policy";
import type { Reason } from "../shared/contracts";
async function eligible(deliveryId: string, db: DB = pool()) {
  return one(
    "SELECT d.*,u.phone_cipher,i.reason FROM delivery d JOIN incident i ON i.id=d.incident_id JOIN tag t ON t.id=i.tag_id JOIN vehicle v ON v.id=t.vehicle_id JOIN app_user owner ON owner.id=i.owner_id JOIN app_user u ON u.id=d.recipient_id WHERE d.id=$1 AND i.state='OPEN' AND i.expires_at>now() AND t.state='active' AND v.owner_id=i.owner_id AND NOT owner.disabled AND NOT owner.dnd AND NOT u.disabled AND NOT u.dnd AND u.phone_cipher IS NOT NULL AND ((d.channel='whatsapp' AND u.whatsapp) OR (d.channel='sms' AND u.sms)) AND (d.stage<>'backup' OR EXISTS(SELECT 1 FROM backup_link b WHERE b.vehicle_id=v.id AND b.contact_id=d.recipient_id AND b.accepted_at IS NOT NULL))",
    [deliveryId],
    db,
  );
}
export async function maintenance() {
  await transaction(async (db) => {
    await rows(
      "UPDATE incident SET state='EXPIRED' WHERE state IN ('OPEN','ACKNOWLEDGED') AND expires_at<=now()",
      [],
      db,
    );
    // A process could have died after provider acceptance. Never blindly resubmit.
    await rows(
      "UPDATE delivery SET state='UNKNOWN',safe_code='worker_lease_expired',updated_at=now() WHERE state='SUBMITTING' AND lease_until<now()",
      [],
      db,
    );
    await rows(
      "UPDATE delivery d SET state='CANCELLED',updated_at=now() FROM incident i WHERE d.incident_id=i.id AND d.state='QUEUED' AND i.state<>'OPEN'",
      [],
      db,
    );
    await rows(
      "UPDATE incident SET location=NULL WHERE location IS NOT NULL AND created_at<now()-interval '24 hours'",
      [],
      db,
    );
    await rows(
      "DELETE FROM incident WHERE created_at<now()-interval '30 days'",
      [],
      db,
    );
    await rows(
      "DELETE FROM webhook_event WHERE received_at<now()-interval '7 days'",
      [],
      db,
    );
    await rows(
      "DELETE FROM audit_log WHERE created_at<now()-interval '90 days'",
      [],
      db,
    );
    await rows("DELETE FROM auth_session WHERE expires_at<now()", [], db);
    await rows("DELETE FROM otp_challenge WHERE expires_at<now()", [], db);
    await rows("DELETE FROM rate_bucket WHERE expires_at<now()", [], db);
  });
}
export async function tick(p: Provider = provider()) {
  const result = await processTick(p);
  // A maintenance pass alone must not make a failing dispatcher look healthy.
  await rows(
    "INSERT INTO worker_health(name,heartbeat_at) VALUES('dispatcher',now()) ON CONFLICT(name) DO UPDATE SET heartbeat_at=now()",
  );
  return result;
}
async function processTick(p: Provider) {
  const c = config();
  await maintenance();
  if (c.MESSAGING_ENABLED !== "true") return false;
  const reserved = await transaction(async (db) => {
    const candidate = await one(
      "SELECT id FROM delivery WHERE state='QUEUED' AND available_at<=now() ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1",
      [],
      db,
    );
    if (!candidate) return null;
    const d = await eligible(candidate.id, db);
    if (!d) {
      await rows(
        "UPDATE delivery SET state='CANCELLED',safe_code='policy_suppressed',updated_at=now() WHERE id=$1",
        [candidate.id],
        db,
      );
      return { skip: true };
    }
    const count = await one(
      "INSERT INTO message_budget(day,count) VALUES(CURRENT_DATE,1) ON CONFLICT(day) DO UPDATE SET count=message_budget.count+1 WHERE message_budget.count<$1 RETURNING count",
      [c.DAILY_MESSAGE_LIMIT],
      db,
    );
    if (!count) {
      await rows(
        "UPDATE delivery SET state='CANCELLED',safe_code='daily_cap',updated_at=now() WHERE id=$1",
        [d.id],
        db,
      );
      return { skip: true };
    }
    await rows(
      "UPDATE delivery SET state='SUBMITTING',lease_until=now()+interval '60 seconds',submissions=submissions+1,simulated=$2,updated_at=now() WHERE id=$1",
      [d.id, c.PROVIDER_MODE === "simulation"],
      db,
    );
    return { skip: false, id: d.id };
  });
  if (!reserved) return false;
  if (reserved.skip) return true;
  // Check again immediately before the network request, after releasing the DB lease transaction.
  const d = await eligible(reserved.id!);
  if (!d) {
    await rows(
      "UPDATE delivery SET state='CANCELLED',safe_code='policy_changed',updated_at=now() WHERE id=$1 AND state='SUBMITTING'",
      [reserved.id],
    );
    return true;
  }
  const result = await p.send({
    id: d.id,
    channel: d.channel,
    destination: decrypt(d.phone_cipher),
    reason: d.reason as Reason,
    reference: d.incident_id.slice(0, 8),
  });
  await transaction(async (db) => {
    const current = await one(
      "SELECT state FROM delivery WHERE id=$1 FOR UPDATE",
      [d.id],
      db,
    );
    // A valid receipt may arrive before the send response. Preserve its stronger evidence.
    if (!current || !["SUBMITTING", "UNKNOWN"].includes(current.state)) return;
    await rows(
      "UPDATE delivery SET state=$2,provider_id=COALESCE(provider_id,$3),safe_code=$4,lease_until=NULL,updated_at=now() WHERE id=$1",
      [
        d.id,
        result.state,
        result.state === "ACCEPTED" ? result.providerId : null,
        result.state === "ACCEPTED" ? null : result.safeCode,
      ],
      db,
    );
    if (result.state === "FAILED" && d.channel === "whatsapp")
      await rows(
        "UPDATE delivery SET available_at=now() WHERE incident_id=$1 AND stage='fallback' AND state='QUEUED'",
        [d.incident_id],
        db,
      );
    await audit(db, null, "delivery_" + result.state.toLowerCase(), d.id);
  });
  return true;
}
export async function receipt(
  db: DB,
  providerId: string,
  state: "ACCEPTED" | "DELIVERED" | "READ" | "FAILED",
  correlation?: string,
) {
  const d = await one(
    "SELECT id,state,provider_id,channel,incident_id FROM delivery WHERE provider_id=$1 OR ($2::uuid IS NOT NULL AND id=$2::uuid) FOR UPDATE",
    [providerId, correlation ?? null],
    db,
  );
  if (
    !d ||
    d.state === "CANCELLED" ||
    (d.provider_id && d.provider_id !== providerId)
  )
    return;
  const rank: Record<string, number> = {
    QUEUED: 0,
    SUBMITTING: 1,
    UNKNOWN: 1,
    FAILED: 2,
    ACCEPTED: 3,
    DELIVERED: 4,
    READ: 5,
  };
  // Hard failures after acceptance are meaningful, but never undo delivery/read evidence.
  if (
    state === "FAILED"
      ? ["DELIVERED", "READ"].includes(d.state)
      : rank[state] <= rank[d.state]
  )
    return;
  await rows(
    "UPDATE delivery SET state=$2,provider_id=$3,lease_until=NULL,updated_at=now() WHERE id=$1",
    [d.id, state, providerId],
    db,
  );
  if (state === "FAILED" && d.channel === "whatsapp")
    await rows(
      "UPDATE delivery SET available_at=now() WHERE incident_id=$1 AND stage='fallback' AND state='QUEUED'",
      [d.incident_id],
      db,
    );
}
