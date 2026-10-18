import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { config } from "./config";
export const id = randomUUID;
export const token = () => randomBytes(32).toString("base64url");
export function hash(value: string, purpose = "session") {
  const c = config();
  return createHmac(
    "sha256",
    purpose === "phone" ? c.PHONE_LOOKUP_HMAC_KEY : c.SESSION_SECRET,
  )
    .update(purpose + ":" + value)
    .digest("hex");
}
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const c = createCipheriv(
    "aes-256-gcm",
    Buffer.from(config().PHONE_ENCRYPTION_KEY, "hex"),
    iv,
  );
  const encrypted = Buffer.concat([c.update(value, "utf8"), c.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    c.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}
export function decrypt(value: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1") throw new Error("Unsupported key version");
  const d = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(config().PHONE_ENCRYPTION_KEY, "hex"),
    Buffer.from(iv, "base64url"),
  );
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    d.update(Buffer.from(data, "base64url")),
    d.final(),
  ]).toString("utf8");
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
