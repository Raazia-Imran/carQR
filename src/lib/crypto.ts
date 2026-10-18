import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './config';
export const token = () => randomBytes(24).toString('base64url');
export const hash = (value: string) => createHmac('sha256', Buffer.from(config().hashKey,'hex')).update(value).digest('hex');
export function encrypt(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm',Buffer.from(config().dataKey,'hex'),iv);
  const ciphertext = Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),ciphertext].map(x=>x.toString('base64url')).join('.');
}
export function decrypt(value: string) {
  const [iv,tag,ciphertext] = value.split('.').map(x=>Buffer.from(x,'base64url'));
  const decipher = createDecipheriv('aes-256-gcm',Buffer.from(config().dataKey,'hex'),iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8');
}
export function equal(a: string,b: string) { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); }
