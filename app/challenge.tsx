"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
type Widget = {
  render: (node: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Widget;
  }
}
export default function Challenge({
  siteKey,
  onToken,
}: {
  siteKey?: string;
  onToken: (token: string) => void;
}) {
  const node = useRef<HTMLDivElement>(null),
    widget = useRef<string>(undefined),
    callback = useRef(onToken);
  callback.current = onToken;
  const [failure, setFailure] = useState(false);
  const render = useCallback(() => {
    if (!siteKey || !node.current || !window.turnstile || widget.current)
      return;
    widget.current = window.turnstile.render(node.current, {
      sitekey: siteKey,
      size: "flexible",
      callback: (value: string) => callback.current(value),
      "expired-callback": () => callback.current(""),
      "error-callback": () => {
        callback.current("");
        setFailure(true);
      },
    });
  }, [siteKey]);
  useEffect(() => {
    render();
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [render]);
  if (!siteKey) return null;
  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={render}
        onError={() => setFailure(true)}
      />
      <div ref={node} />
      {failure && (
        <p role="alert" className="small">
          Verification could not load. Check your connection and refresh before
          submitting.
        </p>
      )}
    </div>
  );
}
