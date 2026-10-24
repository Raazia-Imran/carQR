import { test } from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config";
test("development debugging permits eval only in development; production retains CSP controls", async () => {
  const env = process.env as Record<string, string | undefined>;
  const original = env.NODE_ENV;
  try {
    for (const mode of ["development", "production", "test", undefined]) {
      if (mode === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = mode;
      const rules = await nextConfig.headers!();
      const headers = rules[0].headers;
      const csp = headers.find(
        (h) => h.key === "Content-Security-Policy",
      )!.value;
      assert.equal(csp.includes("'unsafe-eval'"), mode === "development");
      for (const directive of [
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ])
        assert.ok(csp.includes(directive));
      assert.ok(!csp.includes("script-src *"));
      assert.equal(
        headers.find((h) => h.key === "X-Frame-Options")!.value,
        "DENY",
      );
    }
  } finally {
    if (original === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = original;
  }
});
