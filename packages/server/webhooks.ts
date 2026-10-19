import { createHmac } from "node:crypto";
import { z } from "zod";
import { required } from "./config";
import { hash, equal } from "./crypto";
import { demand } from "./errors";
import { rows, transaction } from "./db";
import { receipt } from "./worker";
const statuses: Record<string, "ACCEPTED" | "DELIVERED" | "READ" | "FAILED"> = {
  sent: "ACCEPTED",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
};
export async function whatsappWebhook(raw: string, signature: string | null) {
  demand(
    signature &&
      equal(
        signature,
        "sha256=" +
          createHmac("sha256", required("META_APP_SECRET"))
            .update(raw)
            .digest("hex"),
      ),
    401,
    "invalid_signature",
  );
  const data = JSON.parse(raw);
  await transaction(async (db) => {
    const inserted = await rows(
      "INSERT INTO webhook_event(event_hash,provider) VALUES($1,'whatsapp') ON CONFLICT DO NOTHING RETURNING event_hash",
      [hash(raw, "webhook")],
      db,
    );
    if (!inserted.length) return;
    for (const entry of data.entry ?? [])
      for (const change of entry.changes ?? [])
        for (const s of change.value?.statuses ?? []) {
          if (typeof s.id === "string" && statuses[s.status])
            await receipt(
              db,
              s.id,
              statuses[s.status],
              z.uuid().safeParse(s.biz_opaque_callback_data).success
                ? s.biz_opaque_callback_data
                : undefined,
            );
        }
  });
  return { ok: true };
}
export async function smsWebhook(
  raw: string,
  signature: string | null,
  timestamp: string | null,
) {
  demand(
    timestamp &&
      /^\d+$/.test(timestamp) &&
      Math.abs(Date.now() / 1000 - Number(timestamp)) < 300,
    401,
    "invalid_timestamp",
  );
  demand(
    signature &&
      equal(
        signature,
        createHmac("sha256", required("SMS_WEBHOOK_SECRET"))
          .update(timestamp + "." + raw)
          .digest("hex"),
      ),
    401,
    "invalid_signature",
  );
  const data = z
    .object({
      id: z.string().min(1),
      eventId: z.string().min(1),
      state: z.enum(["ACCEPTED", "DELIVERED", "FAILED"]),
      reference: z.uuid().optional(),
    })
    .strict()
    .parse(JSON.parse(raw));
  await transaction(async (db) => {
    const r = await rows(
      "INSERT INTO webhook_event(event_hash,provider) VALUES($1,'sms') ON CONFLICT DO NOTHING RETURNING event_hash",
      [hash(data.eventId, "sms-event")],
      db,
    );
    if (r.length) await receipt(db, data.id, data.state, data.reference);
  });
  return { ok: true };
}
