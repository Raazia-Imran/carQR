"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneController, SceneInput } from "./scene";

function IllustratedFallback() {
  return (
    <svg
      className="journey-fallback-art"
      viewBox="0 0 700 530"
      role="img"
      aria-label="Illustrated mint car parked beside a little building and QR contact sticker"
    >
      <defs>
        <linearGradient id="carPaint" x2="0" y2="1">
          <stop stopColor="#c6edc9" />
          <stop offset="1" stopColor="#78b58f" />
        </linearGradient>
        <linearGradient id="street" x2="0" y2="1">
          <stop stopColor="#e5e7ce" />
          <stop offset="1" stopColor="#ced4b4" />
        </linearGradient>
      </defs>
      <ellipse cx="350" cy="432" rx="260" ry="41" fill="#254e3b" opacity=".1" />
      <path d="M70 315 387 215 650 350 333 475Z" fill="url(#street)" />
      <path d="M70 315v25l263 160 317-124v-26L333 475Z" fill="#b6c3a1" />
      <path d="m130 320 245-74 217 107-254 98Z" fill="#e9dfc5" />
      <path d="m165 210 122-38 132 67v93l-122 43-132-72Z" fill="#f9edd5" />
      <path d="m153 208 135-44 143 73-133 46Z" fill="#d57c66" />
      <path d="m294 273 47 23v67l-47 16Z" fill="#285343" />
      <path d="m360 282 30 15v37l-30-15Z" fill="#abd7b3" />
      <g stroke="#355e43" strokeWidth="8" strokeLinecap="round">
        <path d="M120 321v-78m446 109v-87" />
      </g>
      <g fill="#60894f">
        <circle cx="116" cy="224" r="41" />
        <circle cx="558" cy="251" r="43" />
      </g>
      <g fill="#8db176">
        <circle cx="131" cy="201" r="28" />
        <circle cx="575" cy="227" r="28" />
      </g>
      <g className="fallback-car">
        <path
          d="m196 316 49-51 116-21 87 33 44 51v50l-114 52-177-62Z"
          fill="url(#carPaint)"
        />
        <path d="m245 265 43-64 90-11 64 40 6 47-87-33Z" fill="#a9dcb6" />
        <path d="m294 207 76-9 47 30-69 21-84-25Z" fill="#32594e" />
        <path d="m269 238 71 25-1 57-91-32Z" fill="#2b5348" />
        <path d="m356 264 72-22 9 41-81 31Z" fill="#2b5348" />
        <path d="m200 341 176 62 115-48v24l-114 52-177-63Z" fill="#6ea184" />
        <ellipse
          cx="256"
          cy="376"
          rx="26"
          ry="37"
          transform="rotate(-15 256 376)"
          fill="#263a31"
        />
        <ellipse
          cx="256"
          cy="376"
          rx="12"
          ry="21"
          transform="rotate(-15 256 376)"
          fill="#faf2db"
        />
        <ellipse
          cx="435"
          cy="388"
          rx="25"
          ry="35"
          transform="rotate(10 435 388)"
          fill="#263a31"
        />
        <ellipse
          cx="435"
          cy="388"
          rx="12"
          ry="19"
          transform="rotate(10 435 388)"
          fill="#faf2db"
        />
        <path d="m437 313 27-9v16l-27 10Z" fill="#fff1c5" />
        <path d="m379 333 27-10v17l-27 10Z" fill="#fff1c5" />
        <path
          d="m402 355 29-10"
          stroke="#224938"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="m368 270 19-6v22l-19 7Z" fill="#fffbec" />
        <path d="m372 273 11-3v13l-11 4Z" fill="#285542" />
      </g>
    </svg>
  );
}
export default function CarScene(input: SceneInput) {
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<SceneController>(null),
    latest = useRef(input);
  latest.current = input;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    void import("./scene")
      .then(({ createCarScene }) => {
        if (disposed || !host.current) return;
        try {
          controller.current = createCarScene(host.current, () => {
            controller.current?.dispose();
            controller.current = null;
            setReady(false);
          });
          controller.current.update(latest.current);
          setReady(true);
        } catch {
          setReady(false);
        }
      })
      .catch(() => setReady(false));
    return () => {
      disposed = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    controller.current?.update(input);
  }, [input.progress, input.pointerX, input.pointerY, input.motion]);
  return (
    <div
      className={"journey-car-scene " + (ready ? "is-ready" : "is-fallback")}
    >
      <IllustratedFallback />
      <div className="journey-webgl-host" ref={host} aria-hidden="true" />
      <span className="scene-render-label">
        {ready ? "A tiny 3D parking story" : "A tiny parking story"}
      </span>
    </div>
  );
}
