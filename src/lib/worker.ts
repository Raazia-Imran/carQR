import { tx,one,pool } from './db';
import { decrypt } from './crypto';
import { config } from './config';
import { sendMessage,type SendResult,type Message } from './providers';
const labels:Record<string,string>={BLOCKING:'Your vehicle may be blocking access.',LIGHTS:'Your vehicle lights may be on.',DAMAGE:'Someone has reported possible vehicle damage.',URGENT:'Someone has reported an urgent concern about your vehicle.'};
export async function tick(send:(message:Message)=>Promise<SendResult>=sendMessage) {
 const cfg=config();
 await pool.query("INSERT INTO worker_health(id,seen_at) VALUES('notifications',now()) ON CONFLICT(id) DO UPDATE SET seen_at=now()");
 await pool.query("UPDATE incidents SET state='EXPIRED' WHERE state='OPEN' AND expires_at<=now()");
 // A crashed sender may have submitted. Do not retry an uncertain delivery.
 await pool.query("UPDATE outbox SET state='UNKNOWN',error_code='STALE_SUBMISSION',payload_cipher=NULL,updated_at=now() WHERE state='SUBMITTING' AND updated_at<now()-interval '2 minutes'");
 const message=await tx(async db=>{
  const job=await one("SELECT * FROM outbox WHERE state='QUEUED' AND due_at<=now() ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT 1",[],db);
  if(!job) return null;
  const cancel=async(code:string)=>{await db.query("UPDATE outbox SET state='CANCELLED',payload_cipher=NULL,error_code=$2,updated_at=now() WHERE id=$1",[job.id,code]);return null;};
  let payload:Message;
  if(job.channel==='OTP') {
   const challenge=await one('SELECT expires_at,consumed_at FROM otp_challenges WHERE id=$1',[job.challenge_id],db);
   if(!challenge||challenge.consumed_at||challenge.expires_at<=new Date()) return cancel('OTP_EXPIRED');
   payload={id:job.id,channel:'OTP',...JSON.parse(decrypt(job.payload_cipher))};
  } else {
   const incident=await one(`SELECT i.*,t.state AS tag_state,u.alerts_enabled,u.deleted_at,u.phone_cipher FROM incidents i JOIN tags t ON t.id=i.tag_id JOIN users u ON u.id=i.owner_id WHERE i.id=$1 FOR UPDATE OF i`,[job.incident_id],db);
   if(!incident||incident.state!=='OPEN'||incident.expires_at<=new Date()||incident.tag_state!=='ACTIVE'||!incident.alerts_enabled||incident.deleted_at) return cancel('NO_LONGER_ELIGIBLE');
   let phone=decrypt(incident.phone_cipher);
   if(job.channel==='BACKUP') {
    const backup=await one(`SELECT u.id,u.phone_cipher FROM backup_invites b JOIN users u ON u.id=b.accepted_by WHERE b.owner_id=$1 AND b.accepted_at IS NOT NULL AND b.revoked_at IS NULL AND u.deleted_at IS NULL AND u.alerts_enabled=true LIMIT 1`,[incident.owner_id],db);
    if(!backup) return cancel('NO_CONSENTED_BACKUP');
    phone=decrypt(backup.phone_cipher);
    await db.query('UPDATE outbox SET recipient_id=$2 WHERE id=$1',[job.id,backup.id]);
   }
   const reason=labels[incident.reason];
   payload={id:job.id,channel:job.channel,phone,reason,incidentId:incident.id,text:`QR CAR: ${job.channel==='BACKUP'?'A vehicle owner you support has not acknowledged an alert. ':''}${reason} ${job.channel==='BACKUP'?'Please contact them through your usual channel.':`Open ${cfg.appUrl}/owner to respond.`} Alert ${incident.id.slice(0,8)}. Delivery does not guarantee a response.`};
  }
  if(job.channel!=='WHATSAPP') {
   const budget=await one('INSERT INTO notification_budget(day,used) VALUES(CURRENT_DATE,1) ON CONFLICT(day) DO UPDATE SET used=notification_budget.used+1 RETURNING used',[],db);
   if(Number(budget?.used)>cfg.dailySmsLimit) return cancel('DAILY_SMS_LIMIT');
  }
  await db.query("UPDATE outbox SET state='SUBMITTING',updated_at=now() WHERE id=$1",[job.id]);
  return payload;
 });
 if(!message) return false;
 // Transaction committed before external I/O. A concurrent acknowledgement cannot recall an in-flight send.
 const result=await send(message).catch(()=>({state:'UNKNOWN',errorCode:'UNEXPECTED_TRANSPORT_ERROR'} as SendResult));
 await tx(async db=>{
  const current=await one('SELECT state,provider_id FROM outbox WHERE id=$1 FOR UPDATE',[message.id],db);
  if(!current || !['SUBMITTING','UNKNOWN'].includes(current.state)) return;
  await db.query('UPDATE outbox SET state=$2,provider_id=$3,error_code=$4,payload_cipher=NULL,updated_at=now() WHERE id=$1',[message.id,result.state,result.providerId??null,result.errorCode??null]);
  if(result.state==='FAILED'&&message.channel==='WHATSAPP') await db.query("UPDATE outbox SET due_at=now() WHERE incident_id=$1 AND channel='SMS' AND state='QUEUED'",[message.incidentId]);
 });
 return true;
}
export async function applyReceipt(eventId:string,providerId:string,status:'ACCEPTED'|'DELIVERED'|'READ'|'FAILED') {
 return tx(async db=>{
  const job=await one('SELECT id,state FROM outbox WHERE provider_id=$1 FOR UPDATE',[providerId],db);
  // Ask provider to retry a callback that raced the submission response.
  if(!job) return false;
  const inserted=await db.query('INSERT INTO webhook_events(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id',[eventId]);
  if(!inserted.rowCount) return true;
  const ranks:Record<string,number>={SUBMITTING:0,UNKNOWN:0,ACCEPTED:1,FAILED:2,DELIVERED:3,READ:4};
  if((ranks[status]??0)>(ranks[job.state]??99)) await db.query('UPDATE outbox SET state=$2,updated_at=now() WHERE id=$1',[job.id,status]);
  return true;
 });
}
