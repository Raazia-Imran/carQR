import { z } from "zod";
export const deliveryLabels = {
  PENDING: "Waiting for provider acceptance; delivery is not verified",
  ACCEPTED: "Provider accepted the alert; delivery is not verified",
  SIMULATED: "Simulated provider accepted the alert; no real message was sent",
  CONFIRMED: "Provider confirmed delivery",
  UNCONFIRMED: "Delivery is unconfirmed",
} as const;
export const reasons = [
  "blocked_access",
  "lights_on",
  "window_open",
  "visible_damage",
  "urgent_concern",
] as const;
export type Reason = (typeof reasons)[number];
export const labels: Record<string, Record<Reason, string>> = {
  en: {
    blocked_access: "Please move your car",
    lights_on: "Your lights are on",
    window_open: "A window is open",
    visible_damage: "There is visible damage",
    urgent_concern: "Urgent safety concern",
  },
  roman: {
    blocked_access: "Gaari hata dein",
    lights_on: "Lights on hain",
    window_open: "Kh irki khuli hai".replace("Kh ir", "Khir"),
    visible_damage: "Gaari ko nuqsan nazar aa raha hai",
    urgent_concern: "Fori hifazati masla",
  },
  ur: {
    blocked_access: "براہ کرم گاڑی ہٹا دیں",
    lights_on: "آپ کی لائٹس روشن ہیں",
    window_open: "کھڑکی کھلی ہے",
    visible_damage: "گاڑی پر نقصان نظر آ رہا ہے",
    urgent_concern: "فوری حفاظتی مسئلہ",
  },
};
export const incidentInput = z
  .object({
    reason: z.enum(reasons),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().min(0).max(100000),
      })
      .strict()
      .optional(),
    challengeToken: z.string().max(4096).optional(),
  })
  .strict();
export const vehicleInput = z
  .object({
    make: z.string().trim().min(1).max(40),
    color: z.string().trim().min(1).max(25),
  })
  .strict();
export const phoneInput = z
  .string()
  .regex(/^\+92[0-9]{10}$/, "Use a Pakistan number in +92 format");
export const uuid = z.uuid();
export const consentVersion = "2026-10-18-v1";
