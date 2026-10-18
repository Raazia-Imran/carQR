import { randomUUID } from 'node:crypto';
import { type User } from './auth';
import { one,rows,tx } from './db';
import { token,hash } from './crypto';
import { config } from './config';
import { audit,limit } from './security';
import { AppError,requireValue } from './errors';
export async function updateAccount(user:User,name:string,alerts:boolean) {
 await tx(async db=>{
  await db.query('UPDATE users SET name=$2,alerts_enabled=$3 WHERE id=$1',[user.id,name,alerts]);
  if(!alerts) {
   await db.query("UPDATE incidents SET state='CANCELLED' WHERE owner_id=$1 AND state='OPEN'",[user.id]);
   await db.query("UPDATE outbox SET state='CANCELLED' WHERE recipient_id=$1 AND state='QUEUED' AND channel<>'OTP'",[user.id]);
  }
  await audit(user.id,alerts?'ALERT_CONSENT_GRANTED':'ALERT_CONSENT_WITHDRAWN',user.id,db);
 });return {ok:true};
}
export async function inviteBackup(user:User) {
 await limit(`backup:${user.id}`,3,86400);
 const secret=token(),id=randomUUID();
 await tx(async db=>{
  await db.query('UPDATE backup_invites SET revoked_at=now() WHERE owner_id=$1 AND revoked_at IS NULL',[user.id]);
  await db.query("INSERT INTO backup_invites(id,owner_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '2 days')",[id,user.id,hash(secret)]);
  await audit(user.id,'BACKUP_INVITED',id,db);
 });return {url:`${config().appUrl}/invite/${secret}`};
}
export async function acceptBackup(user:User,secret:string) {
 await tx(async db=>{
  const invite=requireValue(await one('SELECT * FROM backup_invites WHERE token_hash=$1 FOR UPDATE',[hash(secret)],db));
  if(invite.revoked_at || invite.accepted_by || invite.expires_at<=new Date() || invite.owner_id===user.id) throw new AppError(409,'INVALID_INVITE','This invitation cannot be accepted.');
  if(!user.alerts_enabled) throw new AppError(400,'CONSENT_REQUIRED','Enable alerts before accepting a backup invitation.');
  await db.query('UPDATE backup_invites SET accepted_by=$2,accepted_at=now() WHERE id=$1',[invite.id,user.id]);
  await audit(user.id,'BACKUP_CONSENT_ACCEPTED',invite.id,db);
 });return {ok:true};
}
export async function backups(user:User) {
 return rows(`SELECT b.id,b.accepted_at,b.expires_at,b.revoked_at, b.owner_id=$1 AS is_owner,
 CASE WHEN b.owner_id=$1 THEN COALESCE(u.name,'Awaiting acceptance') ELSE o.name END AS name
 FROM backup_invites b JOIN users o ON o.id=b.owner_id LEFT JOIN users u ON u.id=b.accepted_by
 WHERE (b.owner_id=$1 OR b.accepted_by=$1) AND b.revoked_at IS NULL`,[user.id]);
}
export async function revokeBackup(user:User,id:string) {
 await tx(async db=>{
  requireValue(await one('UPDATE backup_invites SET revoked_at=now() WHERE id=$1 AND (owner_id=$2 OR accepted_by=$2) RETURNING id',[id,user.id],db));
  await audit(user.id,'BACKUP_CONSENT_REVOKED',id,db);
 });return {ok:true};
}
export async function deleteAccount(user:User) {
 if(user.role!=='OWNER') throw new AppError(409,'STAFF_ACCOUNT','Remove staff privileges through the operator runbook before deleting this account.');
 await tx(async db=>{
  await db.query("UPDATE tags SET state='REVOKED' WHERE owner_id=$1",[user.id]);
  await db.query("UPDATE incidents SET state='CANCELLED' WHERE owner_id=$1 AND state IN ('OPEN','ACKNOWLEDGED')",[user.id]);
  await db.query("UPDATE outbox SET state='CANCELLED',payload_cipher=NULL WHERE (recipient_id=$1 OR incident_id IN (SELECT id FROM incidents WHERE owner_id=$1)) AND state='QUEUED'",[user.id]);
  await db.query('UPDATE backup_invites SET revoked_at=now() WHERE owner_id=$1 OR accepted_by=$1',[user.id]);
  await db.query('DELETE FROM sessions WHERE user_id=$1',[user.id]);
  await db.query("UPDATE users SET deleted_at=now(),name='Deleted account',phone_cipher='',phone_hash=$2,totp_cipher=NULL,alerts_enabled=false WHERE id=$1",[user.id,hash(token())]);
  await audit(user.id,'ACCOUNT_DELETED',user.id,db);
 });return {ok:true};
}
