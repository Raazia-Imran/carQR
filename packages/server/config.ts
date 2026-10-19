import { z } from "zod";
const schema = z.object({
  APP_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
  APP_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1),
  PROVIDER_MODE: z.enum(["simulation", "live"]),
  AUTH_MODE: z.enum(["simulation", "supabase"]),
  PHONE_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/),
  PHONE_LOOKUP_HMAC_KEY: z.string().min(64),
  SESSION_SECRET: z.string().min(64),
  DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(500),
  MESSAGING_ENABLED: z.enum(["true", "false"]).default("true"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
});
export function config() {
  const c = schema.parse(process.env);
  if (
    new Set([c.PHONE_ENCRYPTION_KEY, c.PHONE_LOOKUP_HMAC_KEY, c.SESSION_SECRET])
      .size !== 3
  )
    throw new Error("Use independent secret keys");
  const local = c.APP_ENV === "local" || c.APP_ENV === "test";
  if (
    !local &&
    (c.PROVIDER_MODE !== "live" ||
      c.AUTH_MODE !== "supabase" ||
      !c.APP_ORIGIN.startsWith("https://"))
  )
    throw new Error("Unsafe deployed environment");
  if (
    local &&
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(c.APP_ORIGIN).hostname,
    )
  )
    throw new Error("Local simulation must use a loopback origin");
  if (c.AUTH_MODE === "supabase")
    for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY"]) required(key);
  if (c.PROVIDER_MODE === "live")
    for (const key of [
      "META_GRAPH_VERSION",
      "META_PHONE_NUMBER_ID",
      "META_ACCESS_TOKEN",
      "META_APP_SECRET",
      "META_VERIFY_TOKEN",
      "META_TEMPLATE_NAME",
      "SMS_GATEWAY_URL",
      "SMS_API_KEY",
      "SMS_WEBHOOK_SECRET",
      "TURNSTILE_SITE_KEY",
      "TURNSTILE_SECRET_KEY",
    ])
      required(key);
  return c;
}
export function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error("Missing configuration: " + name);
  return v;
}
