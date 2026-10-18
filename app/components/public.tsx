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
export function Home() {
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
export function SignIn({ mode }: { mode?: Mode }) {
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
export function Scanner({ raw, mode }: { raw: string; mode?: Mode }) {
  const tag = useResource<{
    available: boolean;
    descriptor?: string;
    locale?: string;
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
  useEffect(() => {
    if (tag.data?.locale) setLocale(tag.data.locale);
  }, [tag.data?.locale]);
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
export function Progress({ incidentId }: { incidentId: string }) {
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
export function Policy({ page }: { page: string }) {
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
