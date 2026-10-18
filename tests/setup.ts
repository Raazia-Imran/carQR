import { randomBytes } from "node:crypto";
import type pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "../scripts/migrate";
import { pool } from "../packages/server/db";
export async function setup() {
  Object.assign(process.env, {
    APP_ENV: "test",
    APP_ORIGIN: "http://localhost:3000",
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://local/test",
    PROVIDER_MODE: "simulation",
    AUTH_MODE: "simulation",
    PHONE_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
    PHONE_LOOKUP_HMAC_KEY: randomBytes(32).toString("hex"),
    SESSION_SECRET: randomBytes(32).toString("hex"),
    DAILY_MESSAGE_LIMIT: "10000",
    MESSAGING_ENABLED: "true",
    TRUST_PROXY: "false",
    META_APP_SECRET: randomBytes(32).toString("hex"),
    SMS_WEBHOOK_SECRET: randomBytes(32).toString("hex"),
  });
  if (process.env.TEST_DATABASE_URL) {
    if (!new URL(process.env.TEST_DATABASE_URL).pathname.includes("test"))
      throw new Error("Use a dedicated database with test in its name");
    await pool().query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  } else {
    const db = new PGlite();
    await db.waitReady;
    let tail = Promise.resolve();
    const lock = async () => {
      let release!: () => void;
      const previous = tail;
      tail = new Promise<void>((r) => {
        release = r;
      });
      await previous;
      return release;
    };
    async function query(sql: string, values?: unknown[]) {
      const result = values?.length
        ? await db.query(sql, values)
        : ((await db.exec(sql)).at(-1) ?? { rows: [], affectedRows: 0 });
      return { rows: result.rows, rowCount: result.affectedRows };
    }
    const shim = {
      query: async (sql: string, values?: unknown[]) => {
        const release = await lock();
        try {
          return await query(sql, values);
        } finally {
          release();
        }
      },
      connect: async () => {
        const release = await lock();
        return { query, release };
      },
      end: async () => db.close(),
    };
    (globalThis as unknown as { qrPool: pg.Pool }).qrPool =
      shim as unknown as pg.Pool;
  }
  await migrate();
}
