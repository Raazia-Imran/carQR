import type { DB } from "./db";
import { one, rows } from "./db";
import { AppError } from "./errors";
import { hash, id } from "./crypto";
export async function rate(
  db: DB,
  key: string,
  limit: number,
  seconds: number,
) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const r = await one<{ count: number }>(
    "INSERT INTO rate_bucket(key,count,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=rate_bucket.count+1 RETURNING count",
    [hash(key + ":" + bucket, "rate"), new Date((bucket + 1) * seconds * 1000)],
    db,
  );
  if (r!.count > limit) throw new AppError(429, "rate_limited");
}
export async function audit(
  db: DB,
  actor: string | null,
  action: string,
  target: string,
) {
  await rows(
    "INSERT INTO audit_log(id,actor_id,action,target_id) VALUES($1,$2,$3,$4)",
    [id(), actor, action, target],
    db,
  );
}
export const terminal = new Set(["RESOLVED", "CANCELLED", "EXPIRED"]);
