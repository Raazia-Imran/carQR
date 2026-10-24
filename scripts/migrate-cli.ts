import { migrate } from "./migrate";
import { pool } from "../packages/server/db";

let database: ReturnType<typeof pool> | undefined;
try {
  database = pool();
  await migrate();
  console.log("Migrations applied. Database schema is up to date.");
} catch {
  // Driver errors can contain credentials, SQL and private data.
  console.error(
    "Migration failed. Check database configuration and availability.",
  );
  process.exitCode = 1;
} finally {
  await database?.end();
}
