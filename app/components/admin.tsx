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
type AdminData = {
  counts: {
    tags: string;
    open_incidents: string;
    uncertain: string;
    queued: string;
  };
  worker?: { heartbeat_at: string };
  inventory: { id: string; state: string; tenant_id?: string }[];
  deliveries: {
    id: string;
    incident_id: string;
    channel: string;
    state: string;
    safe_code: string;
  }[];
  reports: { id: string; category: string; state: string }[];
  orders: { id: string; quantity: number; state: string }[];
  audit: { action: string; target_id: string; created_at: string }[];
  tenants: { id: string; name: string }[];
};
export function Admin({
  d,
  refresh,
  mode,
}: {
  d: Dashboard;
  refresh: () => Promise<void>;
  mode?: Mode;
}) {
  const task = useTask();
  const [factor, setFactor] = useState(""),
    [code, setCode] = useState(""),
    [qr, setQr] = useState("");
  if (!d.user.mfa)
    return (
      <>
        <div className="page-head">
          <h1>Staff verification.</h1>
          <p>Admin access requires a staff role and a recent second factor.</p>
        </div>
        <div className="card stack">
          {task.notice}
          {d.user.role === "owner" ? (
            <p>
              This account has no staff permission. The operator assigns staff
              roles through the administration command.
            </p>
          ) : mode?.authSimulation ? (
            <>
              <div className="note warning">
                Local simulation only. This button simulates MFA and cannot run
                in a live environment.
              </div>
              <button
                disabled={task.busy}
                onClick={() =>
                  void task.run(async () => {
                    await api("mfa/simulate", {});
                    await refresh();
                  })
                }
              >
                Simulate staff verification
              </button>
            </>
          ) : (
            <>
              <div className="actions">
                <button
                  disabled={task.busy}
                  onClick={() =>
                    void task.run(async () => {
                      const r = await api<{
                        id: string;
                        totp: { qr_code: string };
                      }>("mfa/enroll", {});
                      setFactor(r.id);
                      setQr(r.totp.qr_code);
                    })
                  }
                >
                  Set up authenticator
                </button>
                <button
                  className="secondary"
                  disabled={task.busy}
                  onClick={() =>
                    void task.run(async () => {
                      const r = await api<{
                        factors: { id: string; status: string }[];
                      }>("mfa/factors", {});
                      const f = r.factors.find((f) => f.status === "verified");
                      if (!f) throw new Error("Set up an authenticator first.");
                      setFactor(f.id);
                    })
                  }
                >
                  Use existing factor
                </button>
              </div>
              {qr && (
                <img
                  className="qr-output"
                  alt="Authenticator setup QR"
                  src={
                    qr.startsWith("data:")
                      ? qr
                      : "data:image/svg+xml," + encodeURIComponent(qr)
                  }
                />
              )}
              <form
                className="stack"
                onSubmit={submit(
                  () =>
                    void task.run(async () => {
                      await api("mfa/verify", { factorId: factor, code });
                      await refresh();
                    }),
                )}
              >
                <label>
                  Authenticator code
                  <input
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    pattern="[0-9]{6}"
                  />
                </label>
                <button disabled={task.busy || !factor}>Verify</button>
              </form>
            </>
          )}
        </div>
      </>
    );
  return <AdminPanel />;
}
function AdminPanel() {
  const data = useResource<AdminData>("admin/overview"),
    task = useTask();
  const [qty, setQty] = useState(1),
    [manifest, setManifest] = useState<{
      batchId: string;
      tags: {
        id: string;
        scanUrl: string;
        token: string;
        claimSecret: string;
      }[];
    }>(),
    [tenantName, setTenantName] = useState(""),
    [tenantId, setTenant] = useState(""),
    [userId, setUser] = useState(""),
    [tagId, setTag] = useState(""),
    [role, setRole] = useState("staff");
  if (!data.data) return <Load error={data.error} />;
  const d = data.data;
  async function changeOrder(id: string, state: string) {
    await api("admin/orders/" + id, { state });
    await data.refresh();
  }
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Operations</span>
        <div className="split">
          <h1>Platform overview.</h1>
          <button className="secondary" onClick={() => void data.refresh()}>
            Refresh
          </button>
        </div>
        <p>Inventory, exceptions, and a record of sensitive changes.</p>
      </div>
      {task.notice}
      <div className="grid">
        {[
          ["Stickers", d.counts.tags],
          ["Queued deliveries", d.counts.queued],
          ["Uncertain sends", d.counts.uncertain],
        ].map(([l, n]) => (
          <div className="card" key={l}>
            <small>{l}</small>
            <div className="stat">{n}</div>
          </div>
        ))}
      </div>
      <div
        className={
          "note message " +
          (!d.worker ||
          Date.now() - new Date(d.worker.heartbeat_at).getTime() > 60000
            ? "warning"
            : "")
        }
      >
        Worker:{" "}
        {d.worker
          ? new Date(d.worker.heartbeat_at).toLocaleString("en-PK", {
              timeZone: "Asia/Karachi",
            }) + " PKT"
          : "no heartbeat yet"}
        . Start the separate worker for delivery and retention.
      </div>
      <div className="stack">
        <section className="card">
          <h2>Create a sticker batch</h2>
          <p>
            Activation secrets appear once. Save the private manifest securely
            and keep it separate from public print files.
          </p>
          <form
            className="actions"
            onSubmit={submit(
              () =>
                void task.run(async () => {
                  setManifest(await api("admin/batches", { quantity: qty }));
                  await data.refresh();
                }),
            )}
          >
            <label>
              Quantity
              <input
                min={1}
                max={100}
                type="number"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </label>
            <button disabled={task.busy}>Generate batch</button>
          </form>
          {manifest && (
            <div className="message">
              <div className="note warning">
                Private fulfilment credentials. Do not print the activation
                secret on the public sticker.
              </div>
              {manifest.tags.map((t) => (
                <details key={t.id} style={{ marginTop: 15 }}>
                  <summary>Sticker {t.id.slice(0, 8)}</summary>
                  <label>
                    Public scan URL<div className="code">{t.scanUrl}</div>
                  </label>
                  <label>
                    Sealed activation secret
                    <div className="code">{t.claimSecret}</div>
                  </label>
                </details>
              ))}
              <a
                className="button secondary"
                style={{ marginTop: 20 }}
                download={"private-batch-" + manifest.batchId + ".json"}
                href={
                  "data:application/json," +
                  encodeURIComponent(JSON.stringify(manifest, null, 2))
                }
              >
                Download private manifest
              </a>
            </div>
          )}
        </section>
        <section className="card">
          <h2>Delivery exceptions</h2>
          {!d.deliveries.length ? (
            <p>No failed or uncertain deliveries.</p>
          ) : (
            d.deliveries.map((x) => (
              <div key={x.id}>
                <div className="split">
                  <p>
                    {x.channel} · {x.incident_id.slice(0, 8)} · {x.safe_code}
                  </p>
                  <Badge value={x.state} />
                </div>
                {x.state === "UNKNOWN" && (
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        const providerId = window.prompt(
                          "Enter the provider message ID from verified provider records.",
                        );
                        if (providerId)
                          void task.run(async () => {
                            await api("admin/reconcile", {
                              deliveryId: x.id,
                              result: "accepted",
                              providerId,
                            });
                            await data.refresh();
                          });
                      }}
                    >
                      Confirm accepted
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Have provider records confirmed that this send failed?",
                          )
                        )
                          void task.run(async () => {
                            await api("admin/reconcile", {
                              deliveryId: x.id,
                              result: "failed",
                            });
                            await data.refresh();
                          });
                      }}
                    >
                      Confirm failed
                    </button>
                  </div>
                )}
                <hr className="divider" />
              </div>
            ))
          )}
        </section>
        <section className="card">
          <h2>Support & orders</h2>
          {d.reports.map((r) => (
            <div className="split" key={r.id}>
              <p>
                {r.category} · {r.state}
              </p>
              {r.state === "open" && (
                <button
                  className="secondary"
                  onClick={() =>
                    void task.run(async () => {
                      await api("admin/reports/" + r.id, {});
                      await data.refresh();
                    })
                  }
                >
                  Mark reviewed
                </button>
              )}
            </div>
          ))}
          {d.orders.map((o) => (
            <div key={o.id} className="split" style={{ marginTop: 15 }}>
              <span>
                {o.quantity} sticker(s) · {o.id.slice(0, 8)} · {o.state}
              </span>
              <div className="actions">
                {["contacted", "fulfilled", "cancelled"].map((s) => (
                  <button
                    key={s}
                    className="secondary"
                    disabled={task.busy}
                    onClick={() => void task.run(() => changeOrder(o.id, s))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!d.reports.length && !d.orders.length && (
            <p>No reports or order requests yet.</p>
          )}
        </section>
        <section className="card">
          <h2>Site access & allocation</h2>
          <form
            className="actions field"
            onSubmit={submit(
              () =>
                void task.run(async () => {
                  const t = await api<{ id: string }>("admin/tenants", {
                    name: tenantName,
                  });
                  setTenant(t.id);
                  setTenantName("");
                  await data.refresh();
                }),
            )}
          >
            <label>
              New site name
              <input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
                maxLength={80}
              />
            </label>
            <button disabled={task.busy}>Create site</button>
          </form>
          <label className="field">
            Site
            <select
              value={tenantId}
              onChange={(e) => setTenant(e.target.value)}
            >
              <option value="">Choose site</option>
              {d.tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <form
              className="stack"
              onSubmit={submit(
                () =>
                  void task.run(async () => {
                    await api("admin/memberships", { tenantId, userId, role });
                  }, "Site membership saved."),
              )}
            >
              <label>
                Member account reference
                <input
                  value={userId}
                  onChange={(e) => setUser(e.target.value)}
                  required
                />
              </label>
              <label>
                Role
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </select>
              </label>
              <button disabled={task.busy || !tenantId}>
                Assign site member
              </button>
            </form>
            <form
              className="stack"
              onSubmit={submit(
                () =>
                  void task.run(async () => {
                    await api("admin/allocate", { tenantId, tagId });
                    await data.refresh();
                  }, "Unclaimed sticker allocated."),
              )}
            >
              <label>
                Unclaimed sticker
                <select
                  value={tagId}
                  onChange={(e) => setTag(e.target.value)}
                  required
                >
                  <option value="">Choose sticker</option>
                  {d.inventory
                    .filter((t) => t.state === "unclaimed")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id.slice(0, 8)}
                      </option>
                    ))}
                </select>
              </label>
              <p className="small">
                Allocation lets site members see incident summaries. It does not
                claim the sticker on behalf of an owner.
              </p>
              <button disabled={task.busy || !tenantId}>
                Allocate sticker
              </button>
            </form>
          </div>
        </section>
        <section className="card">
          <h2>Audit trail</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Time (PKT)</th>
                </tr>
              </thead>
              <tbody>
                {d.audit.map((x, i) => (
                  <tr key={i}>
                    <td>{x.action}</td>
                    <td>{x.target_id.slice(0, 8)}</td>
                    <td>
                      {new Date(x.created_at).toLocaleString("en-PK", {
                        timeZone: "Asia/Karachi",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
export function Site({ tenantId }: { tenantId: string }) {
  const r = useResource<Incident[]>("site/" + tenantId);
  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Site-scoped access</span>
        <h1>Site requests.</h1>
        <p>Only incidents for stickers allocated to your site appear here.</p>
      </div>
      {!r.data ? (
        <Load error={r.error} />
      ) : (
        <div className="stack">
          {r.data.length ? (
            r.data.map((i) => (
              <div key={i.id} className="card split">
                <span>
                  {labels.en[i.reason]} · {i.id.slice(0, 8)}
                </span>
                <Badge value={i.state} />
              </div>
            ))
          ) : (
            <Empty title="No requests yet">
              Site incident summaries will appear here.
            </Empty>
          )}
        </div>
      )}
    </>
  );
}
