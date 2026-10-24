import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomInt } from "node:crypto";
import { setup } from "./setup";
import { pool, one, rows, transaction } from "../packages/server/db";
import { id, token, hash, encrypt, decrypt } from "../packages/server/crypto";
import { config } from "../packages/server/config";
import {
  createBatch,
  claimTag,
  createVehicle,
  publicTag,
  changeTag,
  ownTag,
} from "../packages/server/tags";
import {
  createIncident,
  publicIncident,
  ownerAction,
  scannerAction,
} from "../packages/server/incidents";
import {
  preferences,
  inviteBackup,
  acceptBackup,
  removeBackup,
  deleteAccount,
} from "../packages/server/account";
import { tick, maintenance, receipt } from "../packages/server/worker";
import {
  SimulationProvider,
  type Provider,
  type SendInput,
  type SendResult,
} from "../packages/server/providers";
import { whatsappWebhook, smsWebhook } from "../packages/server/webhooks";
import {
  startLogin,
  finishLogin,
  actor,
  staff,
  logout,
  type Actor,
} from "../packages/server/auth";
import {
  createTenant,
  addMembership,
  allocateTag,
  siteIncidents,
} from "../packages/server/admin";
import { handle } from "../packages/server/http";
import { normalizeTagInput } from "../packages/shared/tag-input";
before(setup);
after(async () => {
  await pool().end();
});
const phone = () => "+920" + String(randomInt(100000000, 999999999));
async function user(): Promise<Actor> {
  const uid = id(),
    p = phone();
  await rows(
    "INSERT INTO app_user(id,phone_hash,phone_cipher,whatsapp,sms) VALUES($1,$2,$3,true,true)",
    [uid, hash(p, "phone"), encrypt(p)],
  );
  return { id: uid, role: "admin", mfa: true };
}
async function fixture(claim = true) {
  const owner = await user(),
    v = await createVehicle(owner, "Test vehicle", "Silver"),
    batch = await createBatch(owner, 1),
    tag = batch.tags[0];
  if (claim) await claimTag(owner, tag.token, tag.claimSecret, v.id);
  return { owner, v, tag };
}
async function incident(f: Awaited<ReturnType<typeof fixture>>) {
  const scanner = token();
  const i = await createIncident(f.tag.token, scanner, token(), token(), {
    reason: "blocked_access",
  });
  return { ...i, scanner };
}
class Spy implements Provider {
  calls: SendInput[] = [];
  constructor(private result?: SendResult) {}
  async send(i: SendInput): Promise<SendResult> {
    this.calls.push(i);
    return this.result ?? { state: "ACCEPTED", providerId: "test_" + i.id };
  }
}
async function isolateQueue() {
  await rows(
    "UPDATE delivery SET state='CANCELLED' WHERE state IN ('QUEUED','SUBMITTING')",
  );
}
const reject = (promise: Promise<unknown>, code: string) =>
  assert.rejects(
    promise,
    (e: unknown) => e instanceof Error && e.message === code,
  );
function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookies = "",
  extra: Record<string, string> = {},
) {
  return new Request("http://localhost:3000/api/" + path, {
    method,
    headers: {
      origin: "http://localhost:3000",
      "Content-Type": "application/json",
      cookie: cookies,
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("configuration fails closed for production simulation and non-loopback local deployment", () => {
  process.env.APP_ENV = "production";
  assert.throws(config);
  process.env.APP_ENV = "test";
  process.env.APP_ORIGIN = "https://example.com";
  assert.throws(config);
  process.env.APP_ORIGIN = "http://localhost:3000";
});
test("AES-GCM encryption is randomized and authenticates ciphertext", () => {
  const p = phone(),
    x = encrypt(p),
    y = encrypt(p);
  assert.notEqual(x, y);
  assert.equal(decrypt(x), p);
  assert.throws(() => decrypt(x.slice(0, -6) + "AAAAAA"));
});
test("T01/T02/T09: public DTO is allowlisted; GET never enqueues a send; unavailable states are uniform", async () => {
  const f = await fixture();
  const before = await one("SELECT count(*) count FROM delivery");
  const dto = await publicTag(f.tag.token);
  assert.deepEqual(Object.keys(dto).sort(), [
    "available",
    "descriptor",
    "locale",
    "reasons",
  ]);
  assert.equal(
    (await one("SELECT count(*) count FROM delivery"))!.count,
    before!.count,
  );
  const unavailable = await publicTag(token());
  await changeTag(f.owner, f.tag.id, "pause");
  assert.deepEqual(await publicTag(f.tag.token), unavailable);
  assert.ok(!JSON.stringify(dto).includes(f.owner.id));
  assert.ok(!JSON.stringify(dto).includes(f.tag.claimSecret));
});
test("T03: simultaneous claim attempts have one winner", async () => {
  const f = await fixture(false),
    other = await user(),
    v2 = await createVehicle(other, "Other", "White");
  const result = await Promise.allSettled([
    claimTag(f.owner, f.tag.token, f.tag.claimSecret, f.v.id),
    claimTag(other, f.tag.token, f.tag.claimSecret, v2.id),
  ]);
  assert.equal(result.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(result.filter((x) => x.status === "rejected").length, 1);
});
test("T04/T05: public token cannot activate a tag; vehicle ownership is enforced", async () => {
  const f = await fixture(false),
    other = await user();
  await reject(
    claimTag(f.owner, f.tag.token, f.tag.token, f.v.id),
    "claim_unavailable",
  );
  await reject(
    claimTag(other, f.tag.token, f.tag.claimSecret, f.v.id),
    "vehicle_not_found",
  );
  await reject(ownTag(other, f.tag.id), "tag_not_found");
});
test("F03: normalized URL claims once and invalid pairs retain the generic failure", async () => {
  const f = await fixture(false);
  const parsed = normalizeTagInput(
    ` http://localhost:3000/q/${f.tag.token}?print=1#qr `,
    "http://localhost:3000",
  );
  await reject(claimTag(f.owner, parsed, token(), f.v.id), "claim_unavailable");
  await claimTag(f.owner, parsed, f.tag.claimSecret, f.v.id);
  await reject(
    claimTag(f.owner, parsed, f.tag.claimSecret, f.v.id),
    "claim_unavailable",
  );
  assert.equal((await ownTag(f.owner, f.tag.id)).state, "active");
});
test("T07/T08: concurrent idempotent retries create one incident and one dispatch per stage", async () => {
  const f = await fixture(),
    scanner = token(),
    key = token(),
    ip = token();
  const all = await Promise.all(
    Array.from({ length: 10 }, () =>
      createIncident(f.tag.token, scanner, ip, key, { reason: "lights_on" }),
    ),
  );
  assert.equal(new Set(all.map((x) => x.id)).size, 1);
  assert.equal(
    Number(
      (await one("SELECT count(*) n FROM delivery WHERE incident_id=$1", [
        all[0].id,
      ]))!.n,
    ),
    2,
  );
  await reject(
    createIncident(f.tag.token, scanner, ip, key, { reason: "window_open" }),
    "idempotency_conflict",
  );
});
test("T05: another owner or scanner cannot access an incident", async () => {
  const f = await fixture(),
    i = await incident(f),
    other = await user();
  await reject(ownerAction(other, i.id, "coming"), "incident_not_found");
  await reject(publicIncident(i.id, token()), "incident_not_found");
  await reject(scannerAction(i.id, token(), "cancel"), "incident_not_found");
});
test("T14/T15: SMS is scheduled 90 seconds after creation; delivery does not acknowledge", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f),
    p = new Spy();
  const timing = await one(
    "SELECT extract(epoch FROM(d.available_at-i.created_at)) seconds FROM delivery d JOIN incident i ON i.id=d.incident_id WHERE i.id=$1 AND d.stage='fallback'",
    [i.id],
  );
  assert.equal(Number(timing!.seconds), 90);
  await tick(p);
  assert.equal(p.calls.length, 1);
  await transaction((db) => receipt(db, "test_" + p.calls[0].id, "DELIVERED"));
  assert.equal((await publicIncident(i.id, i.scanner)).state, "OPEN");
  await rows(
    "UPDATE delivery SET available_at=now() WHERE incident_id=$1 AND stage='fallback'",
    [i.id],
  );
  await tick(p);
  assert.equal(p.calls.length, 2);
  assert.equal(p.calls[1].channel, "sms");
});
test("F02: scanner separates simulated acceptance, live acceptance, delivery and owner response", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f);
  assert.equal((await publicIncident(i.id, i.scanner)).delivery, "PENDING");
  await tick(new SimulationProvider());
  let status = await publicIncident(i.id, i.scanner);
  assert.equal(status.delivery, "SIMULATED");
  assert.equal(status.state, "OPEN");
  await rows(
    "UPDATE delivery SET state='DELIVERED' WHERE incident_id=$1 AND stage='primary'",
    [i.id],
  );
  assert.equal((await publicIncident(i.id, i.scanner)).delivery, "SIMULATED");
  await rows(
    "UPDATE delivery SET state='ACCEPTED',simulated=false WHERE incident_id=$1 AND stage='primary'",
    [i.id],
  );
  assert.equal((await publicIncident(i.id, i.scanner)).delivery, "ACCEPTED");
  await rows(
    "UPDATE delivery SET state='DELIVERED' WHERE incident_id=$1 AND stage='primary'",
    [i.id],
  );
  status = await publicIncident(i.id, i.scanner);
  assert.equal(status.delivery, "CONFIRMED");
  assert.equal(status.state, "OPEN");
  await ownerAction(f.owner, i.id, "coming");
  status = await publicIncident(i.id, i.scanner);
  assert.equal(status.state, "ACKNOWLEDGED");
  assert.equal(status.delivery, "CONFIRMED");
  assert.deepEqual(Object.keys(status).sort(), [
    "delivery",
    "expiresAt",
    "id",
    "response",
    "state",
  ]);
});
test("T16: acknowledgement suppresses queued fallback", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f),
    p = new Spy();
  await tick(p);
  await ownerAction(f.owner, i.id, "coming");
  await rows("UPDATE delivery SET available_at=now() WHERE incident_id=$1", [
    i.id,
  ]);
  await tick(p);
  assert.equal(p.calls.length, 1);
  assert.equal((await publicIncident(i.id, i.scanner)).state, "ACKNOWLEDGED");
});
test("F04: failed dispatch does not refresh the successful worker heartbeat", async () => {
  await isolateQueue();
  const f = await fixture();
  await incident(f);
  await rows(
    "INSERT INTO worker_health(name,heartbeat_at) VALUES('dispatcher','2000-01-01T00:00:00Z') ON CONFLICT(name) DO UPDATE SET heartbeat_at='2000-01-01T00:00:00Z'",
  );
  await assert.rejects(
    tick({
      send: async () => {
        throw new Error("test transport failed");
      },
    }),
  );
  assert.equal(
    new Date(
      (await one(
        "SELECT heartbeat_at FROM worker_health WHERE name='dispatcher'",
      ))!.heartbeat_at,
    ).getUTCFullYear(),
    2000,
  );
  await tick(new SimulationProvider());
  assert.ok(
    new Date(
      (await one(
        "SELECT heartbeat_at FROM worker_health WHERE name='dispatcher'",
      ))!.heartbeat_at,
    ).getTime() >
      Date.now() - 10000,
  );
});
test("F07: repeated owner responses and concurrent resolution cannot reopen or duplicate dispatch", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f),
    p = new Spy();
  await tick(p);
  await Promise.all([
    ownerAction(f.owner, i.id, "coming"),
    ownerAction(f.owner, i.id, "coming"),
  ]);
  assert.equal((await publicIncident(i.id, i.scanner)).state, "ACKNOWLEDGED");
  await Promise.allSettled([
    ownerAction(f.owner, i.id, "unavailable"),
    ownerAction(f.owner, i.id, "resolve"),
  ]);
  assert.equal((await publicIncident(i.id, i.scanner)).state, "RESOLVED");
  await reject(ownerAction(f.owner, i.id, "coming"), "incident_closed");
  await tick(p);
  assert.equal(p.calls.length, 1);
});
test("T21: revoked consent suppresses dispatch", async () => {
  await isolateQueue();
  const f = await fixture();
  await incident(f);
  await preferences(f.owner, {
    whatsapp: false,
    sms: false,
    dnd: false,
    locale: "en",
  });
  const p = new Spy();
  await tick(p);
  assert.equal(p.calls.length, 0);
});
test("T21: paused tag suppresses queued dispatch", async () => {
  await isolateQueue();
  const f = await fixture();
  await incident(f);
  await changeTag(f.owner, f.tag.id, "pause");
  const p = new Spy();
  await tick(p);
  assert.equal(p.calls.length, 0);
});
test("hard WhatsApp rejection accelerates the single SMS fallback", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f),
    p = new Spy({ state: "FAILED", safeCode: "provider_rejected" });
  await tick(p);
  const fallback = await one(
    "SELECT available_at FROM delivery WHERE incident_id=$1 AND stage='fallback'",
    [i.id],
  );
  assert.ok(fallback!.available_at <= new Date());
  await tick(p);
  assert.equal(p.calls.length, 2);
});
test("T11: uncertain submissions are not blindly retried", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f),
    p = new Spy({ state: "UNKNOWN", safeCode: "timeout" });
  await tick(p);
  await tick(p);
  await tick(p);
  assert.equal(p.calls.length, 1);
  assert.equal(
    (await one(
      "SELECT state FROM delivery WHERE incident_id=$1 AND stage='primary'",
      [i.id],
    ))!.state,
    "UNKNOWN",
  );
});
test("T10: expired submitting lease becomes UNKNOWN without duplicate send", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f);
  await rows(
    "UPDATE delivery SET state='SUBMITTING',lease_until=now()-interval '1 second' WHERE incident_id=$1 AND stage='primary'",
    [i.id],
  );
  const p = new Spy();
  await tick(p);
  assert.equal(p.calls.length, 0);
  assert.equal(
    (await one(
      "SELECT state FROM delivery WHERE incident_id=$1 AND stage='primary'",
      [i.id],
    ))!.state,
    "UNKNOWN",
  );
});
test("T12/T13: signed webhooks deduplicate and cannot regress delivery or acknowledgement", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f),
    p = new Spy();
  await tick(p);
  await ownerAction(f.owner, i.id, "coming");
  const raw = JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [{ id: "test_" + p.calls[0].id, status: "read" }],
            },
          },
        ],
      },
    ],
  });
  const sig =
    "sha256=" +
    createHmac("sha256", process.env.META_APP_SECRET!)
      .update(raw)
      .digest("hex");
  await reject(whatsappWebhook(raw, "invalid"), "invalid_signature");
  await whatsappWebhook(raw, sig);
  await whatsappWebhook(raw, sig);
  await transaction((db) => receipt(db, "test_" + p.calls[0].id, "DELIVERED"));
  await transaction((db) => receipt(db, "test_" + p.calls[0].id, "FAILED"));
  assert.equal(
    (await one("SELECT state FROM delivery WHERE id=$1", [p.calls[0].id]))!
      .state,
    "READ",
  );
  assert.equal((await publicIncident(i.id, i.scanner)).state, "ACKNOWLEDGED");
});
test("SMS webhook checks signed timestamp and duplicate event IDs", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f);
  const d = await one(
    "SELECT id FROM delivery WHERE incident_id=$1 AND stage='fallback'",
    [i.id],
  );
  await rows("UPDATE delivery SET state='UNKNOWN' WHERE id=$1", [d!.id]);
  const raw = JSON.stringify({
      id: "sms_" + d!.id,
      eventId: token(),
      state: "DELIVERED",
      reference: d!.id,
    }),
    timestamp = String(Math.floor(Date.now() / 1000)),
    sig = createHmac("sha256", process.env.SMS_WEBHOOK_SECRET!)
      .update(timestamp + "." + raw)
      .digest("hex");
  await smsWebhook(raw, sig, timestamp);
  await smsWebhook(raw, sig, timestamp);
  assert.equal(
    (await one("SELECT state FROM delivery WHERE id=$1", [d!.id]))!.state,
    "DELIVERED",
  );
  await reject(smsWebhook(raw, sig, "0"), "invalid_timestamp");
});
test("T20: only an accepted, independently consented backup is queued; withdrawal suppresses it", async () => {
  await isolateQueue();
  const f = await fixture(),
    backup = await user();
  const invite = await inviteBackup(f.owner, f.v.id);
  const first = await incident(f);
  assert.equal(
    Number(
      (await one(
        "SELECT count(*) n FROM delivery WHERE incident_id=$1 AND stage='backup'",
        [first.id],
      ))!.n,
    ),
    0,
  );
  await preferences(backup, {
    whatsapp: false,
    sms: false,
    dnd: false,
    locale: "en",
  });
  await reject(
    acceptBackup(backup, invite.inviteUrl.split("#")[1]),
    "sms_consent_required",
  );
  await preferences(backup, {
    whatsapp: false,
    sms: true,
    dnd: false,
    locale: "en",
  });
  await acceptBackup(backup, invite.inviteUrl.split("#")[1]);
  const second = await incident(f);
  assert.equal(
    Number(
      (await one(
        "SELECT count(*) n FROM delivery WHERE incident_id=$1 AND stage='backup'",
        [second.id],
      ))!.n,
    ),
    1,
  );
  await removeBackup(backup, f.v.id);
  await rows("UPDATE delivery SET state='CANCELLED' WHERE stage<>'backup'");
  await rows("UPDATE delivery SET available_at=now() WHERE stage='backup'");
  const p = new Spy();
  await tick(p);
  assert.equal(p.calls.length, 0);
});
test("T23: per-tag submission cap applies across independent scanners", async () => {
  const f = await fixture();
  for (let n = 0; n < 3; n++) await incident(f);
  await reject(incident(f), "rate_limited");
});
test("T23: daily platform budget caps actual dispatch reservations", async () => {
  await isolateQueue();
  await rows("DELETE FROM message_budget");
  process.env.DAILY_MESSAGE_LIMIT = "1";
  try {
    for (let n = 0; n < 2; n++) await incident(await fixture());
    const p = new Spy();
    await Promise.all([tick(p), tick(p), tick(p)]);
    assert.equal(p.calls.length, 1);
  } finally {
    process.env.DAILY_MESSAGE_LIMIT = "10000";
  }
});
test("T26: transfer cancels stale incidents and rotates activation secret", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f),
    other = await user(),
    v = await createVehicle(other, "New owner", "White");
  const transfer = await changeTag(f.owner, f.tag.id, "transfer");
  await reject(
    claimTag(other, f.tag.token, f.tag.claimSecret, v.id),
    "claim_unavailable",
  );
  await claimTag(other, transfer.token!, transfer.claimSecret!, v.id);
  assert.equal((await publicIncident(i.id, i.scanner)).state, "CANCELLED");
  await reject(ownTag(f.owner, f.tag.id), "tag_not_found");
  const p = new Spy();
  await tick(p);
  assert.equal(p.calls.length, 0);
});
test("T06: site summaries require membership and never include contact data", async () => {
  const f = await fixture(false),
    site = await createTenant(f.owner, "Test site"),
    other = await user();
  await allocateTag(f.owner, f.tag.id, site.id);
  await claimTag(f.owner, f.tag.token, f.tag.claimSecret, f.v.id);
  await incident(f);
  await addMembership(f.owner, site.id, f.owner.id, "staff");
  await reject(siteIncidents(other, site.id), "site_not_found");
  const result = await siteIncidents(f.owner, site.id);
  assert.deepEqual(Object.keys(result[0]).sort(), [
    "created_at",
    "id",
    "reason",
    "state",
  ]);
});
test("OTP guesses are bounded, single-use, and sessions revoke on logout", async () => {
  const p = phone(),
    s = await startLogin(p, token());
  for (let n = 0; n < 5; n++)
    await reject(
      finishLogin(
        { phone: p, code: "000000", challengeId: s.challengeId },
        token(),
      ),
      "invalid_code",
    );
  await reject(
    finishLogin(
      { phone: p, code: s.demoCode!, challengeId: s.challengeId },
      token(),
    ),
    "invalid_code",
  );
  const p2 = phone(),
    s2 = await startLogin(p2, token());
  const results = await Promise.allSettled([
    finishLogin(
      { phone: p2, code: s2.demoCode!, challengeId: s2.challengeId },
      token(),
    ),
    finishLogin(
      { phone: p2, code: s2.demoCode!, challengeId: s2.challengeId },
      token(),
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const ok = results.find(
    (r) => r.status === "fulfilled",
  ) as PromiseFulfilledResult<{ credential: string }>;
  assert.ok((await actor(ok.value.credential)).id);
  await logout(ok.value.credential);
  await reject(actor(ok.value.credential), "sign_in_required");
});
test("admin requires both role and MFA", () => {
  assert.throws(() => staff({ id: id(), role: "owner", mfa: true }));
  assert.throws(() => staff({ id: id(), role: "admin", mfa: false }));
});
test("HTTP boundary rejects CSRF, extra fields, unowned status, and anonymous admin access", async () => {
  assert.equal(
    (
      await handle(
        request("auth/start", "POST", { phone: phone() }, "", {
          origin: "https://evil.invalid",
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handle(
        request("auth/start", "POST", { phone: phone(), role: "admin" }),
      )
    ).status,
    400,
  );
  assert.equal((await handle(request("admin/overview"))).status, 401);
  const f = await fixture();
  const before = await one("SELECT count(*) n FROM delivery");
  assert.equal(
    (await handle(request("public/tags/" + f.tag.token))).status,
    200,
  );
  assert.equal((await one("SELECT count(*) n FROM delivery"))!.n, before!.n);
});
test("HTTP complete local journey creates a real alert and authenticates the owner", async () => {
  await isolateQueue();
  const p = phone();
  const start = await (
    await handle(request("auth/start", "POST", { phone: p }))
  ).json();
  const verified = await handle(
    request("auth/verify", "POST", {
      phone: p,
      code: start.demoCode,
      challengeId: start.challengeId,
    }),
  );
  assert.equal(verified.status, 200);
  const session = verified.headers.get("set-cookie")!.split(";")[0];
  assert.ok(verified.headers.get("set-cookie")!.includes("HttpOnly"));
  const dash = await (
    await handle(request("owner/dashboard", "GET", undefined, session))
  ).json();
  assert.equal(
    (
      await handle(
        request(
          "owner/preferences",
          "POST",
          { whatsapp: true, sms: true, dnd: false, locale: "en" },
          session,
        ),
      )
    ).status,
    200,
  );
  const v = await (
    await handle(
      request(
        "owner/vehicles",
        "POST",
        { make: "Test", color: "White" },
        session,
      ),
    )
  ).json();
  // Provision only this disposable test account, then exercise the actual staff MFA gate.
  await rows("UPDATE app_user SET role='admin' WHERE id=$1", [dash.user.id]);
  assert.equal(
    (await handle(request("admin/overview", "GET", undefined, session))).status,
    403,
  );
  assert.equal(
    (await handle(request("mfa/verify", "POST", {}, session))).status,
    200,
  );
  const batchResponse = await handle(
    request("admin/batches", "POST", { quantity: 1 }, session),
  );
  assert.equal(batchResponse.status, 201);
  const t = (await batchResponse.json()).tags[0];
  assert.equal(
    (
      await handle(
        request(
          "owner/tags/claim",
          "POST",
          { vehicleId: v.id, token: t.token, claimSecret: t.claimSecret },
          session,
        ),
      )
    ).status,
    200,
  );
  const sc = await handle(request("session", "POST", {}));
  const scanner = sc.headers.get("set-cookie")!.split(";")[0];
  const incidentResult = await handle(
    request(
      "public/tags/" + t.token + "/incidents",
      "POST",
      { reason: "window_open" },
      scanner,
      { "Idempotency-Key": token() },
    ),
  );
  assert.equal(incidentResult.status, 201);
  const i = await incidentResult.json();
  await tick(new SimulationProvider());
  const simulated = await (
    await handle(request("public/incidents/" + i.id, "GET", undefined, scanner))
  ).json();
  assert.equal(simulated.delivery, "SIMULATED");
  const qr = await (
    await handle(
      request("owner/tags/" + t.id + "/sticker", "GET", undefined, session),
    )
  ).json();
  assert.ok(qr.svg.includes("<svg"));
  assert.ok(!qr.svg.includes(p));
  assert.equal(
    (
      await handle(
        request(
          "owner/incidents/" + i.id,
          "POST",
          { action: "coming" },
          session,
        ),
      )
    ).status,
    200,
  );
  const progress = await (
    await handle(request("public/incidents/" + i.id, "GET", undefined, scanner))
  ).json();
  assert.equal(progress.state, "ACKNOWLEDGED");
  assert.ok(!JSON.stringify(progress).includes(p));
  assert.ok(!JSON.stringify(progress).includes(dash.user.id));
  assert.equal(
    (
      await handle(
        request("public/incidents/" + i.id + "/resolve", "POST", {}, scanner),
      )
    ).status,
    200,
  );
  const resolved = await (
    await handle(request("public/incidents/" + i.id, "GET", undefined, scanner))
  ).json();
  assert.equal(resolved.state, "RESOLVED");
  const audit = await rows("SELECT action FROM audit_log WHERE target_id=$1", [
    i.id,
  ]);
  for (const action of ["incident_created", "owner_coming", "scanner_resolve"])
    assert.ok(audit.some((x) => x.action === action));
  assert.equal(
    (
      await handle(
        request("public/incidents/" + i.id + "/report", "POST", {}, scanner),
      )
    ).status,
    200,
  );
  const report = await one(
    "SELECT id,state FROM abuse_report WHERE incident_id=$1",
    [i.id],
  );
  assert.equal(report!.state, "open");
  assert.equal(
    (await handle(request("admin/reports/" + report!.id, "POST", {}, session)))
      .status,
    200,
  );
  assert.equal(
    (await one("SELECT state FROM abuse_report WHERE id=$1", [report!.id]))!
      .state,
    "reviewed",
  );
  assert.ok(
    await one(
      "SELECT 1 FROM audit_log WHERE target_id=$1 AND action='report_reviewed'",
      [report!.id],
    ),
  );
});
test("T32: expiry suppresses sends and retention clears location and old incidents", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f);
  await rows(
    "UPDATE incident SET expires_at=now()-interval '1 second',created_at=now()-interval '2 days',location=$2 WHERE id=$1",
    [i.id, { latitude: 0, longitude: 0, accuracy: 1 }],
  );
  await maintenance();
  const current = await one("SELECT state,location FROM incident WHERE id=$1", [
    i.id,
  ]);
  assert.equal(current!.state, "EXPIRED");
  assert.equal(current!.location, null);
  await rows(
    "UPDATE incident SET created_at=now()-interval '31 days' WHERE id=$1",
    [i.id],
  );
  await maintenance();
  assert.equal(
    await one("SELECT id FROM incident WHERE id=$1", [i.id]),
    undefined,
  );
});
test("account deletion removes contact ciphertext and disables queued sends", async () => {
  await isolateQueue();
  const f = await fixture();
  await incident(f);
  await deleteAccount(f.owner);
  const u = await one(
    "SELECT disabled,phone_cipher FROM app_user WHERE id=$1",
    [f.owner.id],
  );
  assert.equal(u!.disabled, true);
  assert.equal(u!.phone_cipher, null);
  const p = new Spy();
  await tick(p);
  assert.equal(p.calls.length, 0);
});
test("T35: 100 concurrent incident submissions are retained without duplicate logical sends", async () => {
  await isolateQueue();
  const fixtures = await Promise.all(
    Array.from({ length: 100 }, () => fixture()),
  );
  const started = performance.now();
  const incidents = await Promise.all(fixtures.map((f) => incident(f)));
  assert.equal(new Set(incidents.map((x) => x.id)).size, 100);
  assert.equal(
    Number(
      (await one("SELECT count(*) n FROM delivery WHERE state='QUEUED'"))!.n,
    ),
    200,
  );
  const p = new Spy();
  await Promise.all(Array.from({ length: 100 }, () => tick(p)));
  assert.equal(p.calls.length, 100);
  assert.equal(new Set(p.calls.map((x) => x.id)).size, 100);
  console.log(
    "100-incident acceptance duration ms:",
    Math.round(performance.now() - started),
    "backend:",
    process.env.TEST_DATABASE_URL
      ? "PostgreSQL"
      : "PGlite (serialized connections)",
  );
});

test("transfer preserves the original vehicle descriptor in the old owner history", async () => {
  const { ownerDashboard } = await import("../packages/server/incidents");
  const f = await fixture(),
    i = await incident(f),
    next = await user(),
    v = await createVehicle(next, "Private new description", "Blue");
  const transfer = await changeTag(f.owner, f.tag.id, "transfer");
  await claimTag(next, transfer.token!, transfer.claimSecret!, v.id);
  const history = await ownerDashboard(f.owner),
    record = history.incidents.find((x) => x.id === i.id);
  assert.equal(record!.make, "Silver Test vehicle");
  assert.ok(
    !JSON.stringify(history.incidents).includes("Private new description"),
  );
});

test("a provider receipt arriving before send returns cannot be overwritten", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f);
  const p: Provider = {
    async send(input) {
      await transaction((db) =>
        receipt(db, "early_" + input.id, "READ", input.id),
      );
      return { state: "ACCEPTED", providerId: "early_" + input.id };
    },
  };
  await tick(p);
  assert.equal(
    (await one(
      "SELECT state FROM delivery WHERE incident_id=$1 AND stage='primary'",
      [i.id],
    ))!.state,
    "READ",
  );
});

test("an acknowledgement during a provider request preserves the response and suppresses later stages", async () => {
  await isolateQueue();
  const f = await fixture(),
    i = await incident(f);
  let calls = 0;
  const p: Provider = {
    async send(input) {
      calls++;
      await ownerAction(f.owner, i.id, "coming");
      return { state: "ACCEPTED", providerId: "race_" + input.id };
    },
  };
  await tick(p);
  await rows("UPDATE delivery SET available_at=now() WHERE incident_id=$1", [
    i.id,
  ]);
  await tick(p);
  assert.equal(calls, 1);
  assert.equal((await publicIncident(i.id, i.scanner)).state, "ACKNOWLEDGED");
});

function liveFixture() {
  const names = [
    "PROVIDER_MODE",
    "META_GRAPH_VERSION",
    "META_PHONE_NUMBER_ID",
    "META_ACCESS_TOKEN",
    "META_VERIFY_TOKEN",
    "META_TEMPLATE_NAME",
    "SMS_GATEWAY_URL",
    "SMS_API_KEY",
    "TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
  ];
  const previous = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  Object.assign(process.env, {
    PROVIDER_MODE: "live",
    META_GRAPH_VERSION: "v99.0",
    META_PHONE_NUMBER_ID: "test-sender",
    META_ACCESS_TOKEN: token(),
    META_VERIFY_TOKEN: token(),
    META_TEMPLATE_NAME: "test_alert",
    SMS_GATEWAY_URL: "https://sms.example.invalid/send",
    SMS_API_KEY: token(),
    TURNSTILE_SITE_KEY: token(),
    TURNSTILE_SECRET_KEY: token(),
  });
  return () => {
    for (const n of names) {
      if (previous[n] === undefined) delete process.env[n];
      else process.env[n] = previous[n];
    }
  };
}

test("live adapters construct official-template and contracted-gateway requests with mock transport", async () => {
  const { LiveProvider } = await import("../packages/server/providers");
  const restore = liveFixture(),
    original = globalThis.fetch,
    calls: {
      url: string;
      body: Record<string, unknown>;
      key: string | null;
    }[] = [];
  try {
    globalThis.fetch = async (input, init) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(init?.body)),
        key: new Headers(init?.headers).get("Idempotency-Key"),
      });
      return Response.json(
        calls.length === 1
          ? { messages: [{ id: "meta_test" }] }
          : { id: "sms_test" },
      );
    };
    const p = new LiveProvider(),
      input: SendInput = {
        id: id(),
        channel: "whatsapp",
        destination: phone(),
        reason: "lights_on",
        reference: "test-ref",
      };
    assert.equal((await p.send(input)).state, "ACCEPTED");
    await p.send({ ...input, channel: "sms" });
    assert.ok(calls[0].url.startsWith("https://graph.facebook.com/"));
    assert.equal(calls[0].body.messaging_product, "whatsapp");
    assert.equal(calls[0].body.biz_opaque_callback_data, input.id);
    assert.equal(calls[1].key, input.id);
    assert.ok(String(calls[1].body.text).includes("Your lights are on"));
    assert.ok(String(calls[1].body.text).includes("test-ref"));
  } finally {
    globalThis.fetch = original;
    restore();
  }
});

test("live adapter treats timeout, 5xx and malformed acceptance as uncertain", async () => {
  const { LiveProvider } = await import("../packages/server/providers");
  const restore = liveFixture(),
    original = globalThis.fetch;
  try {
    const p = new LiveProvider(),
      input: SendInput = {
        id: id(),
        channel: "sms",
        destination: phone(),
        reason: "window_open",
        reference: "test-ref",
      };
    globalThis.fetch = async () => new Response("", { status: 503 });
    assert.equal((await p.send(input)).state, "UNKNOWN");
    globalThis.fetch = async () => {
      throw new Error("timeout");
    };
    assert.equal((await p.send(input)).state, "UNKNOWN");
    globalThis.fetch = async () => Response.json({ unexpected: true });
    assert.equal((await p.send(input)).state, "UNKNOWN");
    globalThis.fetch = async () => new Response("", { status: 400 });
    assert.equal((await p.send(input)).state, "FAILED");
  } finally {
    globalThis.fetch = original;
    restore();
  }
});

test("live challenge verifies the hostname and fails closed on invalid or unavailable responses", async () => {
  const { verifyChallenge } = await import("../packages/server/challenge");
  const restore = liveFixture(),
    original = globalThis.fetch;
  try {
    await reject(verifyChallenge(), "challenge_required");
    globalThis.fetch = async () =>
      Response.json({ success: true, hostname: "wrong.invalid" });
    await reject(verifyChallenge(token()), "challenge_failed");
    globalThis.fetch = async () =>
      Response.json({ success: true, hostname: "localhost" });
    await verifyChallenge(token());
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    await reject(verifyChallenge(token()), "challenge_unavailable");
  } finally {
    globalThis.fetch = original;
    restore();
  }
});
