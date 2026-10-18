import { appendFile,mkdir } from 'node:fs/promises';
import { randomUUID,createHmac } from 'node:crypto';
import { config } from './config';
import { equal } from './crypto';
export type Message={id:string;channel:'WHATSAPP'|'SMS'|'BACKUP'|'OTP';phone:string;text:string;reason?:string;incidentId?:string};
export type SendResult={state:'ACCEPTED'|'FAILED'|'UNKNOWN';providerId?:string;errorCode?:string};
export async function sendMessage(message:Message):Promise<SendResult> {
 const cfg=config();
 if(cfg.mode==='local') {
  await mkdir('.local',{recursive:true,mode:0o700});
  // A private development mailbox. Never available through HTTP, never a real send.
  await appendFile('.local/mailbox.jsonl',JSON.stringify({at:new Date().toISOString(),id:message.id,channel:message.channel,text:message.text})+'\n',{mode:0o600});
  return {state:'ACCEPTED',providerId:`local-${randomUUID()}`};
 }
 let url:string,body:unknown,authorization:string;
 if(message.channel==='WHATSAPP') {
  const version=process.env.META_GRAPH_VERSION;
  const phoneId=process.env.META_PHONE_NUMBER_ID;
  if(!/^v\d+\.\d+$/.test(version||'')||!/^\d+$/.test(phoneId||'')) return {state:'FAILED',errorCode:'META_CONFIG'};
  url=`https://graph.facebook.com/${version}/${phoneId}/messages`;
  authorization=`Bearer ${process.env.META_ACCESS_TOKEN}`;
  body={messaging_product:'whatsapp',to:message.phone,type:'template',template:{name:process.env.META_TEMPLATE_NAME,language:{code:process.env.META_TEMPLATE_LANGUAGE||'en'},components:[{type:'body',parameters:[{type:'text',text:message.reason||'Vehicle alert'},{type:'text',text:`${cfg.appUrl}/owner`}]}]}};
 } else {
  url=process.env.SMS_GATEWAY_URL!;
  if(!url.startsWith('https://')) return {state:'FAILED',errorCode:'SMS_CONFIG'};
  authorization=`Bearer ${process.env.SMS_GATEWAY_TOKEN}`;
  body={idempotencyKey:message.id,to:message.phone,text:message.text};
 }
 try {
  const response=await fetch(url,{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json','Idempotency-Key':message.id},body:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:'error'});
  if(response.status>=400 && response.status<500) return {state:'FAILED',errorCode:`PROVIDER_HTTP_${response.status}`};
  if(!response.ok) return {state:'UNKNOWN',errorCode:'AMBIGUOUS_PROVIDER_RESPONSE'};
  const json=await response.json();
  const providerId=message.channel==='WHATSAPP'?json.messages?.[0]?.id:json.id;
  if(typeof providerId!=='string' || !providerId || providerId.length>256) return {state:'UNKNOWN',errorCode:'MISSING_PROVIDER_ID'};
  return {state:'ACCEPTED',providerId};
 } catch { return {state:'UNKNOWN',errorCode:'PROVIDER_TIMEOUT_OR_NETWORK'}; }
}
export function verifySignature(raw:string,signature:string|null,secret:string|undefined) {
 if(!secret||!signature) return false;
 return equal(signature,`sha256=${createHmac('sha256',secret).update(raw).digest('hex')}`);
}
