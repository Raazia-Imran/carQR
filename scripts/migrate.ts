import { readFile, readdir } from 'node:fs/promises';
import { pool, tx } from '../src/lib/db';
export async function migrate() {
 await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of (await readdir('db/migrations')).filter(x=>x.endsWith('.sql')).sort()) {
  await tx(async db=>{ await db.query("SELECT pg_advisory_xact_lock(73129001)");
   if((await db.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rowCount) return;
   await db.query(await readFile(`db/migrations/${name}`,'utf8')); await db.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);
  });
 }
}
if(import.meta.url === `file://${process.argv[1]}`) { await migrate(); console.log('Database migrations applied.'); await pool.end(); }
