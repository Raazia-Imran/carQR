import pg, { type PoolClient, type QueryResultRow } from "pg";
import { config } from "./config";
const globalDb = globalThis as unknown as { qrPool?: pg.Pool };
export function pool() {
  return (globalDb.qrPool ??= new pg.Pool({
    connectionString: config().DATABASE_URL,
    max: 15,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  }));
}
export type DB = Pick<pg.Pool, "query"> | PoolClient;
export async function rows<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
  db: DB = pool(),
): Promise<T[]> {
  return (await db.query<T>(sql, values)).rows;
}
export async function one<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
  db: DB = pool(),
): Promise<T | undefined> {
  return (await rows<T>(sql, values, db))[0];
}
export async function transaction<T>(
  fn: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const db = await pool().connect();
  try {
    await db.query("BEGIN");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
