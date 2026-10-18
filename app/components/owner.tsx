"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Challenge from "../challenge";
import { labels, type Reason } from "@/packages/shared/contracts";
import {
  api,
  useResource,
  useTask,
  submit,
  Car,
  Badge,
  Load,
  Empty,
  type Mode,
  type Vehicle,
  type Tag,
  type Incident,
  type Dashboard,
  type PublicState,
} from "./common";
import { Admin, Site } from "./admin";
export function Workspace({
  page,
  path,
  mode,
}: {
  page: string;
  path: string[];
  mode?: Mode;
}) {
  const state = useResource<Dashboard>("owner/dashboard");
  const d = state.data;
  return (
    <main className="wrap">
      <div className="workspace">
        <aside className="sidebar" aria-label="Owner navigation">
          {[
            ["dashboard", "Overview"],
            ["vehicles", "Cars & stickers"],
            ["settings", "Settings"],
            ["backup", "Backup invitations"],
          ].map(([p, l]) => (
            <a key={p} href={"/" + p} className={page === p ? "active" : ""}>
              {l}
            </a>
          ))}
          {d?.user.role !== "owner" && d && (
            <a href="/admin" className={page === "admin" ? "active" : ""}>
              Administration
            </a>
          )}
          {d?.sites.map((s) => (
            <a key={s.id} href={"/site/" + s.id}>
              {s.name}
            </a>
          ))}
        </aside>
        <div className="content">
          {!d ? (
            <Load error={state.error} />
          ) : page === "dashboard" ? (
            <Overview d={d} refresh={state.refresh} />
          ) : page === "vehicles" ? (
            <Vehicles d={d} refresh={state.refresh} />
          ) : page === "settings" ? (
            <Settings d={d} refresh={state.refresh} />
          ) : page === "admin" ? (
            <Admin d={d} refresh={state.refresh} mode={mode} />
          ) : page === "site" ? (
            <Site tenantId={path[1]} />
          ) : (
            <Backup />
          )}
        </div>
      </div>
    </main>
  );
}
function Overview({
  d,
  refresh,
}: {
  d: Dashboard;
  refresh: () => Promise<void>;
}) {
  const task = useTask();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 7000);
    return () => clearInterval(timer);
  }, [refresh]);
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Your owner area</span>
        <div className="split">
          <h1>A little more connected.</h1>
          <a className="button" href="/vehicles">
            Add a car ↗
          </a>
        </div>
        <p>Manage your cars and respond to the people looking out for them.</p>
      </div>
      <div className="grid">
        {[
          ["Your cars", d.vehicles.length],
          [
            "Active stickers",
            d.tags.filter((t) => t.state === "active").length,
          ],
          [
            "Open requests",
            d.incidents.filter((i) => i.state === "OPEN").length,
          ],
        ].map(([l, n]) => (
          <div className="card" key={l}>
            <small>{l}</small>
            <div className="stat">{n}</div>
          </div>
        ))}
      </div>
      {!d.user.whatsapp && !d.user.sms && (
        <div className="note warning message">
          You have not opted into alerts yet.{" "}
          <a href="/settings" className="text-link">
            Choose your channels in Settings.
          </a>
        </div>
      )}
      {task.notice}
      <section className="section">
        <div className="split">
          <h2>Your recent requests</h2>
          <button className="secondary" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
        <div className="stack">
          {!d.incidents.length ? (
            <Empty title="Nothing needs your attention">
              Your incoming vehicle alerts will appear here.
            </Empty>
          ) : (
            d.incidents.map((i) => (
              <article className="card" key={i.id}>
                <div className="split">
                  <div>
                    <h3>{labels.en[i.reason]}</h3>
                    <small>
                      {i.color} {i.make} ·{" "}
                      {new Date(i.created_at).toLocaleString("en-PK", {
                        timeZone: "Asia/Karachi",
                      })}{" "}
                      PKT · {i.id.slice(0, 8)}
                    </small>
                  </div>
                  <Badge value={i.state} />
                </div>
                {i.location && (
                  <p className="small">
                    Shared location:{" "}
                    <a
                      className="text-link"
                      target="_blank"
                      rel="noreferrer"
                      href={
                        "https://www.openstreetmap.org/?mlat=" +
                        i.location.latitude +
                        "&mlon=" +
                        i.location.longitude +
                        "#map=17/" +
                        i.location.latitude +
                        "/" +
                        i.location.longitude
                      }
                    >
                      Open map
                    </a>{" "}
                    · accuracy about {Math.round(i.location.accuracy)} m
                  </p>
                )}
                {["OPEN", "ACKNOWLEDGED"].includes(i.state) &&
                  new Date(i.expires_at) > new Date() && (
                    <div className="actions" style={{ marginTop: 20 }}>
                      {[
                        ["coming", "I’m coming"],
                        ["unavailable", "Cannot attend"],
                        ["resolve", "Mark resolved"],
                        ["report_abuse", "Block & report"],
                      ].map(([action, l]) => (
                        <button
                          key={action}
                          disabled={task.busy}
                          className={
                            action === "coming"
                              ? ""
                              : action === "report_abuse"
                                ? "danger"
                                : "secondary"
                          }
                          onClick={() =>
                            void task.run(async () => {
                              await api("owner/incidents/" + i.id, { action });
                              await refresh();
                            })
                          }
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
function Vehicles({
  d,
  refresh,
}: {
  d: Dashboard;
  refresh: () => Promise<void>;
}) {
  const task = useTask();
  const [make, setMake] = useState(""),
    [color, setColor] = useState(""),
    [vehicleId, setVehicle] = useState(d.vehicles[0]?.id ?? ""),
    [raw, setRaw] = useState(""),
    [secret, setSecret] = useState(""),
    [stickerData, setSticker] = useState<{
      url: string;
      svg: string;
      state: string;
    }>(),
    [transfer, setTransfer] = useState<{
      token: string;
      claimSecret: string;
    }>(),
    [invite, setInvite] = useState("");
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Your cars, your control</span>
        <h1>Cars & stickers.</h1>
        <p>
          Activate a sticker, download its QR, or pause contact whenever you
          need to.
        </p>
      </div>
      {task.notice}
      <div className="form-grid">
        <section className="card">
          <h2>Add a car</h2>
          <form
            className="stack"
            onSubmit={submit(
              () =>
                void task.run(async () => {
                  const v = await api<Vehicle>("owner/vehicles", {
                    make,
                    color,
                  });
                  setVehicle(v.id);
                  setMake("");
                  setColor("");
                  await refresh();
                }, "Car added."),
            )}
          >
            <label>
              Make / model
              <input
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
                maxLength={40}
                placeholder="e.g. Toyota Corolla"
              />
            </label>
            <label>
              Color
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                required
                maxLength={25}
                placeholder="e.g. Silver"
              />
            </label>
            <p className="small">
              These two details appear on your public sticker page. Do not enter
              a name, number, or address.
            </p>
            <button disabled={task.busy}>Add car</button>
          </form>
        </section>
        <section className="card">
          <h2>Activate a sticker</h2>
          <form
            className="stack"
            onSubmit={submit(
              () =>
                void task.run(async () => {
                  const tokenValue = raw.includes("/q/")
                    ? raw.split("/q/")[1]
                    : raw;
                  await api("owner/tags/claim", {
                    token: tokenValue,
                    claimSecret: secret,
                    vehicleId,
                  });
                  setRaw("");
                  setSecret("");
                  await refresh();
                }, "Sticker activated."),
            )}
          >
            <label>
              Your car
              <select
                value={vehicleId}
                onChange={(e) => setVehicle(e.target.value)}
                required
              >
                <option value="">Select a car</option>
                {d.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.color} {v.make}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tag code or scan URL
              <input
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                required
                autoComplete="off"
              />
            </label>
            <label>
              Sealed activation secret
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                required
                autoComplete="off"
              />
            </label>
            <button disabled={task.busy || !d.vehicles.length}>
              Activate sticker
            </button>
          </form>
        </section>
      </div>
      <section className="section stack">
        <h2>Your garage</h2>
        {!d.vehicles.length ? (
          <Empty title="Your garage is ready">
            Add your first car using the form above.
          </Empty>
        ) : (
          d.vehicles.map((v) => (
            <article className="card" key={v.id}>
              <div className="split">
                <div className="actions">
                  <div className="vehicle-icon">
                    <Car />
                  </div>
                  <h3 style={{ margin: 0 }}>
                    {v.color} {v.make}
                  </h3>
                </div>
                <button
                  className="secondary"
                  disabled={task.busy}
                  onClick={() =>
                    void task.run(async () => {
                      const r = await api<{ inviteUrl: string }>(
                        "owner/backup/invite",
                        { vehicleId: v.id },
                      );
                      setInvite(r.inviteUrl);
                    })
                  }
                >
                  Invite backup
                </button>
              </div>
              {d.tags
                .filter((t) => t.vehicle_id === v.id)
                .map((t) => (
                  <div key={t.id} style={{ marginTop: 20 }}>
                    <div className="split">
                      <Badge value={t.state} />
                      <div className="actions">
                        <button
                          className="secondary"
                          disabled={task.busy}
                          onClick={() =>
                            void task.run(async () =>
                              setSticker(
                                await api("owner/tags/" + t.id + "/sticker"),
                              ),
                            )
                          }
                        >
                          View QR
                        </button>
                        {t.state !== "revoked" && (
                          <>
                            <button
                              className="secondary"
                              disabled={task.busy}
                              onClick={() =>
                                void task.run(async () => {
                                  await api(
                                    "owner/tags/" +
                                      t.id +
                                      "/" +
                                      (t.state === "paused"
                                        ? "resume"
                                        : "pause"),
                                    {},
                                  );
                                  await refresh();
                                })
                              }
                            >
                              {t.state === "paused" ? "Resume" : "Pause"}
                            </button>
                            <button
                              className="secondary"
                              disabled={task.busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Release this sticker to a new owner? Existing requests will end.",
                                  )
                                )
                                  void task.run(async () => {
                                    setTransfer(
                                      await api(
                                        "owner/tags/" + t.id + "/transfer",
                                        {},
                                      ),
                                    );
                                    await refresh();
                                  });
                              }}
                            >
                              Transfer
                            </button>
                            <button
                              className="danger"
                              disabled={task.busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Permanently revoke this sticker? This cannot be undone.",
                                  )
                                )
                                  void task.run(async () => {
                                    await api(
                                      "owner/tags/" + t.id + "/revoke",
                                      {},
                                    );
                                    await refresh();
                                  });
                              }}
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </article>
          ))
        )}
      </section>
      {stickerData && (
        <section className="card">
          <div className="split">
            <h2>Your printable QR</h2>
            <button className="secondary" onClick={() => setSticker(undefined)}>
              Close
            </button>
          </div>
          <img
            className="qr-output"
            src={"data:image/svg+xml," + encodeURIComponent(stickerData.svg)}
            alt="QR code for your vehicle contact page"
          />
          <p className="code">{stickerData.url}</p>
          <div className="actions">
            <a
              className="button"
              download="qr-car-sticker.svg"
              href={"data:image/svg+xml," + encodeURIComponent(stickerData.svg)}
            >
              Download SVG
            </a>
            <a
              className="button secondary"
              target="_blank"
              rel="noreferrer"
              href={stickerData.url}
            >
              Open scanner page
            </a>
          </div>
          <p className="small" style={{ marginTop: 15 }}>
            Print at least 40 mm wide with the white margin intact. Test through
            the windshield before use. Localhost QR links work only on the
            computer running the app.
          </p>
        </section>
      )}
      {transfer && (
        <section className="card">
          <h2>Transfer credentials</h2>
          <p>
            Give these privately to the new owner. The public sticker cannot
            activate itself.
          </p>
          <label>
            Tag code<div className="code">{transfer.token}</div>
          </label>
          <label>
            New sealed secret<div className="code">{transfer.claimSecret}</div>
          </label>
          <button
            style={{ marginTop: 15 }}
            onClick={() => setTransfer(undefined)}
          >
            I saved these securely
          </button>
        </section>
      )}
      {invite && (
        <section className="card">
          <h2>Backup invitation</h2>
          <p>
            Share this link privately. Your backup must sign in and separately
            consent to SMS alerts.
          </p>
          <p className="code">{invite}</p>
          <button onClick={() => setInvite("")}>Close</button>
        </section>
      )}
    </>
  );
}
function Settings({
  d,
  refresh,
}: {
  d: Dashboard;
  refresh: () => Promise<void>;
}) {
  const task = useTask(),
    router = useRouter();
  const [wa, setWa] = useState(d.user.whatsapp),
    [sms, setSms] = useState(d.user.sms),
    [dnd, setDnd] = useState(d.user.dnd),
    [locale, setLocale] = useState(d.user.locale),
    [quantity, setQuantity] = useState(1);
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">On your terms</span>
        <h1>Settings & privacy.</h1>
      </div>
      {task.notice}
      <div className="stack">
        <section className="card">
          <h2>How we can reach you</h2>
          <p>
            Choose each channel separately. Consent can be withdrawn at any
            time.
          </p>
          <form
            className="stack"
            onSubmit={submit(
              () =>
                void task.run(async () => {
                  await api("owner/preferences", {
                    whatsapp: wa,
                    sms,
                    dnd,
                    locale,
                  });
                  await refresh();
                }, "Preferences saved."),
            )}
          >
            <label className="check-label">
              <input
                type="checkbox"
                checked={wa}
                onChange={(e) => setWa(e.target.checked)}
              />
              I agree to receive vehicle alerts from QR CAR over WhatsApp.
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={sms}
                onChange={(e) => setSms(e.target.checked)}
              />
              I agree to receive vehicle alerts and fallback messages by SMS.
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={dnd}
                onChange={(e) => setDnd(e.target.checked)}
              />
              Pause all vehicle contact (do not disturb).
            </label>
            <label>
              Preferred scanner language
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              >
                <option value="en">English</option>
                <option value="roman">Roman Urdu</option>
                <option value="ur">Urdu</option>
              </select>
            </label>
            <small>
              Consent wording version: 2026-10-18-v1. Urdu text requires a
              fluent reviewer before launch.
            </small>
            <button disabled={task.busy}>Save preferences</button>
          </form>
        </section>
        <section className="card">
          <h2>Request stickers</h2>
          <p>
            Submit a manual order request. No payment is taken here. Pricing and
            fulfilment are confirmed by the pilot operator.
          </p>
          <form
            className="actions"
            onSubmit={submit(
              () =>
                void task.run(async () => {
                  await api("owner/orders", { quantity });
                  await refresh();
                }, "Order request recorded."),
            )}
          >
            <label>
              Quantity
              <input
                type="number"
                min={1}
                max={20}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
            <button disabled={task.busy}>Request stickers</button>
          </form>
          {d.orders.map((o) => (
            <p key={o.id} className="small" style={{ marginTop: 12 }}>
              {o.quantity} sticker(s) · {o.id.slice(0, 8)} · {o.state}
            </p>
          ))}
        </section>
        <section className="card">
          <h2>Your account</h2>
          <p className="small">
            Account reference for support or role assignment:
          </p>
          <p className="code">{d.user.id}</p>
          <div className="actions">
            <button
              className="secondary"
              onClick={() =>
                void task.run(async () => {
                  const data = await api("owner/export");
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "qr-car-account.json";
                  a.click();
                  URL.revokeObjectURL(url);
                })
              }
            >
              Export my data
            </button>
            <button
              className="secondary"
              onClick={() =>
                void task.run(async () => {
                  await api("auth/logout", {});
                  router.push("/");
                })
              }
            >
              Sign out
            </button>
            <button
              className="danger"
              onClick={() => {
                if (
                  window.confirm(
                    "Disable your account, erase your stored contact value, and revoke all stickers?",
                  )
                )
                  void task.run(async () => {
                    await api("owner/delete", { confirm: "DELETE" });
                    router.push("/");
                  });
              }}
            >
              Delete account
            </button>
          </div>
          <p className="small" style={{ marginTop: 16 }}>
            Deletion immediately disables contact. Limited abuse-prevention
            identifiers and existing audit records remain under the documented
            retention policy. Hosted authentication records require operator
            deletion.
          </p>
        </section>
      </div>
    </>
  );
}
function Backup() {
  const [secret, setSecret] = useState("");
  const task = useTask(),
    backups =
      useResource<{ vehicle_id: string; make: string; color: string }[]>(
        "owner/backups",
      );
  useEffect(() => {
    setSecret(window.location.hash.slice(1));
  }, []);
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">A second person, with permission</span>
        <h1>Backup invitations.</h1>
        <p>
          Accept only invitations you recognize. Enable SMS consent in Settings
          first.
        </p>
      </div>
      {task.notice}
      <form
        className="card stack"
        onSubmit={submit(
          () =>
            void task.run(async () => {
              await api("owner/backup/accept", { secret });
              setSecret("");
              window.history.replaceState(null, "", "/backup");
              await backups.refresh();
            }, "Backup invitation accepted."),
        )}
      >
        <label>
          Invitation secret
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <p className="small">
          I agree to be this vehicle’s backup. I may receive one SMS escalation
          when its owner has not acknowledged an alert.
        </p>
        <button disabled={task.busy}>Accept backup invitation</button>
      </form>
      <section className="section stack">
        <h2>Your backup commitments</h2>
        {backups.data?.map((b) => (
          <div className="card split" key={b.vehicle_id}>
            <span>
              {b.color} {b.make}
            </span>
            <button
              className="danger"
              onClick={() =>
                void task.run(async () => {
                  await api("owner/backup/remove", { vehicleId: b.vehicle_id });
                  await backups.refresh();
                }, "Backup consent withdrawn.")
              }
            >
              Withdraw
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
