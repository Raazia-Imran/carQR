import { one, rows, transaction, pool } from "./db";
import { encrypt, decrypt, hash, id, token, equal } from "./crypto";
import { demand } from "./errors";
import { audit, rate } from "./policy";
import { staff, type Actor } from "./auth";
import { config } from "./config";
import { reasons } from "../shared/contracts";
export async function publicTag(raw: string) {
  const t = await one(
    "SELECT t.state,v.make,v.color,u.dnd,u.disabled,u.locale FROM tag t JOIN vehicle v ON v.id=t.vehicle_id JOIN app_user u ON u.id=v.owner_id WHERE t.token_hash=$1",
    [hash(raw, "tag")],
  );
  if (!t || t.state !== "active" || t.dnd || t.disabled)
    return { available: false, reasons: [] };
  return {
    available: true,
    descriptor: t.color + " " + t.make,
    locale: t.locale,
    reasons,
  };
}
export async function createBatch(a: Actor, quantity: number) {
  staff(a, ["admin", "fulfilment"]);
  const batchId = id();
  return transaction(async (db) => {
    await rate(db, "batch:" + a.id, 10, 3600);
    await rows(
      "INSERT INTO tag_batch(id,created_by,quantity) VALUES($1,$2,$3)",
      [batchId, a.id, quantity],
      db,
    );
    const manifest = [];
    for (let n = 0; n < quantity; n++) {
      const raw = token(),
        secret = token(),
        tagId = id();
      await rows(
        "INSERT INTO tag(id,batch_id,token_hash,token_cipher,claim_hash) VALUES($1,$2,$3,$4,$5)",
        [tagId, batchId, hash(raw, "tag"), encrypt(raw), hash(secret, "claim")],
        db,
      );
      manifest.push({
        id: tagId,
        scanUrl: config().APP_ORIGIN + "/q/" + raw,
        token: raw,
        claimSecret: secret,
      });
    }
    await audit(db, a.id, "batch_created", batchId);
    return { batchId, tags: manifest };
  });
}
export async function claimTag(
  a: Actor,
  raw: string,
  secret: string,
  vehicleId: string,
) {
  return transaction(async (db) => {
    await rate(db, "claim:" + a.id, 10, 3600);
    demand(
      await one(
        "SELECT id FROM vehicle WHERE id=$1 AND owner_id=$2",
        [vehicleId, a.id],
        db,
      ),
      404,
      "vehicle_not_found",
    );
    const t = await one(
      "SELECT * FROM tag WHERE token_hash=$1 FOR UPDATE",
      [hash(raw, "tag")],
      db,
    );
    demand(
      t &&
        t.state === "unclaimed" &&
        t.claim_hash &&
        equal(t.claim_hash, hash(secret, "claim")),
      409,
      "claim_unavailable",
    );
    await rows(
      "UPDATE tag SET vehicle_id=$1,state='active',claim_hash=NULL,version=version+1 WHERE id=$2",
      [vehicleId, t.id],
      db,
    );
    await audit(db, a.id, "tag_claimed", t.id);
    return { id: t.id, state: "active" };
  });
}
export async function ownTag(a: Actor, tagId: string) {
  const t = await one(
    "SELECT t.* FROM tag t JOIN vehicle v ON v.id=t.vehicle_id WHERE t.id=$1 AND v.owner_id=$2",
    [tagId, a.id],
  );
  demand(t, 404, "tag_not_found");
  return t;
}
export async function changeTag(
  a: Actor,
  tagId: string,
  action: "pause" | "resume" | "revoke" | "transfer",
) {
  return transaction(async (db) => {
    const t = await one(
      "SELECT t.* FROM tag t JOIN vehicle v ON v.id=t.vehicle_id WHERE t.id=$1 AND v.owner_id=$2 FOR UPDATE OF t",
      [tagId, a.id],
      db,
    );
    demand(t && t.state !== "revoked", 404, "tag_not_found");
    let claimSecret: string | undefined;
    if (action === "transfer") {
      claimSecret = token();
      await rows(
        "UPDATE tag SET state='unclaimed',vehicle_id=NULL,claim_hash=$2,version=version+1 WHERE id=$1",
        [tagId, hash(claimSecret, "claim")],
        db,
      );
    } else
      await rows(
        "UPDATE tag SET state=$2,version=version+1 WHERE id=$1",
        [
          tagId,
          action === "pause"
            ? "paused"
            : action === "resume"
              ? "active"
              : "revoked",
        ],
        db,
      );
    if (action !== "resume") {
      await rows(
        "UPDATE incident SET state='CANCELLED' WHERE tag_id=$1 AND state IN ('OPEN','ACKNOWLEDGED')",
        [tagId],
        db,
      );
      await rows(
        "UPDATE delivery SET state='CANCELLED',updated_at=now() WHERE incident_id IN (SELECT id FROM incident WHERE tag_id=$1) AND state='QUEUED'",
        [tagId],
        db,
      );
    }
    await audit(db, a.id, "tag_" + action, tagId);
    return {
      ok: true,
      ...(claimSecret ? { claimSecret, token: decrypt(t.token_cipher) } : {}),
    };
  });
}
export async function createVehicle(a: Actor, make: string, color: string) {
  const vid = id();
  await transaction(async (db) => {
    await rate(db, "vehicle:" + a.id, 20, 86400);
    await rows(
      "INSERT INTO vehicle(id,owner_id,make,color) VALUES($1,$2,$3,$4)",
      [vid, a.id, make, color],
      db,
    );
    await audit(db, a.id, "vehicle_created", vid);
  });
  return { id: vid, make, color };
}
export async function sticker(a: Actor, tagId: string) {
  const t = await ownTag(a, tagId);
  return {
    url: config().APP_ORIGIN + "/q/" + decrypt(t.token_cipher),
    state: t.state,
  };
}
