"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Challenge from "./challenge";
import { useRouter } from "next/navigation";
import { labels, type Reason } from "@/packages/shared/contracts";

type Mode = { simulation: boolean; authSimulation: boolean; siteKey?: string };
type Vehicle = { id: string; make: string; color: string };
type Tag = { id: string; vehicle_id: string; state: string };
type Incident = {
  id: string;
  reason: Reason;
  state: string;
  response?: string;
  created_at: string;
  expires_at: string;
  make?: string;
  color?: string;
  location?: { latitude: number; longitude: number; accuracy: number };
};
type Dashboard = {
  user: {
    id: string;
    role: string;
    mfa: boolean;
    whatsapp: boolean;
    sms: boolean;
    dnd: boolean;
    locale: string;
  };
  vehicles: Vehicle[];
  tags: Tag[];
  incidents: Incident[];
  orders: { id: string; quantity: number; state: string }[];
  sites: { id: string; name: string; role: string }[];
};
type PublicState = {
  id: string;
  state: string;
  delivery: string;
  response?: string;
  expiresAt: string;
};
const errors: Record<string, string> = {
  challenge_required: "Complete the verification before submitting.",
  challenge_failed: "Verification expired. Return to the form and try again.",
  sign_in_required: "Please sign in to continue.",
  invalid_code:
    "The code is incorrect, expired, or already used. Request a new code if needed.",
  rate_limited:
    "Please wait before trying again. This helps prevent unwanted alerts.",
  claim_unavailable:
    "This sticker cannot be claimed. Check the sealed activation secret and tag code.",
  tag_unavailable: "This tag is not available for contact.",
  invalid_input: "Check the information entered and try again.",
  idempotency_conflict:
    "This request changed. Choose the reason again before retrying.",
  recent_request_exists:
    "You already sent a recent request for this car. Please wait five minutes.",
  staff_mfa_required:
    "Staff access requires a staff role and recent two-factor verification.",
  service_unavailable:
    "The service is unavailable. Your request is not confirmed. Please retry shortly.",
  sms_consent_required:
    "Enable SMS consent before accepting a backup invitation.",
  incident_closed: "This request has ended. Refresh to see its current status.",
};
async function api<T>(
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "No connection. Your request is not confirmed. Check your internet and retry.",
    );
  }
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      errors[data.error] ??
        "The action could not be completed (" + data.error + ").",
    );
  return data;
}
function useResource<T>(path: string) {
  const [data, setData] = useState<T>(),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setData(await api<T>(path));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data, error, refresh };
}
function useTask() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const run = async (fn: () => Promise<void>, success = "") => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      await fn();
      if (success) setMessage(success);
    } catch (e) {
      setMessage((e as Error).message);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return {
    busy,
    run,
    notice: message ? (
      <div
        role={failed ? "alert" : "status"}
        className={"note message " + (failed ? "error" : "")}
      >
        {message}
      </div>
    ) : null,
  };
}
function submit(fn: () => void) {
  return (e: FormEvent) => {
    e.preventDefault();
    fn();
  };
}
function Car() {
  return (
    <svg
      width="34"
      height="26"
      viewBox="0 0 44 30"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m8 12 4-8h20l4 8m-28 0h28l4 5v8H4v-8l4-5ZM10 25v3m24-3v3M10 19h5m14 0h5M10 12h24"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + value.toLowerCase()}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
function Load({ error }: { error?: string }) {
  return (
    <div className="loading">
      {error ? (
        <>
          <p role="alert">{error}</p>
          <a className="button secondary" href="/signin">
            Sign in
          </a>
        </>
      ) : (
        "Loading…"
      )}
    </div>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Header() {
  return (
    <header className="header wrap">
      <a href="/" className="brand">
        <img src="/icon.svg" alt="" />
        QR CAR<span className="sr-only">home</span>
      </a>
      <nav aria-label="Main navigation">
        <a className="desktop" href="/#how">
          How it works
        </a>
        <a className="desktop" href="/help">
          Help & safety
        </a>
        <a className="button secondary" href="/dashboard">
          Owner area <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  );
}
function Footer() {
  return (
    <footer className="footer wrap">
      <span>QR CAR · A thoughtful way to stay reachable.</span>
      <span>
        <a href="/privacy">Privacy</a> &nbsp; / &nbsp;{" "}
        <a href="/terms">Terms</a> &nbsp; / &nbsp; <a href="/help">Help</a>
      </span>
    </footer>
  );
}
export default function Application({ path }: { path: string[] }) {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  const { data: mode } = useResource<Mode>("config");
  const page = path[0] ?? "home";
  return (
    <>
      {mode?.simulation && (
        <div className="sim">
          SIMULATION · No real WhatsApp messages or SMS are sent. This is a
          local demonstration.
        </div>
      )}
      <Header />
      {page === "home" ? (
        <Home />
      ) : page === "signin" ? (
        <SignIn mode={mode} />
      ) : page === "q" ? (
        <Scanner raw={path[1]} mode={mode} />
      ) : page === "incident" ? (
        <Progress incidentId={path[1]} />
      ) : [
          "dashboard",
          "vehicles",
          "settings",
          "admin",
          "site",
          "backup",
        ].includes(page) ? (
        <Workspace page={page} path={path} mode={mode} />
      ) : ["privacy", "terms", "help", "pricing"].includes(page) ? (
        <Policy page={page} />
      ) : (
        <main className="narrow section">
          <h1>Page not found</h1>
          <a className="button" href="/">
            Back home
          </a>
        </main>
      )}
      <Footer />
    </>
  );
}
function Home() {
  return (
    <main className="wrap">
      <section className="hero">
        <div>
          <span className="eyebrow">For the person behind the wheel</span>
          <h1>
            Stay reachable.
            <br />
            <span>
              Keep your number
              <br />
              to yourself.
            </span>
          </h1>
          <p>
            A small sticker. A private connection. Let someone alert you about
            your car without sharing your personal phone number.
          </p>
          <div className="actions">
            <a className="button" href="/signin">
              Set up your car <span aria-hidden="true">↗</span>
            </a>
            <a className="button secondary" href="#how">
              See how it works
            </a>
          </div>
          <div className="trust">
            <span aria-hidden="true">◇</span> No phone number on your
            windshield. No app needed to scan.
          </div>
        </div>
        <div
          className="scene"
          aria-label="Illustration of the scanner experience"
        >
          <div className="phone">
            <div className="phone-notch" />
            <span className="eyebrow">You’re in the right place</span>
            <div className="car">
              <Car />
            </div>
            <h3>
              A little heads-up
              <br />
              can make a big difference.
            </h3>
            <p>Choose a reason to privately alert this car’s owner.</p>
            <div className="phone-row">↗ &nbsp; Please move your car</div>
            <div className="phone-row">☼ &nbsp; Your lights are on</div>
            <div className="phone-row">◇ &nbsp; A window is open</div>
            <p style={{ margin: "20px 0 0" }}>
              Your alert goes through QR CAR.
            </p>
          </div>
          <div className="floating">
            <span className="check">✓</span>
            <div>
              <strong>Privacy comes along for the ride.</strong>
              <br />
              <small>The owner’s number stays private.</small>
            </div>
          </div>
        </div>
      </section>
      <section id="how" className="section border-top">
        <div className="split">
          <div>
            <span className="eyebrow">Three simple steps</span>
            <h2>Less friction. More consideration.</h2>
          </div>
          <p>Made for everyday moments around your car.</p>
        </div>
        <div className="grid">
          {[
            [
              "01",
              "Claim your sticker",
              "Sign in, add your car, and activate the sticker with its separate sealed secret.",
            ],
            [
              "02",
              "Someone scans",
              "A passerby chooses a reason and confirms an alert. Scanning alone sends nothing.",
            ],
            [
              "03",
              "You respond",
              "Acknowledge in your owner area. With approved live services, WhatsApp and SMS can bring the alert to you.",
            ],
          ].map(([n, title, text]) => (
            <article className="card" key={n}>
              <span className="step-no">{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="card split">
        <div>
          <h2>Park with a little more peace of mind.</h2>
          <p style={{ margin: 0 }}>
            For blocked entrances, open windows, and lights left on.
          </p>
        </div>
        <a className="button lime" href="/signin">
          Get started ↗
        </a>
      </section>
    </main>
  );
}
function SignIn({ mode }: { mode?: Mode }) {
  const router = useRouter(),
    task = useTask();
  const [captcha, setCaptcha] = useState(""),
    [captchaRound, setCaptchaRound] = useState(0);
  const [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState(""),
    [demo, setDemo] = useState("");
  return (
    <main className="narrow section">
      <span className="eyebrow">Your private owner area</span>
      <h1 style={{ fontSize: "2.7rem" }}>Welcome aboard.</h1>
      <p>
        Sign in with your Pakistan mobile number. We keep it out of the
        scanner’s view.
      </p>
      <div className="card">
        {task.notice}
        <form
          className="stack"
          onSubmit={submit(
            () =>
              void task.run(async () => {
                if (challenge) {
                  await api("auth/verify", {
                    phone,
                    code,
                    challengeId: challenge,
                  });
                  router.push("/dashboard");
                } else {
                  const r = await api<{
                    challengeId: string;
                    demoCode?: string;
                  }>("auth/start", {
                    phone,
                    captchaToken: captcha || undefined,
                  }).finally(() => {
                    setCaptcha("");
                    setCaptchaRound((n) => n + 1);
                  });
                  setChallenge(r.challengeId);
                  setDemo(r.demoCode ?? "");
                }
              }),
          )}
        >
          <label>
            Mobile number
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+92 followed by 10 digits"
              pattern="\+92[0-9]{10}"
              required
              value={phone}
              disabled={!!challenge}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          {challenge && (
            <>
              <label>
                Verification code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </label>
              {demo && (
                <div className="note warning">
                  Simulation code: <strong>{demo}</strong>
                  <br />
                  No SMS was sent. Never enter a real OTP from another service.
                </div>
              )}
            </>
          )}
          {!challenge && (
            <Challenge
              key={captchaRound}
              siteKey={mode?.siteKey}
              onToken={setCaptcha}
            />
          )}
          <button
            disabled={task.busy || (!challenge && !!mode?.siteKey && !captcha)}
          >
            {task.busy
              ? "Please wait…"
              : challenge
                ? "Verify & continue"
                : "Send verification code"}
          </button>
          {challenge && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setChallenge("");
                setCode("");
                setDemo("");
              }}
            >
              Change number / request new code
            </button>
          )}
        </form>
        <p className="small" style={{ margin: "24px 0 0" }}>
          Sign-in verifies access to a number, not legal ownership of a car.
          Alert-channel consent is chosen separately in Settings.
        </p>
      </div>
      <p className="small" style={{ marginTop: 20 }}>
        By continuing, you accept the{" "}
        <a className="text-link" href="/terms">
          terms
        </a>{" "}
        and acknowledge the{" "}
        <a className="text-link" href="/privacy">
          privacy notice
        </a>
        . {mode?.authSimulation ? "Local verification is simulated." : ""}
      </p>
    </main>
  );
}
function Scanner({ raw, mode }: { raw: string; mode?: Mode }) {
  const tag = useResource<{
    available: boolean;
    descriptor?: string;
    reasons: Reason[];
  }>("public/tags/" + encodeURIComponent(raw ?? ""));
  const [locale, setLocale] = useState("en"),
    [reason, setReason] = useState<Reason>(),
    [confirm, setConfirm] = useState(false),
    [location, setLocation] = useState<{
      latitude: number;
      longitude: number;
      accuracy: number;
    }>(),
    [locationNote, setLocationNote] = useState("");
  const task = useTask(),
    router = useRouter(),
    key = useRef("");
  const [captcha, setCaptcha] = useState(""),
    [challengeRound, setChallengeRound] = useState(0);
  function select(r: Reason) {
    setCaptcha("");
    setReason(r);
    setConfirm(false);
    key.current = crypto.randomUUID();
  }
  async function send() {
    await api("session", {});
    const result = await api<{ id: string }>(
      "public/tags/" + raw + "/incidents",
      {
        reason,
        challengeToken: captcha || undefined,
        ...(location ? { location } : {}),
      },
      { "Idempotency-Key": key.current },
    ).finally(() => {
      setCaptcha("");
      setChallengeRound((n) => n + 1);
    });
    router.push("/incident/" + result.id);
  }
  return (
    <main className="narrow section" dir={locale === "ur" ? "rtl" : "ltr"}>
      <div className="language" aria-label="Alert language">
        {[
          ["en", "English"],
          ["roman", "Roman Urdu"],
          ["ur", "اردو"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={locale === v ? "selected" : ""}
            onClick={() => setLocale(v)}
          >
            {l}
          </button>
        ))}
      </div>
      {!tag.data ? (
        <Load error={tag.error} />
      ) : !tag.data.available ? (
        <div className="card">
          <h1 style={{ fontSize: "2rem" }}>Contact unavailable</h1>
          <p>
            This sticker is not available right now. Please contact site staff
            if you need help.
          </p>
          <a href="/help" className="button secondary">
            Help & safety
          </a>
        </div>
      ) : (
        <>
          <div className="scanner-head">
            <div className="vehicle-icon">
              <Car />
            </div>
            <span className="eyebrow">{tag.data.descriptor}</span>
            <h1>A helpful heads-up.</h1>
            <p>
              {locale === "ur"
                ? "مالک کو اطلاع دینے کی وجہ منتخب کریں۔"
                : locale === "roman"
                  ? "Owner ko alert bhejne ki wajah chunein."
                  : "What would you like the owner to know?"}
            </p>
          </div>
          <div className="card">
            {task.notice}
            {confirm ? (
              <>
                <span className="eyebrow">Check before sending</span>
                <h2>{labels[locale][reason!]}</h2>
                <p>
                  This will create a private alert. Use this only for a genuine
                  concern about this vehicle.
                </p>
                <Challenge
                  key={challengeRound}
                  siteKey={mode?.siteKey}
                  onToken={setCaptcha}
                />
                <div className="actions">
                  <button
                    disabled={task.busy || (!!mode?.siteKey && !captcha)}
                    onClick={() => void task.run(send)}
                  >
                    {task.busy ? "Submitting…" : "Confirm & send alert"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setConfirm(false)}
                    disabled={task.busy}
                  >
                    Back
                  </button>
                </div>
              </>
            ) : (
              <>
                {tag.data.reasons.map((r, i) => (
                  <button
                    key={r}
                    className={"reason " + (reason === r ? "selected" : "")}
                    onClick={() => select(r)}
                    aria-pressed={reason === r}
                  >
                    <span>{labels[locale][r]}</span>
                    <span aria-hidden="true">
                      {["↗", "☼", "◇", "!", "!"][i]}
                    </span>
                  </button>
                ))}
                <button
                  className="secondary"
                  style={{ width: "100%", margin: "10px 0" }}
                  onClick={() => {
                    if (!navigator.geolocation) {
                      setLocationNote(
                        "Location is unavailable. You can still send an alert.",
                      );
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (p) => {
                        setLocation({
                          latitude: p.coords.latitude,
                          longitude: p.coords.longitude,
                          accuracy: p.coords.accuracy,
                        });
                        setLocationNote(
                          "Location attached. It is removed within 24 hours.",
                        );
                      },
                      () =>
                        setLocationNote(
                          "Location was not shared. You can still send an alert.",
                        ),
                      { timeout: 10000 },
                    );
                  }}
                >
                  Share location (optional)
                </button>
                {locationNote && (
                  <p className="small" role="status">
                    {locationNote}{" "}
                    {location && (
                      <button
                        className="secondary"
                        onClick={() => {
                          setLocation(undefined);
                          setLocationNote("Location removed.");
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </p>
                )}
                <button
                  style={{ width: "100%" }}
                  disabled={!reason}
                  onClick={() => setConfirm(true)}
                >
                  Continue →
                </button>
              </>
            )}
            <hr className="divider" />
            <div className="privacy">
              <span aria-hidden="true">◇</span>
              <span>
                The owner’s phone number stays private. Scanning this sticker
                does not send a message.
              </span>
            </div>
          </div>
          <p className="small" style={{ padding: "16px 8px" }}>
            Immediate danger? Seek local emergency assistance or site security.
            QR CAR does not dispatch emergency services or guarantee a response.
          </p>
        </>
      )}
    </main>
  );
}
function Progress({ incidentId }: { incidentId: string }) {
  const state = useResource<PublicState>("public/incidents/" + incidentId),
    task = useTask();
  useEffect(() => {
    if (
      !state.data ||
      ["RESOLVED", "CANCELLED", "EXPIRED"].includes(state.data.state)
    )
      return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void state.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [state.data, state.refresh]);
  const d = state.data,
    active = d && ["OPEN", "ACKNOWLEDGED"].includes(d.state);
  return (
    <main className="narrow section">
      {!d ? (
        <Load error={state.error} />
      ) : (
        <div className="card">
          <span className="eyebrow">Request {d.id.slice(0, 8)}</span>
          <h1 style={{ fontSize: "2.5rem" }}>
            {d.state === "ACKNOWLEDGED"
              ? "The owner responded."
              : d.state === "RESOLVED"
                ? "Marked as resolved."
                : d.state === "CANCELLED"
                  ? "Request cancelled."
                  : d.state === "EXPIRED"
                    ? "This request has ended."
                    : "Your request is recorded."}
          </h1>
          <Badge value={d.state} />
          {task.notice}
          {state.error && (
            <p role="alert">
              Status updates are unavailable. The last shown state may be out of
              date.
            </p>
          )}
          <ol className="progress">
            <li className="done">
              <span className="dot">✓</span>
              <span>
                Request recorded by QR CAR
                <br />
                <small>Delivery is handled separately.</small>
              </span>
            </li>
            <li className={d.delivery === "CONFIRMED" ? "done" : ""}>
              <span className="dot">2</span>
              <span>
                {d.delivery === "CONFIRMED"
                  ? "Provider confirmed delivery"
                  : d.delivery === "UNCONFIRMED"
                    ? "Delivery is unconfirmed"
                    : "Waiting for delivery confirmation"}
                <br />
                <small>A receipt does not mean the owner has responded.</small>
              </span>
            </li>
            <li
              className={
                ["ACKNOWLEDGED", "RESOLVED"].includes(d.state) ? "done" : ""
              }
            >
              <span className="dot">3</span>
              <span>
                {d.response === "coming"
                  ? "Owner says they are coming"
                  : d.response === "unavailable"
                    ? "Owner cannot attend"
                    : d.response === "report_abuse"
                      ? "Owner declined this request"
                      : d.state === "RESOLVED"
                        ? "Request marked resolved"
                        : "Waiting for an explicit owner response"}
              </span>
            </li>
          </ol>
          {d.state === "EXPIRED" && (
            <p>
              No further alerts will be sent for this request. Contact site
              staff if available.
            </p>
          )}
          {active && (
            <div className="actions">
              <button
                disabled={task.busy}
                onClick={() =>
                  void task.run(async () => {
                    await api("public/incidents/" + d.id + "/resolve", {});
                    await state.refresh();
                  })
                }
              >
                The way is clear
              </button>
              <button
                className="secondary"
                disabled={task.busy}
                onClick={() =>
                  void task.run(async () => {
                    await api("public/incidents/" + d.id + "/cancel", {});
                    await state.refresh();
                  })
                }
              >
                Cancel request
              </button>
            </div>
          )}
          <button
            className="secondary"
            style={{ marginTop: 15 }}
            disabled={task.busy}
            onClick={() =>
              void task.run(async () => {
                await api("public/incidents/" + d.id + "/report", {});
              }, "Your report is recorded for support review.")
            }
          >
            Report a concern
          </button>
        </div>
      )}
    </main>
  );
}
function Workspace({
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
function Admin({
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
function Site({ tenantId }: { tenantId: string }) {
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
function Policy({ page }: { page: string }) {
  return (
    <main className="narrow section policy">
      <span className="eyebrow">Clear expectations</span>
      <h1 style={{ fontSize: "2.7rem" }}>
        {page === "privacy"
          ? "Privacy, plainly."
          : page === "terms"
            ? "Terms of use."
            : page === "pricing"
              ? "Pilot ordering."
              : "Help & safety."}
      </h1>
      {page === "privacy" ? (
        <>
          <p>
            The scanner does not receive the owner’s phone number through the
            public interface. The platform and configured communication
            providers process contact information to deliver alerts.
          </p>
          <h2>What we store</h2>
          <p>
            Verified contact details are encrypted in the application database.
            We store minimal vehicle descriptors, consent history, sticker
            ownership, incidents, delivery states, and redacted audit events. We
            use essential session cookies. There is no advertising tracker.
          </p>
          <h2>Your choices</h2>
          <p>
            Opt into WhatsApp and SMS separately. Withdraw consent, pause
            contact, revoke a tag, export your records, or disable your account
            in Settings. Backup contacts must independently agree.
          </p>
          <h2>Retention</h2>
          <p>
            Optional location is cleared after 24 hours, incidents after 30
            days, webhook deduplication records after 7 days, and audit records
            after 90 days by the worker. Deletion disables the account and
            erases its encrypted contact value immediately. Minimal
            blocked-account identifiers remain to prevent silent reactivation.
            Provider identity records and backups require the operator’s
            separate deletion procedure.
          </p>
          <p className="note warning">
            Pilot notice. Before public use, the operator must identify its
            legal entity, support contact, contracted providers, backup policy,
            and reviewed retention terms.
          </p>
        </>
      ) : page === "terms" ? (
        <>
          <p>
            QR CAR is a vehicle contact service. Use it only for genuine
            concerns about a vehicle. Do not harass owners, automate requests,
            copy or tamper with tags, or try to obtain private contact details.
          </p>
          <h2>Delivery and response</h2>
          <p>
            Messages require available networks, provider permission, and owner
            consent. A delivered message is not an acknowledgement. The service
            cannot guarantee a response or vehicle movement. It does not
            dispatch emergency services.
          </p>
          <h2>Tags and ownership</h2>
          <p>
            Phone verification and sealed activation establish control of an
            account and tag, not legal ownership of a vehicle. Protect
            activation secrets and transfer them privately. A photographed QR is
            not proof of physical presence.
          </p>
          <h2>Pilot status</h2>
          <p>
            Live messaging, approved masked calls, pricing, and commercial
            fulfilment are subject to the operator’s launch gates. Simulation
            sends no real messages. No payment is taken by this application.
          </p>
        </>
      ) : page === "pricing" ? (
        <>
          <p>
            Sticker orders are handled manually during the pilot. No price,
            subscription, payment, or delivery date is promised here.
          </p>
          <a className="button" href="/settings">
            Request stickers
          </a>
        </>
      ) : (
        <>
          <h2>For scanners</h2>
          <p>
            Check the sticker’s official domain. Choose a reason and confirm.
            Scanning alone does not send anything. Keep the status page open to
            see updates. You can cancel the request or report a concern.
          </p>
          <h2>For owners</h2>
          <p>
            Sign in, add your car, claim the tag with its sealed secret, and
            enable your chosen alert channels. Acknowledge requests in the
            dashboard. Pause contact or block and report abusive requests when
            needed.
          </p>
          <h2>Connection problems</h2>
          <p>
            The scanner needs internet to submit. In live mode, a consented SMS
            fallback is scheduled after 90 seconds without acknowledgement. SMS
            can work without mobile data but still needs cellular coverage.
            Local simulation cannot contact a phone.
          </p>
          <h2>Immediate danger</h2>
          <p>
            Seek local emergency assistance or site security. Do not wait for QR
            CAR. An urgent reason does not override consent, guarantee delivery,
            or trigger emergency dispatch.
          </p>
          <h2>Account recovery</h2>
          <p>
            Sign in again using your verified number. If the number has changed
            or a sticker secret is lost, contact your pilot operator for
            reviewed recovery and replacement. Do not post activation secrets in
            public support channels.
          </p>
        </>
      )}
      <p className="small" style={{ marginTop: 35 }}>
        Working product name: QR CAR. Commercial name clearance and a named
        support operator are required before launch.
      </p>
    </main>
  );
}
