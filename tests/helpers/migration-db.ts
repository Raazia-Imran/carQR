// Isolated child-process database for the real migration CLI tests.
import { PGlite } from "@electric-sql/pglite";
import type pg from "pg";
if (process.env.APP_ENV !== "test" || !process.env.MIGRATION_TEST_DATABASE_DIR)
  throw new Error("Migration fixture requires its own test database");
const db = new PGlite(process.env.MIGRATION_TEST_DATABASE_DIR);
await db.waitReady;
async function query(sql: string, values?: unknown[]) {
  const result = values?.length
    ? await db.query(sql, values)
    : ((await db.exec(sql)).at(-1) ?? { rows: [], affectedRows: 0 });
  return {
    rows: result.rows,
    rowCount: result.rows.length || result.affectedRows,
  };
}
(globalThis as unknown as { qrPool: pg.Pool }).qrPool = {
  query,
  connect: async () => ({ query, release() {} }),
  end: async () => db.close(),
} as unknown as pg.Pool;
