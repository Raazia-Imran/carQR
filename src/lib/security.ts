import { randomUUID } from 'node:crypto';
import { type DB, one, pool } from './db';
import { AppError } from './errors';
import { hash } from './crypto';
export async function limit(key:string,max:number,seconds:number,db:DB=pool) {
  const result=await one(`INSERT INTO rate_limits(key,count,reset_at) VALUES($1,1,now()+$2*interval '1 second')
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<=now() THEN 1 ELSE rate_limits.count+1 END,
    reset_at=CASE WHEN rate_limits.reset_at<=now() THEN now()+$2*interval '1 second' ELSE rate_limits.reset_at END RETURNING count`,[hash(key),seconds],db);
  if(Number(result?.count)>max) throw new AppError(429,'RATE_LIMIT','Please wait before trying again.');
}
export async function audit(actor:string|null,action:string,subject:string|null,db:DB=pool) {await db.query('INSERT INTO audit_log(id,actor_id,action,subject_id) VALUES($1,$2,$3,$4)',[randomUUID(),actor,action,subject]);}
