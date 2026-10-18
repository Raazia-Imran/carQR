import { config, required } from "./config";
import { labels, type Reason } from "../shared/contracts";
export type SendInput = {
  id: string;
  channel: "whatsapp" | "sms";
  destination: string;
  reason: Reason;
  reference: string;
};
export type SendResult =
  | { state: "ACCEPTED"; providerId: string }
  | { state: "FAILED"; safeCode: string }
  | { state: "UNKNOWN"; safeCode: string };
export interface Provider {
  send(input: SendInput): Promise<SendResult>;
}
export class SimulationProvider implements Provider {
  async send(i: SendInput): Promise<SendResult> {
    return { state: "ACCEPTED", providerId: "sim_" + i.id };
  }
}
export class LiveProvider implements Provider {
  async send(i: SendInput): Promise<SendResult> {
    try {
      let response: Response;
      if (i.channel === "whatsapp") {
        response = await fetch(
          "https://graph.facebook.com/" +
            required("META_GRAPH_VERSION") +
            "/" +
            required("META_PHONE_NUMBER_ID") +
            "/messages",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + required("META_ACCESS_TOKEN"),
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: i.destination,
              type: "template",
              biz_opaque_callback_data: i.id,
              template: {
                name: required("META_TEMPLATE_NAME"),
                language: { code: process.env.META_TEMPLATE_LANGUAGE ?? "en" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: labels.en[i.reason] },
                      { type: "text", text: i.reference },
                    ],
                  },
                ],
              },
            }),
          },
        );
      } else {
        const url = new URL(required("SMS_GATEWAY_URL"));
        if (url.protocol !== "https:") throw new Error("HTTPS required");
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: "Bearer " + required("SMS_API_KEY"),
            "Content-Type": "application/json",
            "Idempotency-Key": i.id,
          },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            to: i.destination,
            reference: i.id,
            text:
              "QR CAR: " +
              labels.en[i.reason] +
              ". Request " +
              i.reference +
              ". Check your vehicle safely. Sign in at " +
              config().APP_ORIGIN +
              "/dashboard",
          }),
        });
      }
      // Retry safety matters more than treating an uncertain server error as a rejection.
      if (
        response.status >= 500 ||
        response.status === 408 ||
        response.status === 429
      )
        return { state: "UNKNOWN", safeCode: "provider_uncertain" };
      if (!response.ok)
        return { state: "FAILED", safeCode: "provider_rejected" };
      const body = await response.json();
      const providerId =
        i.channel === "whatsapp" ? body.messages?.[0]?.id : body.id;
      if (typeof providerId !== "string" || !providerId)
        return { state: "UNKNOWN", safeCode: "provider_response_invalid" };
      return { state: "ACCEPTED", providerId };
    } catch {
      return { state: "UNKNOWN", safeCode: "provider_timeout_or_network" };
    }
  }
}
export function provider(): Provider {
  return config().PROVIDER_MODE === "simulation"
    ? new SimulationProvider()
    : new LiveProvider();
}
