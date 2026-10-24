import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorkerReporter,
  safeFailure,
} from "../packages/server/diagnostics";
test("worker diagnostics classify database failures without driver details or untrusted codes", () => {
  const error = Object.assign(new Error("PRIVATE_DESTINATION_AND_SQL"), {
    code: "42P01",
    detail: "PRIVATE_PAYLOAD",
    query: "PRIVATE_SQL",
  });
  assert.equal(safeFailure(error).code, "schema_missing");
  assert.match(safeFailure(error).hint, /db:migrate/);
  assert.equal(
    safeFailure(
      new AggregateError([
        Object.assign(new Error("PRIVATE_HOST"), { code: "ECONNREFUSED" }),
      ]),
    ).code,
    "database_unreachable",
  );
  const output = JSON.stringify([
    safeFailure(error),
    safeFailure({ code: "PRIVATE_SECRET" }),
  ]);
  assert.ok(!output.includes("PRIVATE"));
});
test("worker diagnostics throttle repeats, report recovery and resume after the interval", () => {
  const logs: string[] = [];
  let now = 0;
  const reporter = createWorkerReporter(
    (line) => logs.push(line),
    () => now,
  );
  const error = { code: "42P01", message: "PRIVATE" };
  reporter.failed(error);
  reporter.failed(error);
  assert.equal(logs.length, 1);
  now = 30000;
  reporter.failed(error);
  assert.equal(JSON.parse(logs[1]).suppressed, 1);
  reporter.failed(error);
  reporter.recovered();
  assert.equal(JSON.parse(logs[2]).event, "worker_recovered");
  reporter.failed(error);
  assert.equal(logs.length, 4);
  assert.ok(!logs.join("").includes("PRIVATE"));
  assert.match(JSON.parse(logs[0]).reference, /^[a-f0-9-]{36}$/);
});
