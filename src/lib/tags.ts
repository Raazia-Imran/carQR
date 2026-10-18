import { randomUUID } from 'node:crypto';
import { tx, one, rows } from './db';
import { token,hash,encrypt,decrypt,equal } from './crypto';
import { AppError,requireValue } from './errors';
import { audit,limit } from './security';
import { type User,requireAdmin } from './auth';
import { config } from './config';
export async function issueTags(user:User,count:number,tenantId:string|null) {
 requireAdmin(user);
 return tx(async db=>{
  const result=[];
  for(let i=0;i<count;i++) {
   const id=randomUUID(),publicToken=token(),claimSecret=token(),serial=`QR-${randomUUID().slice(0,8).toUpperCase()}`;
   await db.query('INSERT INTO tags(id,serial,public_hash,public_cipher,claim_hash,tenant_id) VALUES($1,$2,$3,$4,$5,$6)',[id,serial,hash(publicToken),encrypt(publicToken),hash(claimSecret),tenantId]);
   result.push({id,serial,url:`${config().appUrl}/s/${publicToken}`,claimSecret});
  }
  await audit(user.id,'TAG_BATCH_ISSUED',String(count),db); return result;
 });
}
export async function claimTag(user:User,serial:string,secret:string,label:string) {
 await limit(`claim:${user.id}`,10,900);
 return tx(async db=>{
  const tag=await one('SELECT * FROM tags WHERE serial=$1 FOR UPDATE',[serial.toUpperCase()],db);
  if(!tag || tag.state!=='UNCLAIMED' || !equal(tag.claim_hash,hash(secret))) throw new AppError(400,'CLAIM_FAILED','Check the serial and sealed activation code. This tag may already be activated.');
  await db.query("UPDATE tags SET owner_id=$2,label=$3,state='ACTIVE',claimed_at=now() WHERE id=$1",[tag.id,user.id,label]);
  await audit(user.id,'TAG_CLAIMED',tag.id,db); return {id:tag.id};
 });
}
export async function ownerTags(user:User) {
 const tags=await rows('SELECT id,serial,label,state,public_cipher,created_at FROM tags WHERE owner_id=$1 ORDER BY created_at DESC',[user.id]);
 return tags.map(({public_cipher,...t})=>({...t,url:`${config().appUrl}/s/${decrypt(public_cipher)}`}));
}
export async function updateTag(user:User,id:string,state:'ACTIVE'|'PAUSED'|'REVOKED',label?:string) {
 return tx(async db=>{
  const tag=requireValue(await one('SELECT * FROM tags WHERE id=$1 AND owner_id=$2 FOR UPDATE',[id,user.id],db));
  if(tag.state==='REVOKED') throw new AppError(409,'REVOKED','A revoked tag cannot be restored. Activate a replacement.');
  await db.query('UPDATE tags SET state=$2,label=COALESCE($3,label) WHERE id=$1',[id,state,label??null]);
  if(state!=='ACTIVE') {
   await db.query("UPDATE incidents SET state='CANCELLED' WHERE tag_id=$1 AND state='OPEN'",[id]);
   await db.query("UPDATE outbox SET state='CANCELLED' WHERE incident_id IN (SELECT id FROM incidents WHERE tag_id=$1) AND state='QUEUED'",[id]);
  }
  await audit(user.id,`TAG_${state}`,id,db);return {ok:true};
 });
}
export async function publicTag(publicToken:string) {
 // Deliberately no owner, serial, vehicle label or location in public output.
 const tag=await one('SELECT t.state,u.alerts_enabled,u.deleted_at FROM tags t LEFT JOIN users u ON t.owner_id=u.id WHERE t.public_hash=$1',[hash(publicToken)]);
 return {available:!!tag && tag.state==='ACTIVE' && tag.alerts_enabled && !tag.deleted_at};
}
