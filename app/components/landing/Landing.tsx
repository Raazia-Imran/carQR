"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import CarScene from "./CarScene";
import { labels, type Reason } from "@/packages/shared/contracts";
import "./landing.css";

type IconName =
  | "arrow"
  | "lock"
  | "scan"
  | "bell"
  | "check"
  | "car"
  | "shield"
  | "clock"
  | "tag"
  | "people"
  | "pause"
  | "play"
  | "sun"
  | "window";
function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
      </>
    ),
    scan: (
      <>
        <path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m13-5v4a1 1 0 0 1-1 1h-4M2 12h20" />
        <path d="M8 8h3v3H8zm6 6h3v3h-3z" />
      </>
    ),
    bell: (
      <>
        <path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4l-2 3Zm5 4h4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    car: (
      <>
        <path d="m5 10 2-5h10l2 5m-14 0h14l2 3v5H3v-5l2-3Zm1 8v2m12-2v2M6 14h2m8 0h2" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    tag: (
      <>
        <path d="M3 3h8l10 10-8 8L3 11V3Z" />
        <circle cx="7.5" cy="7.5" r="1" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4c2 .4 3 1.5 3 4v2" />
      </>
    ),
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    play: <path d="m8 4 12 8-12 8V4Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    window: (
      <>
        <path d="M4 4h16v16H4zm0 8h16M12 4v16" />
      </>
    ),
  };
  return (
    <svg
      className={"journey-icon " + className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
function QrMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 92 92"
      className={"journey-qr " + className}
      aria-hidden="true"
    >
      <rect width="92" height="92" rx="5" fill="currentColor" />
      <g fill="var(--qr-paper, #fcf8ed)">
        <path d="M8 8h28v28H8zm48 0h28v28H56zM8 56h28v28H8z" />
      </g>
      <g fill="currentColor">
        <path d="M14 14h16v16H14zm48 0h16v16H62zM14 62h16v16H14z" />
      </g>
      <g fill="var(--qr-paper, #fcf8ed)">
        <path d="M42 8h8v12h-8zm0 20h8v15h-8zM8 42h12v8H8zm20 0h22v8H28zm28 0h9v9h-9zm18 0h10v18H74zM42 56h9v10h-9zm14 2h9v18h-9zM42 74h9v10h-9zm22 3h20v7H64zm10-13h10v7H74z" />
      </g>
    </svg>
  );
}
const chapters = [
  {
    label: "Park with privacy",
    kicker: "A small change on your windshield",
    title: (
      <>
        A little sticker.
        <br />A lot less
        <br />
        <em>parking drama.</em>
      </>
    ),
    text: "Let someone reach you about your car while keeping your personal number off the windshield.",
    icon: "car" as const,
  },
  {
    label: "Scan the sticker",
    kicker: "01 / A considerate passerby",
    title: (
      <>
        A quick scan.
        <br />A helpful
        <br />
        <em>heads-up.</em>
      </>
    ),
    text: "Blocking a driveway? Lights left on? A passerby opens the contact page, chooses a reason, and confirms the alert. No app download needed.",
    icon: "scan" as const,
  },
  {
    label: "Send a private alert",
    kicker: "02 / The platform makes the connection",
    title: (
      <>
        The alert gets
        <br />a destination.
        <br />
        <em>Your number stays private.</em>
      </>
    ),
    text: "QR CAR handles the contact. The scanner gets a request status, while the owner receives the alert through their selected channels.",
    icon: "bell" as const,
  },
  {
    label: "The owner responds",
    kicker: "03 / A response makes the difference",
    title: (
      <>
        A little
        <br />
        “I’m coming.”
        <br />
        <em>Goes a long way.</em>
      </>
    ),
    text: "The owner responds in their private area. The passerby sees the acknowledgement, and future queued reminders stop.",
    icon: "check" as const,
  },
  {
    label: "Keep the day moving",
    kicker: "04 / Back to the things that matter",
    title: (
      <>
        Move the car.
        <br />
        Clear the way.
        <br />
        <em>Carry on.</em>
      </>
    ),
    text: "Either person can mark the request resolved. The owner keeps control of the sticker, their preferences, and who can contact them.",
    icon: "car" as const,
  },
];
const scenarios: { reason: Reason; label: string; icon: IconName }[] = [
  { reason: "blocked_access", label: "Blocked driveway", icon: "car" },
  { reason: "lights_on", label: "Lights left on", icon: "sun" },
  { reason: "window_open", label: "Open window", icon: "window" },
];
const audiences = [
  {
    label: "For drivers",
    heading: "Your number isn’t a parking accessory.",
    text: "Put a small contact point on your car. Manage your vehicle, choose alert channels, and pause contact whenever you need.",
    points: [
      "One private owner area",
      "Sticker activation with a separate secret",
      "Pause, revoke, or transfer your tag",
    ],
    icon: "car" as const,
    note: "Start with your own car",
    href: "/signin",
  },
  {
    label: "For campuses",
    heading: "A little order in the campus car park.",
    text: "Explore a controlled site pilot with allocated stickers and incident summaries limited to the right site members.",
    points: [
      "Allocate unclaimed tags to a site",
      "Give staff access within their site",
      "Keep owner contact records private",
    ],
    icon: "people" as const,
    note: "Read about pilot ordering",
    href: "/pricing",
  },
  {
    label: "For workplaces",
    heading: "Fewer “whose car is this?” moments.",
    text: "Give drivers a private point of contact and site staff a shared view of parking requests. Start small and learn from an agreed pilot.",
    points: [
      "Driver managed preferences",
      "Site scoped request summaries",
      "Manual sticker orders for the pilot",
    ],
    icon: "tag" as const,
    note: "Explore a pilot",
    href: "/pricing",
  },
];
const questions = [
  [
    "Can the person scanning see my number?",
    "The public contact page and request status do not receive the owner’s stored phone number. QR CAR and the configured delivery providers process the contact information needed to send alerts.",
  ],
  [
    "Does scanning automatically send a message?",
    "No. The passerby chooses a reason, reviews it, and confirms an alert. Opening a QR page alone sends nothing.",
  ],
  [
    "How does WhatsApp fit in?",
    "The WhatsApp integration is coded, with approved template delivery as the primary channel. Real sending still needs an approved business sender, template and live configuration. Local demonstration mode sends no messages.",
  ],
  [
    "What happens if I have no mobile data?",
    "In a configured live service, one consented SMS fallback is scheduled after 90 seconds without acknowledgement. SMS still needs cellular coverage. No channel can guarantee an immediate response.",
  ],
  [
    "Can I pause or transfer my sticker?",
    "Yes. Owners can pause and resume contact, permanently revoke a tag, or release it with a fresh private activation secret for the next owner.",
  ],
  [
    "Are calls available?",
    "Masked calls are a later phase. They are not currently implemented and need an approved carrier route before launch. Current owner responses happen through the private portal.",
  ],
  [
    "How do I get a sticker, and what does it cost?",
    "Sign in and request stickers from Settings. Orders are handled manually during the pilot. Price, fulfilment and any service terms must be confirmed by the operator; this application does not take online payments.",
  ],
];

export default function Landing() {
  const panels = useRef<(HTMLElement | null)[]>([]),
    frame = useRef(0);
  const [progress, setProgress] = useState(0),
    [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false),
    [motionPaused, setMotionPaused] = useState(false),
    [menu, setMenu] = useState(false);
  const [reason, setReason] = useState<Reason>("blocked_access"),
    [replied, setReplied] = useState(false),
    [audience, setAudience] = useState(0);
  const active = Math.round(progress),
    motion = !reduced && !motionPaused;
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    const measure = () => {
      frame.current = 0;
      const anchor =
        window.innerHeight * (window.innerWidth < 760 ? 0.76 : 0.51);
      const centers = panels.current.map((p) => {
        const r = p?.getBoundingClientRect();
        return r ? r.top + r.height / 2 : 0;
      });
      let next = 0;
      for (let i = 0; i < centers.length - 1; i++)
        if (anchor >= centers[i])
          next =
            i +
            Math.min(
              1,
              (anchor - centers[i]) / Math.max(1, centers[i + 1] - centers[i]),
            );
      setProgress(Math.max(0, Math.min(4, next)));
    };
    const queue = () => {
      if (!frame.current) frame.current = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    queue();
    return () => {
      preference.removeEventListener("change", sync);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);
  function go(index: number) {
    setMenu(false);
    panels.current[index]?.scrollIntoView({
      behavior: motion ? "smooth" : "auto",
      block: "start",
    });
  }
  const useCase = audiences[audience];
  return (
    <div
      className="journey-page"
      style={{ "--story-progress": progress / 4 } as CSSProperties}
    >
      <a className="journey-skip" href="#journey-main">
        Skip to content
      </a>
      <header className="journey-nav">
        <a className="journey-brand" href="/" aria-label="QR CAR home">
          <QrMark />
          <span>
            QR CAR
            <span className="journey-brand-dot" aria-hidden="true">
              ✳
            </span>
          </span>
        </a>
        <nav
          className={"journey-nav-links " + (menu ? "is-open" : "")}
          aria-label="Landing navigation"
        >
          <a
            href="#how"
            onClick={(e) => {
              e.preventDefault();
              go(1);
            }}
          >
            The little story
          </a>
          <a href="#features" onClick={() => setMenu(false)}>
            The good stuff
          </a>
          <a href="#for-everyone" onClick={() => setMenu(false)}>
            For your car park
          </a>
        </nav>
        <a href="/dashboard" className="journey-owner-link">
          Owner area <Icon name="arrow" />
        </a>
        <button
          className="journey-menu"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <span />
          <span />
        </button>
      </header>
      <main id="journey-main">
        <div className="journey-rail" id="how">
          <div
            className="journey-visual"
            data-chapter={active}
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse" || !motion) return;
              const r = e.currentTarget.getBoundingClientRect();
              setPointer({
                x: (e.clientX - r.left) / r.width - 0.5,
                y: (e.clientY - r.top) / r.height - 0.5,
              });
            }}
            onPointerLeave={() => setPointer({ x: 0, y: 0 })}
          >
            <div className="journey-stage">
              <div className="journey-stage-grid" aria-hidden="true" />
              <span className="journey-scene-word" aria-hidden="true">
                {["PARK.", "SCAN.", "ALERT.", "REPLY.", "GO."][active]}
              </span>
              <CarScene
                progress={progress}
                pointerX={pointer.x}
                pointerY={pointer.y}
                motion={motion}
              />
              <div className="journey-floating privacy-token">
                <span className="journey-mini-icon">
                  <Icon name="lock" />
                </span>
                <span>
                  Personal number
                  <br />
                  <strong>Stays private.</strong>
                </span>
                <span className="token-dot" />
              </div>
              <div className="journey-floating scan-token">
                <QrMark />
                <div>
                  <span>SCAN TO CONTACT</span>
                  <strong>
                    A good neighbour
                    <br />
                    starts here.
                  </strong>
                </div>
                <span className="scan-line" />
              </div>
              <div className="journey-floating alert-token">
                <div className="alert-token-head">
                  <span className="journey-mini-icon">
                    <Icon name="bell" />
                  </span>
                  <span>
                    QR CAR<strong>Vehicle heads-up</strong>
                  </span>
                  <small>Example</small>
                </div>
                <p>{labels.en[reason]}.</p>
                <span className="alert-private">
                  <Icon name="shield" /> Sent through the platform
                </span>
              </div>
              <div className="journey-floating reply-token">
                <span className="example-tag">INTERACTIVE EXAMPLE</span>
                <p>
                  {replied
                    ? "A little consideration, received."
                    : "A quick reply can clear the way."}
                </p>
                <button onClick={() => setReplied(true)} disabled={replied}>
                  <Icon name="check" />
                  {replied ? "Example acknowledged" : "Try “I’m coming”"}
                </button>
                <small>No real alert is sent.</small>
              </div>
              <div className="journey-floating clear-token">
                <span className="journey-mini-icon">
                  <Icon name="check" />
                </span>
                <span>
                  Small sticker.
                  <br />
                  <strong>More consideration.</strong>
                </span>
              </div>
              <div className="journey-stage-corner">
                <span className="journey-spark" aria-hidden="true">
                  ✳
                </span>
                <p>
                  Made for everyday
                  <br />
                  parking moments.
                </p>
              </div>
            </div>
            <div className="journey-scene-controls">
              <div
                className="journey-scene-position"
                aria-label={"Story scene " + (active + 1) + " of 5"}
              >
                <strong>0{active + 1}</strong>
                <span>/ 05</span>
                <div className="journey-scene-dots">
                  {chapters.map((c, i) => (
                    <button
                      key={c.label}
                      className={i === active ? "is-active" : ""}
                      aria-label={"Go to scene " + (i + 1) + ": " + c.label}
                      aria-current={i === active ? "step" : undefined}
                      onClick={() => go(i)}
                    />
                  ))}
                </div>
              </div>
              <button
                className="journey-motion"
                onClick={() => setMotionPaused(!motionPaused)}
                aria-pressed={motionPaused}
              >
                <Icon name={motionPaused ? "play" : "pause"} />
                <span>
                  {motionPaused
                    ? "Motion paused"
                    : reduced
                      ? "Reduced motion"
                      : "Pause motion"}
                </span>
              </button>
            </div>
            <span className="journey-demo-caption">
              An illustrated journey. Messaging availability depends on live
              service setup.
            </span>
          </div>
          <div className="journey-panels">
            {chapters.map((chapter, index) => (
              <section
                key={chapter.label}
                className={
                  "journey-panel " + (index === active ? "is-active" : "")
                }
                ref={(node) => {
                  panels.current[index] = node;
                }}
                aria-label={chapter.label}
              >
                <span className="journey-kicker">
                  <span className="journey-kicker-dot" />
                  {chapter.kicker}
                </span>
                {index === 0 ? (
                  <h1>{chapter.title}</h1>
                ) : (
                  <h2>{chapter.title}</h2>
                )}
                <p className="journey-story-copy">{chapter.text}</p>
                {index === 0 && (
                  <>
                    <div className="journey-cta-row">
                      <a className="journey-button" href="/signin">
                        Set up your car <Icon name="arrow" />
                      </a>
                      <button
                        className="journey-text-button"
                        onClick={() => go(1)}
                      >
                        Take the little tour <span>↓</span>
                      </button>
                    </div>
                    <div className="journey-trust-row">
                      <Icon name="shield" />
                      <span>Your contact page. Your privacy. Your call.</span>
                    </div>
                    <div className="journey-scroll-note">
                      <span className="journey-scroll-mouse" />
                      Scroll a little. See the story.
                    </div>
                  </>
                )}
                {index === 1 && (
                  <div className="journey-reason-picker">
                    <span className="journey-small-label">
                      CHANGE THE EXAMPLE
                    </span>
                    {scenarios.map((s) => (
                      <button
                        key={s.reason}
                        className={reason === s.reason ? "is-selected" : ""}
                        onClick={() => setReason(s.reason)}
                        aria-pressed={reason === s.reason}
                      >
                        <Icon name={s.icon} />
                        {s.label}
                        <span>{reason === s.reason ? "✓" : "↗"}</span>
                      </button>
                    ))}
                  </div>
                )}
                {index === 2 && (
                  <div className="journey-channel-note">
                    <div>
                      <span className="journey-channel-logo">W</span>
                      <span>
                        <strong>WhatsApp first</strong>
                        <small>With approved live messaging</small>
                      </span>
                    </div>
                    <span className="journey-channel-path" />
                    <div>
                      <span className="journey-channel-logo sms">
                        <Icon name="clock" />
                      </span>
                      <span>
                        <strong>SMS if needed</strong>
                        <small>
                          After 90 seconds without acknowledgement, with consent
                        </small>
                      </span>
                    </div>
                  </div>
                )}
                {index === 3 && (
                  <div className="journey-note-inline">
                    <Icon name="check" />
                    <p>
                      A delivery receipt is one thing.
                      <br />
                      <strong>An owner’s response is another.</strong>
                    </p>
                  </div>
                )}
                {index === 4 && (
                  <div className="journey-cta-row">
                    <a href="/signin" className="journey-button">
                      A sticker for your car <Icon name="arrow" />
                    </a>
                    <a className="journey-text-button" href="#features">
                      Explore the details ↓
                    </a>
                  </div>
                )}
                {index > 0 && index < 4 && (
                  <button
                    className="journey-next"
                    onClick={() => go(index + 1)}
                  >
                    Next little moment <Icon name="arrow" />
                  </button>
                )}
              </section>
            ))}
          </div>
        </div>
        <section className="journey-principle" aria-label="Privacy principle">
          <span className="journey-principle-star" aria-hidden="true">
            ✳
          </span>
          <p>
            Cars need a way to be reached.
            <br />
            <em>They don’t need your number on display.</em>
          </p>
          <Icon name="lock" />
        </section>
        <section className="journey-features" id="features">
          <div className="journey-section-heading">
            <span className="journey-kicker">THE GOOD STUFF, BUILT IN</span>
            <h2>
              Small on your glass.
              <br />
              <em>Thoughtful everywhere else.</em>
            </h2>
            <p>
              A private point of contact, with practical controls for the person
              behind the wheel.
            </p>
          </div>
          <div className="journey-feature-grid">
            <article className="journey-feature-card feature-sticker">
              <span className="journey-feature-number">01 / THE STICKER</span>
              <div className="journey-sticker-object">
                <span>QR CAR</span>
                <QrMark />
                <strong>
                  Need to reach
                  <br />
                  the driver?
                </strong>
                <small>Scan. Choose. Confirm.</small>
                <span className="sticker-corner" />
              </div>
              <div>
                <h3>
                  A tiny tag.
                  <br />A private connection.
                </h3>
                <p>
                  Your public QR opens a contact page. A separate sealed secret
                  activates the sticker.
                </p>
              </div>
              <span className="feature-visual-note">Sticker illustration</span>
            </article>
            <article className="journey-feature-card feature-control">
              <span className="journey-feature-number">02 / YOUR CONTROL</span>
              <div className="journey-mini-settings" aria-hidden="true">
                <div>
                  <span>Vehicle contact</span>
                  <span className="mini-toggle" />
                </div>
                <div>
                  <Icon name="lock" />
                  <span>Private number</span>
                  <Icon name="check" />
                </div>
                <div>
                  <Icon name="shield" />
                  <span>Your chosen channels</span>
                  <Icon name="check" />
                </div>
                <small>Pause · Resume · Revoke · Transfer</small>
              </div>
              <h3>
                You’re in the
                <br />
                driver’s seat.
              </h3>
              <p>
                Choose your channels, pause contact, or revoke a sticker. Your
                owner area keeps the controls together.
              </p>
            </article>
            <article className="journey-feature-card feature-backup">
              <span className="journey-feature-number">
                03 / A LITTLE BACKUP
              </span>
              <div className="journey-backup-visual" aria-hidden="true">
                <span>
                  <Icon name="car" />
                </span>
                <i />
                <span>
                  <Icon name="people" />
                </span>
                <span className="backup-check">
                  <Icon name="check" />
                </span>
              </div>
              <h3>
                A second person.
                <br />
                With their permission.
              </h3>
              <p>
                Invite one backup. They sign in and opt into SMS separately
                before becoming an escalation contact.
              </p>
            </article>
            <article className="journey-feature-card feature-quiet">
              <div className="quiet-lock">
                <Icon name="shield" />
              </div>
              <div>
                <span className="journey-feature-number">
                  04 / THE QUIET DETAILS
                </span>
                <h3>Consideration goes both ways.</h3>
                <p>
                  Confirmation before contact. Limits on repeated requests.
                  Contact details encrypted in the app database. Reporting and
                  blocking when you need them.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="journey-audiences" id="for-everyone">
          <div className="journey-section-heading">
            <span className="journey-kicker">
              ONE CAR OR THE WHOLE CAR PARK
            </span>
            <h2>
              There’s a place
              <br />
              <em>for a little consideration.</em>
            </h2>
          </div>
          <div
            className="journey-audience-options"
            role="group"
            aria-label="Explore who QR CAR is for"
          >
            {audiences.map((a, i) => (
              <button
                key={a.label}
                aria-pressed={audience === i}
                className={audience === i ? "is-selected" : ""}
                onClick={() => setAudience(i)}
              >
                {a.label}
                <Icon name="arrow" />
              </button>
            ))}
          </div>
          <div className="journey-audience-body">
            <div
              className={"journey-audience-art audience-" + audience}
              aria-hidden="true"
            >
              <div className="audience-orbit orbit-one" />
              <div className="audience-orbit orbit-two" />
              <div className="audience-main-symbol">
                <Icon name={useCase.icon} />
              </div>
              <div className="audience-tag">
                <QrMark />
                <span>
                  {audience === 0
                    ? "YOUR CAR"
                    : audience === 1
                      ? "CAMPUS PARKING"
                      : "WORKPLACE PARKING"}
                </span>
              </div>
              <span className="audience-note">
                {audience === 0 ? "A private hello." : "An agreed site pilot."}
              </span>
            </div>
            <div className="journey-audience-copy" key={audience}>
              <h3>{useCase.heading}</h3>
              <p>{useCase.text}</p>
              <ul>
                {useCase.points.map((point) => (
                  <li key={point}>
                    <Icon name="check" />
                    {point}
                  </li>
                ))}
              </ul>
              <a href={useCase.href} className="journey-button">
                {useCase.note}
                <Icon name="arrow" />
              </a>
            </div>
          </div>
          <div className="journey-business-note">
            <span>
              <Icon name="tag" /> THE PILOT MODEL
            </span>
            <p>
              A sticker, a private contact page, and platform-managed alerts.
              Sticker requests are handled manually during the pilot. Pricing
              and service terms are confirmed by the operator.
            </p>
            <a href="/pricing">
              Pilot ordering <Icon name="arrow" />
            </a>
          </div>
        </section>
        <section className="journey-faq" id="questions">
          <div>
            <span className="journey-kicker">
              A FEW THINGS YOU MAY BE WONDERING
            </span>
            <h2>
              Good questions.
              <br />
              <em>Clear answers.</em>
            </h2>
            <p>Privacy should be easy to understand.</p>
            <a className="journey-text-button" href="/help">
              More help & safety <Icon name="arrow" />
            </a>
          </div>
          <div className="journey-faq-items">
            {questions.map(([question, answer], i) => (
              <details key={question}>
                <summary>
                  <span className="faq-index">0{i + 1}</span>
                  <span>{question}</span>
                  <span className="faq-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="journey-final">
          <div className="journey-final-qr" aria-hidden="true">
            <QrMark />
            <span>
              SMALL STICKER.
              <br />
              THOUGHTFUL IDEA.
            </span>
          </div>
          <span className="journey-kicker">LEAVE A WAY TO REACH YOU</span>
          <h2>
            Your next parking story
            <br />
            could use <em>a little less drama.</em>
          </h2>
          <a className="journey-button" href="/signin">
            Start with your car <Icon name="arrow" />
          </a>
          <p>
            Owner and scanner flows are available in the alpha.
            <br />
            Real messaging requires approved live service setup.
          </p>
        </section>
      </main>
      <footer className="journey-footer">
        <a className="journey-brand" href="/">
          <QrMark />
          <span>QR CAR</span>
        </a>
        <p>A little consideration. A private connection.</p>
        <nav aria-label="Footer">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/help">Help & safety</a>
          <a href="/dashboard">Owner area ↗</a>
        </nav>
        <small>
          QR CAR is a working product name. Calls are a later phase. For
          immediate danger, seek local emergency assistance or site security.
        </small>
      </footer>
    </div>
  );
}
