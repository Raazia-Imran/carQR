import { randomInt, randomUUID } from 'node:crypto';
import { TOTP, Secret } from 'otpauth';
import { z } from 'zod';
import { tx, one, pool, type DB } from './db';
import { encrypt, decrypt, hash, token, equal } from './crypto';
import { AppError } from './errors';
import { limit, audit } from './security';
export const phoneSchema=z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use international format, for example +92 followed by your number without its leading 0.');
export type User={id:string;name:string;role:'OWNER'|'ADMIN'|'OPERATOR';tenant_id:string|null;alerts_enabled:boolean;admin_verified:boolean};
export async function requestOtp(phone:string,ip:string) {
 phoneSchema.parse(phone);
 await limit(`otp-ip:${ip}`,10,3600); await limit(`otp-phone:${phone}`,4,900);
 const id=randomUUID(),code=String(randomInt(100000,1000000));
 await tx(async db=>{
  await db.query('UPDATE otp_challenges SET consumed_at=now() WHERE phone_hash=$1 AND consumed_at IS NULL',[hash(phone)]);
  await db.query("INSERT INTO otp_challenges(id,phone_hash,phone_cipher,code_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '5 minutes')",[id,hash(phone),encrypt(phone),hash(`${id}:${code}`)]);
  await db.query("INSERT INTO outbox(id,challenge_id,channel,due_at,payload_cipher) VALUES($1,$2,'OTP',now(),$3)",[randomUUID(),id,encrypt(JSON.stringify({phone,text:`Your QR CAR sign-in code is ${code}. It expires in 5 minutes. Do not share it.`}))]);
 });
 return {challengeId:id};
}
export async function verifyOtp(id:string,code:string,ip:string,name:string,consent:boolean) {
 await limit(`verify:${ip}`,30,900);
 const result=await tx(async db=>{
  const c=await one('SELECT * FROM otp_challenges WHERE id=$1 FOR UPDATE',[id],db);
  if(!c || c.consumed_at || c.expires_at<=new Date() || c.attempts>=5) return null;
  await db.query('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=$1',[id]);
  if(!equal(c.code_hash,hash(`${id}:${code}`))) return null;
  await db.query('UPDATE otp_challenges SET consumed_at=now() WHERE id=$1',[id]);
  let user=await one('SELECT * FROM users WHERE phone_hash=$1',[c.phone_hash],db);
  if(user?.deleted_at) return null;
  if(!user) {
   if(!consent) return {consentRequired:true} as const;
   user=await one('INSERT INTO users(id,phone_cipher,phone_hash,name) VALUES($1,$2,$3,$4) ON CONFLICT(phone_hash) DO UPDATE SET phone_hash=EXCLUDED.phone_hash RETURNING *',[randomUUID(),c.phone_cipher,c.phone_hash,name],db);
   await audit(user!.id,'ACCOUNT_CREATED_WITH_ALERT_CONSENT',user!.id,db);
  }
  const session=token();
  await db.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hash(session),user!.id]);
  return {session};
 });
 if(!result) throw new AppError(400,'INVALID_CODE','Code is invalid, expired, or already used. Request a new code.');
 if('consentRequired' in result) throw new AppError(400,'CONSENT_REQUIRED','New accounts need agreement to the service and alert consent. Request a new code after accepting.');
 return result;
}
export async function sessionUser(session:string|undefined,db:DB=pool):Promise<User> {
 if(!session) throw new AppError(401,'SIGN_IN','Please sign in.');
 const user=await one<User>(`SELECT u.id,u.name,u.role,u.tenant_id,u.alerts_enabled,s.admin_verified FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.deleted_at IS NULL`,[hash(session)],db);
 if(!user) throw new AppError(401,'SIGN_IN','Your session has expired. Please sign in again.');
 return user;
}
export function requireAdmin(user:User) {if(user.role!=='ADMIN'||!user.admin_verified) throw new AppError(403,'ADMIN_REQUIRED','Administrator access and an authenticator code are required.');}
export async function verifyMfa(user:User,session:string,code:string) {
 if(user.role!=='ADMIN' && user.role!=='OPERATOR') throw new AppError(403,'FORBIDDEN','Staff access required.');
 await limit(`mfa:${user.id}`,8,900);
 const valid=await tx(async db=>{
  const account=await one('SELECT totp_cipher,totp_last_step FROM users WHERE id=$1 FOR UPDATE',[user.id],db);
  if(!account?.totp_cipher) return false;
  const totp=new TOTP({secret:Secret.fromBase32(decrypt(account.totp_cipher)),algorithm:'SHA1',digits:6,period:30});
  const delta=totp.validate({token:code,window:1});
  const step=Math.floor(Date.now()/30000)+(delta??0);
  if(delta===null || step<=Number(account.totp_last_step)) return false;
  await db.query('UPDATE users SET totp_last_step=$2 WHERE id=$1',[user.id,step]);
  await db.query("UPDATE sessions SET admin_verified=true,expires_at=LEAST(expires_at,now()+interval '8 hours') WHERE token_hash=$1",[hash(session)]);
  await audit(user.id,'STAFF_MFA_VERIFIED',user.id,db); return true;
 });
 if(!valid) throw new AppError(400,'INVALID_MFA','Invalid or reused authenticator code.');
}
