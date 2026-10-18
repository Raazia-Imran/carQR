import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { config } from './config';
import { hash,token,equal } from './crypto';
import { pool } from './db';
import { AppError } from './errors';
import { requestOtp,verifyOtp,sessionUser,verifyMfa,phoneSchema } from './auth';
import { issueTags,claimTag,ownerTags,updateTag,publicTag } from './tags';
import { createIncident,scannerStatus,ownerIncidents,respondToIncident,reasons } from './incidents';
import { updateAccount,inviteBackup,acceptBackup,backups,revokeBackup,deleteAccount } from './account';
import { adminOverview,reconcile } from './admin';
import { verifySignature } from './providers';
import { applyReceipt } from './worker';
import { limit } from './security';
const uuid=z.string().uuid();
const opaque=z.string().regex(/^[\w-]{32}$/);
function cookies(req:Request) {return Object.fromEntries((req.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')));}
function cookie(name:string,value:string,maxAge:number) {return `${name}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${config().appUrl.startsWith('https://')?'; Secure':''}`;}
function json(data:unknown,status=200,extra:Record<string,string>={}) {return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});}
async function bodyText(req:Request) {
 if(Number(req.headers.get('content-length')||0)>65536) throw new AppError(413,'BODY_TOO_LARGE','Request is too large.');
 const reader=req.body?.getReader();if(!reader) return '';
 const chunks:Uint8Array[]=[];let size=0;
 while(true) {const {done,value}=await reader.read();if(done) break;size+=value.byteLength;if(size>65536){await reader.cancel();throw new AppError(413,'BODY_TOO_LARGE','Request is too large.');}chunks.push(value);}
 return Buffer.concat(chunks).toString('utf8');
}
export async function handle(req:Request):Promise<Response> {
 const requestId=randomUUID();
 try {
  const cfg=config(),url=new URL(req.url),path=url.pathname.replace(/^\/api\/?/,'').split('/'),method=req.method;
  const c=cookies(req),ip=process.env.TRUST_PROXY==='true'?(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim():'untrusted-edge';
  const webhook=path[0]==='webhooks';
  if(!['GET','HEAD'].includes(method)&&!webhook) {
   if(req.headers.get('origin')!==new URL(cfg.appUrl).origin) throw new AppError(403,'ORIGIN','Request origin is not allowed.');
   if(!req.headers.get('content-type')?.startsWith('application/json')) throw new AppError(415,'CONTENT_TYPE','Use application/json.');
  }
  const raw=['POST','PATCH','DELETE'].includes(method)?await bodyText(req):'';
  let parsed:unknown={};
  if(raw) {try {parsed=JSON.parse(raw);}catch {throw new AppError(400,'INVALID_JSON','Invalid JSON.');}}
  const user=()=>sessionUser(c.carqr_session);
  if(method==='GET'&&path[0]==='health') {await pool.query('SELECT 1');return json({ok:true});}
  if(method==='GET'&&path[0]==='session') {
   let account=null;try {account=await user();}catch(e){if(!(e instanceof AppError&&e.status===401))throw e;}
   return json({user:account,mode:cfg.mode},200,c.carqr_scanner?{}:{'Set-Cookie':cookie('carqr_scanner',token(),86400)});
  }
  if(method==='POST'&&path.join('/')==='auth/request-code') {
   const input=z.object({phone:phoneSchema}).strict().parse(parsed);
   return json(await requestOtp(input.phone,ip),202);
  }
  if(method==='POST'&&path.join('/')==='auth/verify-code') {
   const input=z.object({challengeId:uuid,code:z.string().regex(/^\d{6}$/),name:z.string().trim().min(1).max(60),consent:z.boolean()}).strict().parse(parsed);
   const {session}=await verifyOtp(input.challengeId,input.code,ip,input.name,input.consent);
   return json({ok:true},200,{'Set-Cookie':cookie('carqr_session',session,7*86400)});
  }
  if(method==='POST'&&path.join('/')==='auth/mfa') {const input=z.object({code:z.string().regex(/^\d{6}$/)}).strict().parse(parsed);await verifyMfa(await user(),c.carqr_session,input.code);return json({ok:true});}
  if(method==='POST'&&path.join('/')==='auth/logout') {if(c.carqr_session)await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hash(c.carqr_session)]);return json({ok:true},200,{'Set-Cookie':cookie('carqr_session','',0)});}
  if(method==='GET'&&path[0]==='tags'&&path.length===2) return json(await publicTag(opaque.parse(path[1])));
  if(method==='POST'&&path[0]==='tags'&&path[2]==='incidents'&&path.length===3) {
   if(!c.carqr_scanner) throw new AppError(400,'SESSION_REQUIRED','Enable cookies and reload before sending an alert.');
   const input=z.object({reason:z.enum(reasons),idempotencyKey:uuid}).strict().parse(parsed);
   return json(await createIncident(opaque.parse(path[1]),input.reason,c.carqr_scanner,input.idempotencyKey,ip),201);
  }
  if(method==='GET'&&path[0]==='incidents'&&path.length===2) {if(!c.carqr_scanner)throw new AppError(404,'NOT_FOUND','Not found');return json(await scannerStatus(uuid.parse(path[1]),c.carqr_scanner));}
  if(path[0]==='owner') {
   const account=await user();
   if(method==='GET'&&path.length===1) return json({user:account,tags:await ownerTags(account),incidents:await ownerIncidents(account),backups:await backups(account)});
   if(method==='POST'&&path[1]==='claim') {const input=z.object({serial:z.string().regex(/^QR-[A-Z0-9]{8}$/i),secret:opaque,label:z.string().trim().min(1).max(60)}).strict().parse(parsed);return json(await claimTag(account,input.serial,input.secret,input.label),201);}
   if(method==='PATCH'&&path[1]==='tags'&&path.length===3) {const input=z.object({state:z.enum(['ACTIVE','PAUSED','REVOKED']),label:z.string().trim().min(1).max(60).optional()}).strict().parse(parsed);return json(await updateTag(account,uuid.parse(path[2]),input.state,input.label));}
   if(method==='POST'&&path[1]==='incidents'&&path.length===3) {const input=z.object({response:z.enum(['ON_MY_WAY','UNAVAILABLE','RESOLVED'])}).strict().parse(parsed);return json(await respondToIncident(account,uuid.parse(path[2]),input.response));}
   if(method==='PATCH'&&path[1]==='profile') {const input=z.object({name:z.string().trim().min(1).max(60),alerts:z.boolean()}).strict().parse(parsed);return json(await updateAccount(account,input.name,input.alerts));}
   if(method==='POST'&&path[1]==='backup'&&path.length===2) return json(await inviteBackup(account),201);
   if(method==='POST'&&path[1]==='backup'&&path[2]==='accept') {const input=z.object({token:opaque,consent:z.literal(true)}).strict().parse(parsed);return json(await acceptBackup(account,input.token));}
   if(method==='DELETE'&&path[1]==='backup'&&path.length===3) return json(await revokeBackup(account,uuid.parse(path[2])));
   if(method==='GET'&&path[1]==='export') return json({generatedAt:new Date().toISOString(),profile:account,tags:await ownerTags(account),incidents:await ownerIncidents(account),backups:await backups(account)},200,{'Content-Disposition':'attachment; filename="carqr-account.json"'});
   if(method==='DELETE'&&path[1]==='account') {z.object({confirmation:z.literal('DELETE')}).strict().parse(parsed);return json(await deleteAccount(account),200,{'Set-Cookie':cookie('carqr_session','',0)});}
  }
  if(path[0]==='admin') {
   const account=await user();
   if(method==='GET'&&path.length===1) return json(await adminOverview(account));
   if(method==='POST'&&path[1]==='tags') {const input=z.object({count:z.number().int().min(1).max(25),tenantId:uuid.nullable().default(null)}).strict().parse(parsed);return json({tags:await issueTags(account,input.count,input.tenantId)},201);}
   if(method==='POST'&&path[1]==='reconcile'&&path.length===3) {const input=z.object({outcome:z.enum(['DELIVERED','FAILED']),providerEvidenceConfirmed:z.literal(true)}).strict().parse(parsed);return json(await reconcile(account,uuid.parse(path[2]),input.outcome));}
  }
  if(method==='POST'&&path[0]==='voice') throw new AppError(503,'VOICE_NOT_ENABLED','Calling is not enabled. A contracted and validated provider is required.');
  if(method==='GET'&&path.join('/')==='webhooks/meta') {
   if(process.env.META_VERIFY_TOKEN && equal(url.searchParams.get('hub.verify_token')||'',process.env.META_VERIFY_TOKEN)&&url.searchParams.get('hub.mode')==='subscribe') return new Response(url.searchParams.get('hub.challenge')||'',{headers:{'Cache-Control':'no-store'}});
   throw new AppError(403,'SIGNATURE','Invalid verification token.');
  }
  if(method==='POST'&&path.join('/')==='webhooks/meta') {
   if(!verifySignature(raw,req.headers.get('x-hub-signature-256'),process.env.META_APP_SECRET)) throw new AppError(401,'SIGNATURE','Invalid signature.');
   const input=z.object({object:z.string(),entry:z.array(z.object({changes:z.array(z.object({value:z.object({statuses:z.array(z.object({id:z.string().max(256),status:z.enum(['sent','delivered','read','failed']),timestamp:z.string().max(30)})).optional()})}))}))}).parse(parsed);
   for(const entry of input.entry) for(const change of entry.changes) for(const status of change.value.statuses||[]) {
    const mapping={sent:'ACCEPTED',delivered:'DELIVERED',read:'READ',failed:'FAILED'} as const;
    const applied=await applyReceipt(`meta:${status.id}:${status.status}:${status.timestamp}`,status.id,mapping[status.status]);
    if(!applied) throw new AppError(503,'RETRY_RECEIPT','Submission not yet recorded. Retry this receipt.');
   }
   return json({ok:true});
  }
  if(method==='POST'&&path.join('/')==='webhooks/sms') {
   if(!verifySignature(raw,req.headers.get('x-carqr-signature'),process.env.SMS_WEBHOOK_SECRET)) throw new AppError(401,'SIGNATURE','Invalid signature.');
   const input=z.object({eventId:z.string().min(1).max(256),providerId:z.string().min(1).max(256),status:z.enum(['ACCEPTED','DELIVERED','FAILED'])}).strict().parse(parsed);
   if(!await applyReceipt(`sms:${input.eventId}`,input.providerId,input.status)) throw new AppError(503,'RETRY_RECEIPT','Submission not yet recorded. Retry this receipt.');
   return json({ok:true});
  }
  await limit(`unknown-route:${ip}`,60,60);
  throw new AppError(404,'NOT_FOUND','Endpoint not found.');
 } catch(e) {
  if(e instanceof z.ZodError) return json({error:'VALIDATION',message:'Check your inputs.',fields:e.issues.map(x=>({field:x.path.join('.'),message:x.message}))},400);
  if(e instanceof AppError) return json({error:e.code,message:e.message,requestId},e.status);
  console.error('Request failed',requestId); // Do not log URL, payload, phone or provider error objects.
  return json({error:'INTERNAL',message:'Something went wrong. Please try again.',requestId},500);
 }
}
