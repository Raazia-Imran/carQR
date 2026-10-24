import { readdir, readFile } from "node:fs/promises";
import { transaction } from "../packages/server/db";
export async function migrate() {
  await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(748291)");
    await db.query(
      "CREATE TABLE IF NOT EXISTS schema_migration(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (await readdir("migrations"))
      .filter((x) => x.endsWith(".sql"))
      .sort()) {
      if (
        (
          await db.query("SELECT name FROM schema_migration WHERE name=$1", [
            name,
          ])
        ).rowCount
      )
        continue;
      await db.query(await readFile("migrations/" + name, "utf8"));
      await db.query("INSERT INTO schema_migration(name) VALUES($1)", [name]);
    }
  });
}
