import { transaction, rows, one, pool } from "./db";
import { hash, id, token } from "./crypto";
import { audit, rate } from "./policy";
import { demand } from "./errors";
import type { Actor } from "./auth";
import { consentVersion } from "../shared/contracts";
import { config } from "./config";
export async function preferences(
  a: Actor,
  p: { whatsapp: boolean; sms: boolean; dnd: boolean; locale: string },
) {
  await transaction(async (db) => {
    await rows(
      "UPDATE app_user SET whatsapp=$2,sms=$3,dnd=$4,locale=$5 WHERE id=$1",
      [a.id, p.whatsapp, p.sms, p.dnd, p.locale],
      db,
    );
    for (const channel of ["whatsapp", "sms"] as const)
      await rows(
        "INSERT INTO consent_event(id,user_id,channel,granted,version) VALUES($1,$2,$3,$4,$5)",
        [id(), a.id, channel, p[channel], consentVersion],
        db,
      );
    await audit(db, a.id, "preferences_updated", a.id);
  });
  return { ok: true };
}
export async function inviteBackup(a: Actor, vehicleId: string) {
  const secret = token();
  await transaction(async (db) => {
    demand(
      await one(
        "SELECT id FROM vehicle WHERE id=$1 AND owner_id=$2",
        [vehicleId, a.id],
        db,
      ),
      404,
      "vehicle_not_found",
    );
    await rate(db, "backup:" + a.id, 10, 3600);
    await rows(
      "INSERT INTO backup_link(id,vehicle_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '7 days') ON CONFLICT(vehicle_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,contact_id=NULL,accepted_at=NULL,expires_at=EXCLUDED.expires_at",
      [id(), vehicleId, hash(secret, "backup")],
      db,
    );
    await audit(db, a.id, "backup_invited", vehicleId);
  });
  return { inviteUrl: config().APP_ORIGIN + "/backup#" + secret };
}
export async function acceptBackup(a: Actor, secret: string) {
  await transaction(async (db) => {
    const link = await one(
      "SELECT b.*,v.owner_id FROM backup_link b JOIN vehicle v ON v.id=b.vehicle_id WHERE b.token_hash=$1 FOR UPDATE OF b",
      [hash(secret, "backup")],
      db,
    );
    demand(
      link &&
        !link.accepted_at &&
        link.expires_at > new Date() &&
        link.owner_id !== a.id,
      409,
      "invite_unavailable",
    );
    const user = await one("SELECT sms FROM app_user WHERE id=$1", [a.id], db);
    demand(user?.sms, 409, "sms_consent_required");
    await rows(
      "UPDATE backup_link SET contact_id=$2,accepted_at=now() WHERE id=$1",
      [link.id, a.id],
      db,
    );
    await audit(db, a.id, "backup_accepted", link.id);
  });
  return { ok: true };
}
export async function removeBackup(a: Actor, vehicleId: string) {
  await transaction(async (db) => {
    const result = await rows(
      "DELETE FROM backup_link b USING vehicle v WHERE b.vehicle_id=v.id AND v.id=$1 AND (v.owner_id=$2 OR b.contact_id=$2) RETURNING b.id",
      [vehicleId, a.id],
      db,
    );
    demand(result.length, 404, "backup_not_found");
    await audit(db, a.id, "backup_removed", vehicleId);
  });
  return { ok: true };
}
export async function exportAccount(a: Actor) {
  return {
    profile: await one(
      "SELECT id,locale,whatsapp,sms,dnd,created_at FROM app_user WHERE id=$1",
      [a.id],
    ),
    vehicles: await rows(
      "SELECT id,make,color,created_at FROM vehicle WHERE owner_id=$1",
      [a.id],
    ),
    consents: await rows(
      "SELECT channel,granted,version,created_at FROM consent_event WHERE user_id=$1",
      [a.id],
    ),
    incidents: await rows(
      "SELECT id,reason,state,response,created_at FROM incident WHERE owner_id=$1",
      [a.id],
    ),
  };
}
export async function deleteAccount(a: Actor) {
  await transaction(async (db) => {
    await rows(
      "UPDATE app_user SET disabled=true,phone_cipher=NULL,whatsapp=false,sms=false WHERE id=$1",
      [a.id],
      db,
    );
    await rows("DELETE FROM auth_session WHERE user_id=$1", [a.id], db);
    await rows(
      "UPDATE tag SET state='revoked',claim_hash=NULL WHERE vehicle_id IN (SELECT id FROM vehicle WHERE owner_id=$1)",
      [a.id],
      db,
    );
    await rows(
      "UPDATE incident SET state='CANCELLED',location=NULL WHERE owner_id=$1 AND state IN ('OPEN','ACKNOWLEDGED')",
      [a.id],
      db,
    );
    await rows(
      "DELETE FROM backup_link WHERE contact_id=$1 OR vehicle_id IN (SELECT id FROM vehicle WHERE owner_id=$1)",
      [a.id],
      db,
    );
    await audit(db, a.id, "account_deletion_requested", a.id);
  });
  return { ok: true };
}
