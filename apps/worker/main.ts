import { setTimeout } from "node:timers/promises";
import { tick } from "../../packages/server/worker";
import { pool } from "../../packages/server/db";
import { config } from "../../packages/server/config";
import { createWorkerReporter } from "../../packages/server/diagnostics";
config();
const reporter = createWorkerReporter();
let running = true;
process.on("SIGTERM", () => {
  running = false;
});
process.on("SIGINT", () => {
  running = false;
});
console.log(
  "QR CAR worker started. Destinations and payloads are never logged.",
);
while (running) {
  try {
    const worked = await tick();
    reporter.recovered();
    if (!worked) await setTimeout(1000);
  } catch (error) {
    reporter.failed(error);
    await setTimeout(2000);
  }
}
await pool().end();
