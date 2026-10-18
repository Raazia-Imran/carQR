import { type User,requireAdmin } from './auth';
import { rows,one,tx } from './db';
import { requireValue,AppError } from './errors';
import { audit } from './security';
export async function adminOverview(user:User) {
 if(!user.admin_verified || !['ADMIN','OPERATOR'].includes(user.role)) throw new AppError(403,'ADMIN_REQUIRED','Staff sign-in and an authenticator code are required.');
 const tenant=user.role==='OPERATOR'?user.tenant_id:null;
 if(user.role==='OPERATOR'&&!tenant) throw new AppError(403,'TENANT_REQUIRED','A site assignment is required.');
 const tags=await rows('SELECT id,serial,state,created_at,tenant_id FROM tags WHERE ($1::uuid IS NULL OR tenant_id=$1) ORDER BY created_at DESC LIMIT 100',[tenant]);
 const incidents=await rows(`SELECT i.id,i.reason,i.state,i.created_at,t.serial FROM incidents i JOIN tags t ON t.id=i.tag_id WHERE ($1::uuid IS NULL OR t.tenant_id=$1) ORDER BY i.created_at DESC LIMIT 100`,[tenant]);
 const worker=user.role==='ADMIN'?await one("SELECT seen_at FROM worker_health WHERE id='notifications'"):null;
 const deliveries=user.role==='ADMIN'?await rows("SELECT id,channel,state,error_code,updated_at FROM outbox WHERE state IN ('FAILED','UNKNOWN','SUBMITTING') ORDER BY updated_at DESC LIMIT 50"):[];
 const auditLog=user.role==='ADMIN'?await rows('SELECT action,subject_id,created_at FROM audit_log ORDER BY created_at DESC LIMIT 30'):[];
 return {tags,incidents,worker,deliveries,auditLog};
}
export async function reconcile(user:User,id:string,outcome:'DELIVERED'|'FAILED') {
 requireAdmin(user);
 await tx(async db=>{
  const job=requireValue(await one('SELECT state FROM outbox WHERE id=$1 FOR UPDATE',[id],db));
  if(job.state!=='UNKNOWN') throw new AppError(409,'NOT_UNKNOWN','Only uncertain deliveries need manual reconciliation.');
  await db.query("UPDATE outbox SET state=$2,error_code='MANUALLY_CONFIRMED',updated_at=now() WHERE id=$1",[id,outcome]);
  await audit(user.id,`PROVIDER_CONFIRMED_${outcome}`,id,db);
 });return {ok:true};
}
