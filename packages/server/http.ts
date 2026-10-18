import { NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { config, required } from "./config";
import {
  actor,
  finishLogin,
  startLogin,
  logout,
  staff,
  simulationMfa,
  mfaRequest,
} from "./auth";
import {
  createBatch,
  claimTag,
  publicTag,
  changeTag,
  createVehicle,
  sticker,
} from "./tags";
import {
  createIncident,
  publicIncident,
  scannerAction,
  ownerAction,
  ownerDashboard,
} from "./incidents";
import {
  preferences,
  inviteBackup,
  acceptBackup,
  removeBackup,
  exportAccount,
  deleteAccount,
} from "./account";
import {
  adminOverview,
  reconcile,
  siteIncidents,
  createTenant,
  addMembership,
  allocateTag,
} from "./admin";
import { whatsappWebhook, smsWebhook } from "./webhooks";
import {
  incidentInput,
  vehicleInput,
  phoneInput,
  uuid,
} from "../shared/contracts";
import { AppError, demand } from "./errors";
import { hash, id, token } from "./crypto";
import { rows, one, pool, transaction } from "./db";
import { rate, audit } from "./policy";
function cookie(req: Request, name: string) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + "="))
    ?.slice(name.length + 1);
}
export function response(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
function setCookie(
  r: NextResponse,
  name: string,
  value: string,
  maxAge: number,
) {
  r.cookies.set(name, value, {
    httpOnly: true,
    secure: config().APP_ORIGIN.startsWith("https:"),
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  return r;
}
async function bodyText(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) return "";
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    demand(size <= 65536, 413, "body_too_large");
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function handle(req: Request): Promise<Response> {
  const requestId = id();
  try {
    const c = config(),
      url = new URL(req.url),
      p = url.pathname.split("/").filter(Boolean).slice(1),
      method = req.method;
    const write = !["GET", "HEAD"].includes(method),
      isWebhook = p[0] === "webhooks";
    if (write && !isWebhook) {
      demand(req.headers.get("origin") === c.APP_ORIGIN, 403, "invalid_origin");
      demand(
        req.headers.get("content-type")?.split(";")[0] === "application/json",
        415,
        "json_required",
      );
    }
    const ip = hash(
      c.TRUST_PROXY === "true"
        ? (req.headers.get("x-real-ip") ?? "missing")
        : "local-ingress",
      "ip",
    );
    const raw = write ? await bodyText(req) : "";
    const input = raw && !isWebhook ? JSON.parse(raw) : {};
    if (p[0] === "health" && method === "GET") {
      await one("SELECT 1");
      return response({ ok: true });
    }
    if (p[0] === "config" && method === "GET")
      return response({
        simulation: c.PROVIDER_MODE === "simulation",
        authSimulation: c.AUTH_MODE === "simulation",
        siteKey:
          c.PROVIDER_MODE === "live"
            ? required("TURNSTILE_SITE_KEY")
            : undefined,
      });
    if (p[0] === "session" && method === "POST") {
      const r = response({ ok: true });
      if (!cookie(req, "scanner_session"))
        setCookie(r, "scanner_session", token(), 86400);
      return r;
    }
    if (p[0] === "auth") {
      if (p[1] === "start" && method === "POST") {
        const d = z
          .object({ phone: phoneInput, captchaToken: z.string().optional() })
          .strict()
          .parse(input);
        return response(await startLogin(d.phone, ip, d.captchaToken));
      }
      if (p[1] === "verify" && method === "POST") {
        const d = z
          .object({
            phone: phoneInput,
            code: z.string().regex(/^\d{6}$/),
            challengeId: z.string().max(100),
          })
          .strict()
          .parse(input);
        const login = await finishLogin(d, ip);
        return setCookie(
          response({ ok: true }),
          "owner_session",
          login.credential,
          login.maxAge,
        );
      }
      if (p[1] === "logout" && method === "POST") {
        await logout(cookie(req, "owner_session"));
        return setCookie(response({ ok: true }), "owner_session", "", 0);
      }
    }
    if (isWebhook) {
      if (p[1] === "whatsapp" && method === "GET") {
        demand(
          url.searchParams.get("hub.mode") === "subscribe" &&
            url.searchParams.get("hub.verify_token") ===
              required("META_VERIFY_TOKEN"),
          403,
          "invalid_verification",
        );
        return new Response(url.searchParams.get("hub.challenge") ?? "", {
          headers: { "Cache-Control": "no-store" },
        });
      }
      if (p[1] === "whatsapp" && method === "POST")
        return response(
          await whatsappWebhook(raw, req.headers.get("x-hub-signature-256")),
        );
      if (p[1] === "sms" && method === "POST")
        return response(
          await smsWebhook(
            raw,
            req.headers.get("x-signature"),
            req.headers.get("x-timestamp"),
          ),
        );
    }
    if (p[0] === "public") {
      const scanner = cookie(req, "scanner_session");
      if (p[1] === "tags" && method === "GET" && p.length === 3)
        return response(await publicTag(z.string().max(100).parse(p[2])));
      demand(
        scanner && /^[a-zA-Z0-9_-]{43}$/.test(scanner),
        401,
        "scanner_session_required",
      );
      if (p[1] === "tags" && p[3] === "incidents" && method === "POST") {
        const key = z
          .string()
          .min(8)
          .max(128)
          .parse(req.headers.get("idempotency-key"));
        return response(
          await createIncident(
            p[2],
            scanner,
            ip,
            key,
            incidentInput.parse(input),
          ),
          201,
        );
      }
      if (p[1] === "incidents") {
        const iid = uuid.parse(p[2]);
        if (method === "GET")
          return response(await publicIncident(iid, scanner));
        if (method === "POST")
          return response(
            await scannerAction(
              iid,
              scanner,
              z.enum(["cancel", "resolve", "report"]).parse(p[3]),
            ),
          );
      }
    }
    const credential = cookie(req, "owner_session");
    const a = await actor(credential);
    if (p[0] === "owner") {
      if (p[1] === "dashboard" && method === "GET")
        return response(await ownerDashboard(a));
      if (p[1] === "vehicles" && method === "POST") {
        const d = vehicleInput.parse(input);
        return response(await createVehicle(a, d.make, d.color), 201);
      }
      if (p[1] === "preferences" && method === "POST")
        return response(
          await preferences(
            a,
            z
              .object({
                whatsapp: z.boolean(),
                sms: z.boolean(),
                dnd: z.boolean(),
                locale: z.enum(["en", "roman", "ur"]),
              })
              .strict()
              .parse(input),
          ),
        );
      if (p[1] === "tags") {
        if (p[2] === "claim" && method === "POST") {
          const d = z
            .object({
              token: z.string().min(22).max(100),
              claimSecret: z.string().min(22).max(100),
              vehicleId: uuid,
            })
            .strict()
            .parse(input);
          return response(
            await claimTag(a, d.token, d.claimSecret, d.vehicleId),
          );
        }
        const tid = uuid.parse(p[2]);
        if (p[3] === "sticker" && method === "GET") {
          const s = await sticker(a, tid);
          const svg = await QRCode.toString(s.url, {
            type: "svg",
            errorCorrectionLevel: "Q",
            margin: 4,
            width: 400,
          });
          return response({ ...s, svg });
        }
        if (method === "POST")
          return response(
            await changeTag(
              a,
              tid,
              z.enum(["pause", "resume", "revoke", "transfer"]).parse(p[3]),
            ),
          );
      }
      if (p[1] === "incidents" && method === "POST") {
        const d = z
          .object({
            action: z.enum([
              "coming",
              "unavailable",
              "report_abuse",
              "resolve",
            ]),
          })
          .strict()
          .parse(input);
        return response(await ownerAction(a, uuid.parse(p[2]), d.action));
      }
      if (p[1] === "backup" && method === "POST") {
        if (p[2] === "accept")
          return response(
            await acceptBackup(
              a,
              z
                .object({ secret: z.string().min(22).max(100) })
                .strict()
                .parse(input).secret,
            ),
          );
        const v = z.object({ vehicleId: uuid }).strict().parse(input).vehicleId;
        return response(
          p[2] === "remove"
            ? await removeBackup(a, v)
            : await inviteBackup(a, v),
        );
      }
      if (p[1] === "backups" && method === "GET")
        return response(
          await rows(
            "SELECT b.vehicle_id,b.accepted_at,v.make,v.color FROM backup_link b JOIN vehicle v ON v.id=b.vehicle_id WHERE b.contact_id=$1",
            [a.id],
          ),
        );
      if (p[1] === "export" && method === "GET")
        return response(await exportAccount(a));
      if (p[1] === "delete" && method === "POST") {
        demand(input.confirm === "DELETE", 400, "confirmation_required");
        return setCookie(
          response(await deleteAccount(a)),
          "owner_session",
          "",
          0,
        );
      }
      if (p[1] === "orders" && method === "POST") {
        const d = z
          .object({ quantity: z.number().int().min(1).max(20) })
          .strict()
          .parse(input);
        const oid = id();
        await transaction(async (db) => {
          await rate(db, "orders:" + a.id, 3, 86400);
          await rows(
            "INSERT INTO manual_order(id,user_id,quantity) VALUES($1,$2,$3)",
            [oid, a.id, d.quantity],
            db,
          );
        });
        return response({ id: oid, state: "requested" }, 201);
      }
    }
    if (p[0] === "mfa" && method === "POST") {
      demand(a.role !== "owner", 403, "not_staff");
      await rate(pool(), "mfa:" + a.id, 20, 600);
      if (c.AUTH_MODE === "simulation") {
        await simulationMfa(a, credential!);
        return response({ ok: true });
      }
      if (p[1] === "factors") {
        const data = await mfaRequest(credential!, "user", undefined, "GET");
        return response({ factors: data.factors ?? [] });
      }
      if (p[1] === "enroll")
        return response(
          await mfaRequest(credential!, "factors", {
            factor_type: "totp",
            friendly_name: "QR CAR",
          }),
        );
      if (p[1] === "verify") {
        const d = z
          .object({ factorId: uuid, code: z.string().regex(/^\d{6}$/) })
          .strict()
          .parse(input);
        const challenge = await mfaRequest(
          credential!,
          "factors/" + d.factorId + "/challenge",
          {},
        );
        const verified = await mfaRequest(
          credential!,
          "factors/" + d.factorId + "/verify",
          { challenge_id: challenge.id, code: d.code },
        );
        await transaction(async (db) => {
          await rows(
            "INSERT INTO auth_session(token_hash,user_id,expires_at) VALUES($1,$2,$3)",
            [
              hash(verified.access_token),
              a.id,
              new Date(Date.now() + verified.expires_in * 1000),
            ],
            db,
          );
          await rows(
            "DELETE FROM auth_session WHERE token_hash=$1",
            [hash(credential!)],
            db,
          );
        });
        return setCookie(
          response({ ok: true }),
          "owner_session",
          verified.access_token,
          verified.expires_in,
        );
      }
    }
    if (p[0] === "admin") {
      staff(a);
      if (p[1] === "overview" && method === "GET")
        return response(await adminOverview(a));
      if (p[1] === "batches" && method === "POST")
        return response(
          await createBatch(
            a,
            z
              .object({ quantity: z.number().int().min(1).max(100) })
              .strict()
              .parse(input).quantity,
          ),
          201,
        );
      if (p[1] === "reconcile" && method === "POST") {
        const d = z
          .object({
            deliveryId: uuid,
            result: z.enum(["failed", "accepted"]),
            providerId: z.string().max(200).optional(),
          })
          .strict()
          .parse(input);
        return response(
          await reconcile(a, d.deliveryId, d.result, d.providerId),
        );
      }
      if (p[1] === "reports" && method === "POST") {
        const rid = uuid.parse(p[2]);
        await transaction(async (db) => {
          demand(
            (
              await rows(
                "UPDATE abuse_report SET state='reviewed' WHERE id=$1 RETURNING id",
                [rid],
                db,
              )
            ).length,
            404,
            "report_not_found",
          );
          await audit(db, a.id, "report_reviewed", rid);
        });
        return response({ ok: true });
      }
      if (p[1] === "orders" && method === "POST") {
        staff(a, ["admin", "fulfilment"]);
        const state = z
          .enum(["contacted", "fulfilled", "cancelled"])
          .parse(input.state);
        const oid = uuid.parse(p[2]);
        await transaction(async (db) => {
          demand(
            (
              await rows(
                "UPDATE manual_order SET state=$2 WHERE id=$1 RETURNING id",
                [oid, state],
                db,
              )
            ).length,
            404,
            "order_not_found",
          );
          await audit(db, a.id, "order_" + state, oid);
        });
        return response({ ok: true });
      }
      if (p[1] === "tenants" && method === "POST")
        return response(
          await createTenant(
            a,
            z.string().trim().min(1).max(80).parse(input.name),
          ),
          201,
        );
      if (p[1] === "memberships" && method === "POST")
        return response(
          await addMembership(
            a,
            uuid.parse(input.tenantId),
            uuid.parse(input.userId),
            z.enum(["staff", "manager"]).parse(input.role),
          ),
        );
      if (p[1] === "allocate" && method === "POST")
        return response(
          await allocateTag(
            a,
            uuid.parse(input.tagId),
            uuid.parse(input.tenantId),
          ),
        );
    }
    if (p[0] === "site" && method === "GET")
      return response(await siteIncidents(a, uuid.parse(p[1])));
    throw new AppError(404, "not_found");
  } catch (e) {
    const status =
      e instanceof AppError
        ? e.status
        : e instanceof z.ZodError || e instanceof SyntaxError
          ? 400
          : 503;
    const code =
      e instanceof AppError
        ? e.code
        : status === 400
          ? "invalid_input"
          : "service_unavailable";
    // Only the request reference is logged; database/provider errors may contain PII.
    if (status === 503) console.error("API failure", requestId);
    return response({ error: code, requestId }, status);
  }
}
