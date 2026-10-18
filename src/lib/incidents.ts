import { randomUUID } from 'node:crypto';
import { tx,one,rows } from './db';
import { hash } from './crypto';
import { AppError,requireValue } from './errors';
import { type User } from './auth';
import { limit,audit } from './security';
import { config } from './config';
export const reasons=['BLOCKING','LIGHTS','DAMAGE','URGENT'] as const;
export type Reason=typeof reasons[number];
export async function createIncident(publicToken:string,reason:Reason,scanner:string,key:string,ip:string) {
 const scannerHash=hash(scanner),requestHash=hash(`${publicToken}:${reason}`);
 return tx(async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${scannerHash}:${key}`]);
  const existing=await one('SELECT id,request_hash FROM incidents WHERE scanner_hash=$1 AND idempotency_key=$2',[scannerHash,key],db);
  if(existing) {if(existing.request_hash!==requestHash) throw new AppError(409,'IDEMPOTENCY_CONFLICT','Use a new request key for a different alert.');return {id:existing.id};}
  const tag=await one(`SELECT t.*,u.alerts_enabled,u.deleted_at FROM tags t JOIN users u ON u.id=t.owner_id WHERE public_hash=$1 FOR UPDATE OF t`,[hash(publicToken)],db);
  if(!tag || tag.state!=='ACTIVE'||!tag.alerts_enabled||tag.deleted_at) throw new AppError(404,'UNAVAILABLE','This tag is not available for alerts.');
  await limit(`scan-ip:${ip}`,10,300,db); await limit(`scan-tag:${tag.id}`,3,300,db); await limit(`scan-session:${scanner}`,3,300,db);
  const id=randomUUID(),cfg=config();
  await db.query("INSERT INTO incidents(id,tag_id,owner_id,scanner_hash,idempotency_key,request_hash,reason,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+$8*interval '1 second')",[id,tag.id,tag.owner_id,scannerHash,key,requestHash,reason,cfg.ttl]);
  for(const [channel,delay] of [['WHATSAPP',0],['SMS',cfg.smsDelay],['BACKUP',cfg.backupDelay]] as const) {
   await db.query("INSERT INTO outbox(id,incident_id,channel,due_at,recipient_id) VALUES($1,$2,$3,now()+$4*interval '1 second',$5)",[randomUUID(),id,channel,delay,tag.owner_id]);
  }
  return {id};
 });
}
export async function scannerStatus(id:string,scanner:string) {
 const incident=requireValue(await one('SELECT id,reason,state,response,created_at,expires_at FROM incidents WHERE id=$1 AND scanner_hash=$2',[id,hash(scanner)]));
 return incident;
}
export async function ownerIncidents(user:User) {
 return rows(`SELECT i.id,i.reason,i.state,i.response,i.created_at,i.expires_at,t.label,
 COALESCE((SELECT json_agg(json_build_object('channel',o.channel,'state',o.state)) FROM outbox o WHERE o.incident_id=i.id),'[]') AS deliveries
 FROM incidents i JOIN tags t ON t.id=i.tag_id WHERE i.owner_id=$1 ORDER BY i.created_at DESC LIMIT 100`,[user.id]);
}
export async function respondToIncident(user:User,id:string,response:'ON_MY_WAY'|'UNAVAILABLE'|'RESOLVED') {
 return tx(async db=>{
  const incident=requireValue(await one('SELECT * FROM incidents WHERE id=$1 AND owner_id=$2 FOR UPDATE',[id,user.id],db));
  if(['CANCELLED','EXPIRED','RESOLVED'].includes(incident.state)) throw new AppError(409,'CLOSED','This alert is already closed.');
  if(incident.expires_at<=new Date()&&incident.state==='OPEN') throw new AppError(409,'EXPIRED','This alert has expired.');
  // UNAVAILABLE is a human response but leaves escalation running to a consenting backup.
  const state=response==='RESOLVED'?'RESOLVED':response==='ON_MY_WAY'?'ACKNOWLEDGED':'OPEN';
  await db.query("UPDATE incidents SET state=$2,response=$3,acknowledged_at=CASE WHEN $2='ACKNOWLEDGED' THEN now() ELSE acknowledged_at END,resolved_at=CASE WHEN $2='RESOLVED' THEN now() ELSE resolved_at END WHERE id=$1",[id,state,response]);
  if(state!=='OPEN') await db.query("UPDATE outbox SET state='CANCELLED',updated_at=now() WHERE incident_id=$1 AND state='QUEUED'",[id]);
  await audit(user.id,`INCIDENT_${response}`,id,db);return {ok:true};
 });
}
