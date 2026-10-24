import { randomUUID } from "node:crypto";
import { z } from "zod";

const failures = {
  "42P01": [
    "schema_missing",
    "Run npm run db:migrate before starting the worker.",
  ],
  "42703": [
    "schema_outdated",
    "Run npm run db:migrate for this application version.",
  ],
  "28P01": [
    "database_authentication",
    "Check the private database credentials.",
  ],
  "3D000": ["database_missing", "Check that the configured database exists."],
  "53300": ["database_capacity", "Check database connection capacity."],
  ECONNREFUSED: [
    "database_unreachable",
    "Check that PostgreSQL is running and reachable.",
  ],
  ENOTFOUND: ["database_hostname", "Check the database hostname."],
  ETIMEDOUT: [
    "database_timeout",
    "Check database availability and network access.",
  ],
} as const;

export function safeFailure(error: unknown): { code: string; hint: string } {
  if (error instanceof z.ZodError)
    return {
      code: "configuration_invalid",
      hint: "Check the private application configuration.",
    };
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  if (typeof code === "string" && Object.hasOwn(failures, code)) {
    const [safeCode, hint] = failures[code as keyof typeof failures];
    return { code: safeCode, hint };
  }
  if (error instanceof AggregateError) {
    for (const nested of error.errors) {
      const nestedCode =
        nested && typeof nested === "object" ? nested.code : undefined;
      if (
        typeof nestedCode === "string" &&
        Object.hasOwn(failures, nestedCode)
      ) {
        const [safeCode, hint] = failures[nestedCode as keyof typeof failures];
        return { code: safeCode, hint };
      }
    }
  }
  return {
    code: "worker_iteration_failed",
    hint: "Check database health and the staff reconciliation queue.",
  };
}

export function createWorkerReporter(
  log: (line: string) => void = console.error,
  now = Date.now,
) {
  let previous = "",
    lastLogged = 0,
    suppressed = 0;
  return {
    failed(error: unknown) {
      const safe = safeFailure(error);
      const time = now();
      if (previous === safe.code && time - lastLogged < 30000) {
        suppressed++;
        return;
      }
      log(
        JSON.stringify({
          event: "worker_iteration_failed",
          ...safe,
          reference: randomUUID(),
          suppressed,
        }),
      );
      previous = safe.code;
      lastLogged = time;
      suppressed = 0;
    },
    recovered() {
      if (previous)
        log(
          JSON.stringify({
            event: "worker_recovered",
            previousCode: previous,
            suppressed,
          }),
        );
      previous = "";
      suppressed = 0;
    },
  };
}
