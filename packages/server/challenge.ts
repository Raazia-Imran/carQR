import { config, required } from "./config";
import { demand, AppError } from "./errors";
export async function verifyChallenge(value?: string) {
  if (config().PROVIDER_MODE === "simulation") return;
  demand(value && value.length <= 2048, 400, "challenge_required");
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: required("TURNSTILE_SECRET_KEY"),
          response: value,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const result = await response.json();
    demand(
      result.success &&
        result.hostname === new URL(config().APP_ORIGIN).hostname,
      400,
      "challenge_failed",
    );
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(503, "challenge_unavailable");
  }
}
