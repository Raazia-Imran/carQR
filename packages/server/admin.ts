import { rows, one, transaction, pool } from "./db";
import { staff, type Actor } from "./auth";
import { audit } from "./policy";
import { demand } from "./errors";
import { id } from "./crypto";
export async function adminOverview(a: Actor) {
  staff(a);
  return {
    counts: await one(
      "SELECT (SELECT count(*) FROM tag) tags,(SELECT count(*) FROM incident WHERE state='OPEN') open_incidents,(SELECT count(*) FROM delivery WHERE state='UNKNOWN') uncertain,(SELECT count(*) FROM delivery WHERE state='QUEUED') queued",
    ),
    worker: await one(
      "SELECT heartbeat_at FROM worker_health WHERE name='dispatcher'",
    ),
    inventory: await rows(
      "SELECT id,state,batch_id,tenant_id,created_at FROM tag ORDER BY created_at DESC LIMIT 100",
    ),
    deliveries: await rows(
      "SELECT id,incident_id,channel,stage,state,safe_code,simulated,updated_at FROM delivery WHERE state IN ('UNKNOWN','FAILED') ORDER BY updated_at DESC LIMIT 50",
    ),
    reports: await rows(
      "SELECT id,incident_id,category,state,created_at FROM abuse_report ORDER BY created_at DESC LIMIT 50",
    ),
    orders: await rows(
      "SELECT id,quantity,state,created_at FROM manual_order ORDER BY created_at DESC LIMIT 50",
    ),
    audit: await rows(
      "SELECT action,target_id,created_at FROM audit_log ORDER BY created_at DESC LIMIT 50",
    ),
    tenants: await rows("SELECT id,name FROM tenant ORDER BY name"),
  };
}
export async function reconcile(
  a: Actor,
  deliveryId: string,
  result: "failed" | "accepted",
  providerId?: string,
) {
  staff(a, ["admin", "support"]);
  await transaction(async (db) => {
    const d = await one(
      "SELECT id FROM delivery WHERE id=$1 AND state='UNKNOWN' FOR UPDATE",
      [deliveryId],
      db,
    );
    demand(d, 409, "not_uncertain");
    demand(
      result === "failed" || providerId,
      400,
      "provider_reference_required",
    );
    await rows(
      "UPDATE delivery SET state=$2,provider_id=$3,safe_code=$4,updated_at=now() WHERE id=$1",
      [
        deliveryId,
        result === "failed" ? "FAILED" : "ACCEPTED",
        providerId ?? null,
        "operator_reconciled",
      ],
      db,
    );
    await audit(db, a.id, "delivery_reconciled_" + result, deliveryId);
  });
  return { ok: true };
}
export async function siteIncidents(a: Actor, tenantId: string) {
  demand(
    await one("SELECT 1 FROM membership WHERE tenant_id=$1 AND user_id=$2", [
      tenantId,
      a.id,
    ]),
    404,
    "site_not_found",
  );
  return rows(
    "SELECT i.id,i.reason,i.state,i.created_at FROM incident i JOIN tag t ON t.id=i.tag_id WHERE t.tenant_id=$1 ORDER BY i.created_at DESC LIMIT 100",
    [tenantId],
  );
}
export async function createTenant(a: Actor, name: string) {
  staff(a, ["admin"]);
  const tid = id();
  await transaction(async (db) => {
    await rows("INSERT INTO tenant(id,name) VALUES($1,$2)", [tid, name], db);
    await audit(db, a.id, "tenant_created", tid);
  });
  return { id: tid, name };
}
export async function addMembership(
  a: Actor,
  tenantId: string,
  userId: string,
  role: string,
) {
  staff(a, ["admin"]);
  await transaction(async (db) => {
    demand(
      await one(
        "SELECT id FROM app_user WHERE id=$1 AND NOT disabled",
        [userId],
        db,
      ),
      404,
      "account_not_found",
    );
    await rows(
      "INSERT INTO membership(tenant_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(tenant_id,user_id) DO UPDATE SET role=EXCLUDED.role",
      [tenantId, userId, role],
      db,
    );
    await audit(db, a.id, "membership_updated", tenantId);
  });
  return { ok: true };
}
export async function allocateTag(a: Actor, tagId: string, tenantId: string) {
  staff(a, ["admin", "fulfilment"]);
  await transaction(async (db) => {
    const r = await rows(
      "UPDATE tag SET tenant_id=$2 WHERE id=$1 AND state='unclaimed' RETURNING id",
      [tagId, tenantId],
      db,
    );
    demand(r.length, 409, "allocation_unavailable");
    await audit(db, a.id, "tag_allocated", tagId);
  });
  return { ok: true };
}
