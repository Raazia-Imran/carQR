import { Pool, type PoolClient, type QueryResultRow } from 'pg';
const globalDb = globalThis as unknown as {carqrPool?: Pool};
export const pool = globalDb.carqrPool ||= new Pool({connectionString: process.env.DATABASE_URL, max:10, connectionTimeoutMillis:5000, idleTimeoutMillis:10000});
export type DB = Pick<PoolClient,'query'>;
export async function rows<T extends QueryResultRow = QueryResultRow>(sql:string,values:unknown[]=[],db:DB=pool):Promise<T[]> { return (await db.query<T>(sql,values)).rows; }
export async function one<T extends QueryResultRow = QueryResultRow>(sql:string,values:unknown[]=[],db:DB=pool):Promise<T|undefined> { return (await rows<T>(sql,values,db))[0]; }
export async function tx<T>(fn:(db:DB)=>Promise<T>):Promise<T> { const client=await pool.connect(); try { await client.query('BEGIN'); const result=await fn(client); await client.query('COMMIT'); return result; } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); } }
