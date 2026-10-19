import { randomBytes } from "node:crypto";
import { writeFile, mkdir, access } from "node:fs/promises";
try {
  await access(".env");
  console.log(".env already exists. Kept unchanged.");
} catch {
  await mkdir(".local", { recursive: true });
  const secret = () => randomBytes(32).toString("hex");
  const password = secret();
  await writeFile(
    ".env",
    [
      "APP_ENV=local",
      "APP_ORIGIN=http://localhost:3000",
      "POSTGRES_PASSWORD=" + password,
      "DATABASE_URL=postgresql://qrcar:" + password + "@localhost:55432/qrcar",
      "PROVIDER_MODE=simulation",
      "AUTH_MODE=simulation",
      "PHONE_ENCRYPTION_KEY=" + secret(),
      "PHONE_LOOKUP_HMAC_KEY=" + secret(),
      "SESSION_SECRET=" + secret(),
      "DAILY_MESSAGE_LIMIT=500",
      "MESSAGING_ENABLED=true",
      "TRUST_PROXY=false",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  console.log(
    "Local configuration created. Start npm run local:db in its own terminal, then run npm run db:migrate.",
  );
}
