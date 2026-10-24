import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";

const cli = fileURLToPath(
  new URL("../scripts/migrate-cli.ts", import.meta.url),
);
const fixture = new URL("./helpers/migration-db.ts", import.meta.url).href;
test("migration CLI applies migrations, reruns harmlessly and preserves records", async () => {
  const dir = await mkdtemp(join(tmpdir(), "qr migration test "));
  try {
    const dataDir = join(dir, "database");
    const run = () =>
      spawnSync(
        process.execPath,
        ["--import", "tsx", "--import", fixture, cli],
        {
          encoding: "utf8",
          timeout: 30000,
          env: {
            ...process.env,
            APP_ENV: "test",
            MIGRATION_TEST_DATABASE_DIR: dataDir,
          },
        },
      );
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /Migrations applied/);
    const db = new PGlite(dataDir);
    const names = (await readdir("migrations"))
      .filter((x) => x.endsWith(".sql"))
      .sort();
    assert.deepEqual(
      (
        await db.query<{ name: string }>(
          "SELECT name FROM schema_migration ORDER BY name",
        )
      ).rows.map((x) => x.name),
      names,
    );
    await db.exec(
      "CREATE TABLE migration_sentinel(value text); INSERT INTO migration_sentinel VALUES('preserve me')",
    );
    await db.close();
    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /schema is up to date/);
    const reopened = new PGlite(dataDir);
    assert.equal(
      (await reopened.query("SELECT * FROM migration_sentinel")).rows.length,
      1,
    );
    assert.equal(
      (await reopened.query("SELECT * FROM schema_migration")).rows.length,
      names.length,
    );
    await reopened.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("migration CLI exits nonzero without leaking driver details on failure", () => {
  const failure = `globalThis.qrPool={connect:async()=>{throw new Error('PRIVATE_DATABASE_CREDENTIAL')},end:async()=>{}}`;
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "data:text/javascript," + encodeURIComponent(failure),
      cli,
    ],
    { encoding: "utf8", timeout: 10000 },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Migration failed/);
  assert.ok(!result.stderr.includes("PRIVATE_DATABASE_CREDENTIAL"));
  assert.ok(!result.stdout.includes("Migrations applied"));
});
