"use client";
import { useEffect } from "react";
import { useResource, Header, Footer, type Mode } from "./components/common";
import { Home, SignIn, Scanner, Progress, Policy } from "./components/public";
import { Workspace } from "./components/owner";
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
