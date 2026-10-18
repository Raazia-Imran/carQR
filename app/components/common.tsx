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
import { labels, type Reason } from "@/packages/shared/contracts";

export type Mode = {
  simulation: boolean;
  authSimulation: boolean;
  siteKey?: string;
};
export type Vehicle = { id: string; make: string; color: string };
export type Tag = { id: string; vehicle_id: string; state: string };
export type Incident = {
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
export type Dashboard = {
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
export type PublicState = {
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
export async function api<T>(
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
export function useResource<T>(path: string) {
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
export function useTask() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const run = async (fn: () => Promise<void>, success = "") => {
    if (running.current) return;
    running.current = true;
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
      running.current = false;
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
export function submit(fn: () => void) {
  return (e: FormEvent) => {
    e.preventDefault();
    fn();
  };
}
export function Car() {
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
export function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + value.toLowerCase()}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
export function Load({ error }: { error?: string }) {
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
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Header() {
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
export function Footer() {
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
