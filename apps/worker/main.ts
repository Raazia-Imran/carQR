import { setTimeout } from "node:timers/promises";
import { tick } from "../../packages/server/worker";
import { pool } from "../../packages/server/db";
import { config } from "../../packages/server/config";
config();
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
    if (!(await tick())) await setTimeout(1000);
  } catch {
    console.error(
      "Worker iteration failed; inspect database health and reconciliation queue.",
    );
    await setTimeout(2000);
  }
}
await pool().end();
