import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { decodeJwt } from "jose";
import { config, required } from "./config";
import { pool, one, rows, transaction } from "./db";
import { decrypt, encrypt, equal, hash, id, token } from "./crypto";
import { demand, AppError } from "./errors";
import { rate, audit } from "./policy";
export type Actor = {
  id: string;
  role: string;
  mfa: boolean;
  subject?: string;
};
const supabase = () =>
  createClient(required("SUPABASE_URL"), required("SUPABASE_ANON_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
export async function startLogin(
  phone: string,
  ip: string,
  captchaToken?: string,
) {
  await transaction(async (db) => {
    await rate(db, "otp-phone:" + hash(phone, "phone"), 1, 60);
    await rate(db, "otp-daily:" + hash(phone, "phone"), 10, 86400);
    await rate(db, "otp-ip:" + ip, 20, 3600);
  });
  if (config().AUTH_MODE === "supabase") {
    demand(captchaToken, 400, "challenge_required");
    const { error } = await supabase().auth.signInWithOtp({
      phone,
      options: { captchaToken },
    });
    if (error) throw new AppError(503, "verification_unavailable");
    return { challengeId: "hosted", simulation: false };
  }
  const code = String(randomInt(100000, 1000000));
  const challengeId = id();
  await rows(
    "INSERT INTO otp_challenge(id,phone_hash,phone_cipher,code_hash,expires_at) VALUES($1,$2,$3,$4,$5)",
    [
      challengeId,
      hash(phone, "phone"),
      encrypt(phone),
      hash(code + challengeId, "otp"),
      new Date(Date.now() + 300000),
    ],
  );
  return { challengeId, simulation: true, demoCode: code };
}
async function bindUser(phone: string, subject?: string) {
  return transaction(async (db) => {
    const u = await one(
      "INSERT INTO app_user(id,auth_subject,phone_hash,phone_cipher) VALUES($1,$2,$3,$4) ON CONFLICT(phone_hash) DO UPDATE SET phone_hash=EXCLUDED.phone_hash RETURNING id,disabled,auth_subject",
      [id(), subject ?? null, hash(phone, "phone"), encrypt(phone)],
      db,
    );
    demand(u && !u.disabled, 403, "account_unavailable");
    // A recycled phone must not silently inherit a previous provider identity.
    demand(!subject || u.auth_subject === subject, 403, "recovery_required");
    return u.id as string;
  });
}
export async function finishLogin(
  input: { phone: string; code: string; challengeId: string },
  ip: string,
) {
  await rate(pool(), "verify-ip:" + ip, 40, 3600);
  if (config().AUTH_MODE === "supabase")
    await rate(pool(), "verify-phone:" + hash(input.phone, "phone"), 5, 300);
  if (config().AUTH_MODE === "supabase") {
    const client = supabase();
    const { data, error } = await client.auth.verifyOtp({
      phone: input.phone,
      token: input.code,
      type: "sms",
    });
    demand(
      !error && data.session && data.user?.phone_confirmed_at,
      401,
      "invalid_code",
    );
    const uid = await bindUser(
      "+" + data.user.phone!.replace(/^\+/, ""),
      data.user.id,
    );
    await rows(
      "INSERT INTO auth_session(token_hash,user_id,expires_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [
        hash(data.session.access_token),
        uid,
        new Date(Date.now() + data.session.expires_in * 1000),
      ],
    );
    return {
      credential: data.session.access_token,
      maxAge: data.session.expires_in,
    };
  }
  const result = await transaction(async (db) => {
    const challenge = await one(
      "SELECT * FROM otp_challenge WHERE id=$1 FOR UPDATE",
      [input.challengeId],
      db,
    );
    if (
      !challenge ||
      challenge.used ||
      challenge.expires_at < new Date() ||
      challenge.attempts >= 5 ||
      challenge.phone_hash !== hash(input.phone, "phone")
    )
      return false;
    await rows(
      "UPDATE otp_challenge SET attempts=attempts+1 WHERE id=$1",
      [input.challengeId],
      db,
    );
    if (
      !equal(challenge.code_hash, hash(input.code + input.challengeId, "otp"))
    )
      return false;
    await rows(
      "UPDATE otp_challenge SET used=true WHERE id=$1",
      [input.challengeId],
      db,
    );
    return true;
  });
  demand(result, 401, "invalid_code");
  const uid = await bindUser(input.phone);
  const credential = token();
  await rows(
    "INSERT INTO auth_session(token_hash,user_id,expires_at) VALUES($1,$2,$3)",
    [hash(credential), uid, new Date(Date.now() + 12 * 3600000)],
  );
  return { credential, maxAge: 12 * 3600 };
}
export async function actor(credential?: string): Promise<Actor> {
  demand(credential, 401, "sign_in_required");
  if (config().AUTH_MODE === "simulation") {
    const u = await one(
      "SELECT u.id,u.role,s.mfa_until FROM auth_session s JOIN app_user u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT u.disabled",
      [hash(credential)],
    );
    demand(u, 401, "sign_in_required");
    return {
      id: u.id,
      role: u.role,
      mfa: !!u.mfa_until && u.mfa_until > new Date(),
    };
  }
  demand(
    await one(
      "SELECT 1 FROM auth_session WHERE token_hash=$1 AND expires_at>now()",
      [hash(credential)],
    ),
    401,
    "sign_in_required",
  );
  const { data, error } = await supabase().auth.getUser(credential);
  demand(!error && data.user?.phone_confirmed_at, 401, "sign_in_required");
  const u = await one(
    "SELECT id,role,phone_hash FROM app_user WHERE auth_subject=$1 AND NOT disabled",
    [data.user.id],
  );
  demand(
    u &&
      u.phone_hash === hash("+" + data.user.phone!.replace(/^\+/, ""), "phone"),
    401,
    "contact_reverification_required",
  );
  // getUser has verified this token with the configured identity provider before decoding.
  const claims = decodeJwt(credential);
  const amr = claims.amr as { method: string; timestamp: number }[] | undefined;
  const recent = amr?.some(
    (x) => x.method === "totp" && x.timestamp * 1000 > Date.now() - 15 * 60000,
  );
  return {
    id: u.id,
    role: u.role,
    mfa: claims.aal === "aal2" && !!recent,
    subject: data.user.id,
  };
}
export function staff(a: Actor, roles = ["admin", "support", "fulfilment"]) {
  demand(roles.includes(a.role) && a.mfa, 403, "staff_mfa_required");
}
export async function logout(credential?: string) {
  if (credential)
    await rows("DELETE FROM auth_session WHERE token_hash=$1", [
      hash(credential),
    ]);
}
// MFA uses the verified bearer token directly; no service-role key is shipped to the app.
export async function mfaRequest(
  credential: string,
  path: string,
  body?: unknown,
  method = "POST",
) {
  const r = await fetch(required("SUPABASE_URL") + "/auth/v1/" + path, {
    method,
    headers: {
      apikey: required("SUPABASE_ANON_KEY"),
      Authorization: "Bearer " + credential,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  demand(r.ok, 400, "mfa_request_failed");
  return await r.json();
}
export async function simulationMfa(a: Actor, credential: string) {
  demand(config().AUTH_MODE === "simulation", 404, "not_found");
  demand(a.role !== "owner", 403, "not_staff");
  await rows("UPDATE auth_session SET mfa_until=$2 WHERE token_hash=$1", [
    hash(credential),
    new Date(Date.now() + 15 * 60000),
  ]);
  await audit(pool(), a.id, "simulation_mfa", a.id);
}
