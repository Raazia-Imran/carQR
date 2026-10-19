import { verifyChallenge } from "./challenge";
import { one, rows, transaction, pool } from "./db";
import { hash, id } from "./crypto";
import { demand } from "./errors";
import { rate, audit, terminal } from "./policy";
import type { Actor } from "./auth";
import { incidentInput } from "../shared/contracts";
import type { z } from "zod";
export async function createIncident(
  raw: string,
  scanner: string,
  ip: string,
  key: string,
  input: z.infer<typeof incidentInput>,
) {
  const scannerHash = hash(scanner, "scanner"),
    idem = hash(scanner + ":" + key, "idempotency");
  // Challenge verification is outside the database transaction. A committed idempotent retry
  // is allowed to return without consuming a second single-use challenge.
  const existing = await one(
    "SELECT fingerprint FROM incident WHERE idempotency_hash=$1",
    [idem],
  );
  if (!existing) await verifyChallenge(input.challengeToken);
  const fingerprint = hash(
    JSON.stringify({
      token: raw,
      reason: input.reason,
      location: input.location ?? null,
    }),
    "body",
  );
  return transaction(async (db) => {
    // Serialize all retries for this principal/key before reading the result.
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      idem,
    ]);
    const prior = await one(
      "SELECT id,state,expires_at,fingerprint FROM incident WHERE idempotency_hash=$1",
      [idem],
      db,
    );
    if (prior) {
      demand(prior.fingerprint === fingerprint, 409, "idempotency_conflict");
      return { id: prior.id, state: prior.state, expiresAt: prior.expires_at };
    }
    const t = await one(
      "SELECT t.id,t.state,t.vehicle_id,u.id owner_id,u.dnd,u.disabled,v.make,v.color FROM tag t JOIN vehicle v ON v.id=t.vehicle_id JOIN app_user u ON u.id=v.owner_id WHERE t.token_hash=$1 FOR UPDATE OF t",
      [hash(raw, "tag")],
      db,
    );
    demand(
      t && t.state === "active" && !t.dnd && !t.disabled,
      404,
      "tag_unavailable",
    );
    demand(
      !(await one(
        "SELECT 1 FROM scanner_block WHERE tag_id=$1 AND scanner_hash=$2",
        [t.id, scannerHash],
        db,
      )),
      429,
      "contact_unavailable",
    );
    const recent = await one(
      "SELECT id FROM incident WHERE tag_id=$1 AND scanner_hash=$2 AND created_at>now()-interval '5 minutes'",
      [t.id, scannerHash],
      db,
    );
    demand(!recent, 429, "recent_request_exists");
    await rate(db, "incident-ip:" + ip, 10, 3600);
    await rate(db, "incident-tag:" + t.id, 3, 600);
    await rate(db, "incident-scanner:" + scannerHash, 10, 3600);
    const incidentId = id(),
      expiresAt = new Date(Date.now() + 600000);
    await rows(
      "INSERT INTO incident(id,tag_id,owner_id,scanner_hash,reason,idempotency_hash,fingerprint,location,expires_at,vehicle_descriptor) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        incidentId,
        t.id,
        t.owner_id,
        scannerHash,
        input.reason,
        idem,
        fingerprint,
        input.location ?? null,
        expiresAt,
        t.color + " " + t.make,
      ],
      db,
    );
    await rows(
      "INSERT INTO delivery(id,incident_id,recipient_id,channel,stage,available_at) VALUES($1,$2,$3,'whatsapp','primary',now()),($4,$2,$3,'sms','fallback',now()+interval '90 seconds')",
      [id(), incidentId, t.owner_id, id()],
      db,
    );
    const backup = await one(
      "SELECT contact_id FROM backup_link WHERE vehicle_id=$1 AND accepted_at IS NOT NULL AND contact_id IS NOT NULL",
      [t.vehicle_id],
      db,
    );
    if (backup)
      await rows(
        "INSERT INTO delivery(id,incident_id,recipient_id,channel,stage,available_at) VALUES($1,$2,$3,'sms','backup',now()+interval '180 seconds')",
        [id(), incidentId, backup.contact_id],
        db,
      );
    await audit(db, null, "incident_created", incidentId);
    return { id: incidentId, state: "OPEN", expiresAt };
  });
}
export async function publicIncident(incidentId: string, scanner: string) {
  const i = await one(
    "SELECT id,state,response,expires_at FROM incident WHERE id=$1 AND scanner_hash=$2",
    [incidentId, hash(scanner, "scanner")],
  );
  demand(i, 404, "incident_not_found");
  const attempts = await rows(
    "SELECT state,simulated FROM delivery WHERE incident_id=$1",
    [incidentId],
  );
  const state =
    i.state === "OPEN" && i.expires_at < new Date() ? "EXPIRED" : i.state;
  const delivery = attempts.some(
    (x) => !x.simulated && ["DELIVERED", "READ"].includes(x.state),
  )
    ? "CONFIRMED"
    : attempts.some((x) =>
          ["QUEUED", "SUBMITTING", "ACCEPTED"].includes(x.state),
        )
      ? "PENDING"
      : "UNCONFIRMED";
  return {
    id: i.id,
    state,
    response: i.response,
    expiresAt: i.expires_at,
    delivery,
  };
}
export async function scannerAction(
  incidentId: string,
  scanner: string,
  action: "cancel" | "resolve" | "report",
) {
  return transaction(async (db) => {
    const i = await one(
      "SELECT * FROM incident WHERE id=$1 AND scanner_hash=$2 FOR UPDATE",
      [incidentId, hash(scanner, "scanner")],
      db,
    );
    demand(i, 404, "incident_not_found");
    if (action === "report") {
      await rate(db, "report:" + i.id, 1, 86400);
      await rows(
        "INSERT INTO abuse_report(id,incident_id,category) VALUES($1,$2,$3)",
        [id(), i.id, "scanner_concern"],
        db,
      );
    } else {
      demand(
        !terminal.has(i.state) && i.expires_at > new Date(),
        409,
        "incident_closed",
      );
      await rows(
        "UPDATE incident SET state=$2,resolved_by=$3 WHERE id=$1",
        [
          i.id,
          action === "cancel" ? "CANCELLED" : "RESOLVED",
          action === "resolve" ? "scanner" : null,
        ],
        db,
      );
    }
    await audit(db, null, "scanner_" + action, i.id);
    return { ok: true };
  });
}
export async function ownerAction(
  a: Actor,
  incidentId: string,
  action: "coming" | "unavailable" | "report_abuse" | "resolve",
) {
  return transaction(async (db) => {
    const i = await one(
      "SELECT * FROM incident WHERE id=$1 AND owner_id=$2 FOR UPDATE",
      [incidentId, a.id],
      db,
    );
    demand(i, 404, "incident_not_found");
    demand(
      !terminal.has(i.state) && i.expires_at > new Date(),
      409,
      "incident_closed",
    );
    await rows(
      "UPDATE incident SET state=$2,response=$3,acknowledged_at=COALESCE(acknowledged_at,now()),resolved_by=$4 WHERE id=$1",
      [
        i.id,
        action === "resolve" ? "RESOLVED" : "ACKNOWLEDGED",
        action === "resolve" ? i.response : action,
        action === "resolve" ? "owner" : null,
      ],
      db,
    );
    if (action === "report_abuse") {
      await rows(
        "INSERT INTO scanner_block(tag_id,scanner_hash) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [i.tag_id, i.scanner_hash],
        db,
      );
      await rows(
        "INSERT INTO abuse_report(id,incident_id,category) VALUES($1,$2,$3)",
        [id(), i.id, "owner_abuse"],
        db,
      );
    }
    await audit(db, a.id, "owner_" + action, i.id);
    return { ok: true };
  });
}
export async function ownerDashboard(a: Actor) {
  const [user, vehicles, tags, incidents, orders, sites] = await Promise.all([
    one("SELECT id,role,locale,whatsapp,sms,dnd FROM app_user WHERE id=$1", [
      a.id,
    ]),
    rows(
      "SELECT id,make,color FROM vehicle WHERE owner_id=$1 ORDER BY created_at DESC",
      [a.id],
    ),
    rows(
      "SELECT t.id,t.state,t.vehicle_id FROM tag t JOIN vehicle v ON v.id=t.vehicle_id WHERE v.owner_id=$1 ORDER BY t.created_at DESC",
      [a.id],
    ),
    rows(
      "SELECT i.id,i.reason,i.state,i.response,i.created_at,i.expires_at,i.location,i.vehicle_descriptor AS make FROM incident i WHERE i.owner_id=$1 ORDER BY i.created_at DESC LIMIT 100",
      [a.id],
    ),
    rows(
      "SELECT id,quantity,state,created_at FROM manual_order WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20",
      [a.id],
    ),
    rows(
      "SELECT t.id,t.name,m.role FROM tenant t JOIN membership m ON t.id=m.tenant_id WHERE m.user_id=$1",
      [a.id],
    ),
  ]);
  return {
    user: { ...user, mfa: a.mfa },
    vehicles,
    tags,
    incidents,
    orders,
    sites,
  };
}
