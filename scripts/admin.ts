import { z } from "zod";
import { one, rows, pool, transaction } from "../packages/server/db";
import { audit } from "../packages/server/policy";
const uid = z.uuid().parse(process.argv[2]);
const role = z
  .enum(["admin", "support", "fulfilment", "owner"])
  .parse(process.argv[3] ?? "admin");
await transaction(async (db) => {
  if (
    !(await one(
      "SELECT id FROM app_user WHERE id=$1 AND NOT disabled",
      [uid],
      db,
    ))
  )
    throw new Error("Account not found. Sign in first.");
  await rows("UPDATE app_user SET role=$2 WHERE id=$1", [uid, role], db);
  await audit(db, null, "operator_role_" + role, uid);
});
await pool().end();
console.log("Role updated. Staff must complete MFA before admin access.");
