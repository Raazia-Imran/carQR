import EmbeddedPostgres from "embedded-postgres";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
loadEnvFile(".env");
if (process.env.APP_ENV !== "local")
  throw new Error("Local database helper requires APP_ENV=local");
const url = new URL(process.env.DATABASE_URL!);
const pg = new EmbeddedPostgres({
  databaseDir: ".local/postgres",
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port),
  persistent: true,
  createPostgresUser: process.getuid?.() === 0,
  onLog: () => {},
  onError: () => {},
  postgresFlags: ["-h", "127.0.0.1"],
});
if (!existsSync(".local/postgres/PG_VERSION")) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const name = url.pathname.slice(1);
if (
  !(await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]))
    .rowCount
)
  await pg.createDatabase(name);
await client.end();
console.log("Local PostgreSQL is ready on loopback. Leave this terminal open.");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
