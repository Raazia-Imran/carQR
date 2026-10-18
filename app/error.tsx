"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="narrow section">
      <h1>We couldn’t load this page.</h1>
      <p>
        Your request may not have been submitted. Check your connection and try
        again.
      </p>
      <button onClick={reset}>Try again</button>
      <a href="/">Go home</a>
    </main>
  );
}
