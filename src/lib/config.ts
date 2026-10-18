import 'dotenv/config';
export function config() {
  const mode = process.env.APP_MODE || 'local';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const dataKey = process.env.DATA_KEY || '';
  const hashKey = process.env.HASH_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(dataKey) || !/^[a-f0-9]{64}$/i.test(hashKey)) throw new Error('Configure separate 32-byte DATA_KEY and HASH_KEY values. Run npm run setup:local.');
  if (dataKey === hashKey) throw new Error('Encryption and hash keys must differ.');
  if (!['local','live'].includes(mode)) throw new Error('Invalid APP_MODE');
  const provider = process.env.NOTIFICATION_PROVIDER || 'local';
  if (mode === 'live' && (provider !== 'live' || !appUrl.startsWith('https://') || !process.env.SMS_GATEWAY_URL || !process.env.SMS_GATEWAY_TOKEN || !process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID || !process.env.META_APP_SECRET || !process.env.META_VERIFY_TOKEN || !process.env.SMS_WEBHOOK_SECRET)) throw new Error('Live mode requires HTTPS, Meta credentials, contracted SMS and signed webhooks.');
  if (mode === 'local' && provider !== 'local') throw new Error('Local mode cannot send live messages.');
  const seconds = (key: string, fallback: number) => {
    const value = Number(process.env[key] || fallback);
    if (!Number.isInteger(value) || value < 1 || value > 86400) throw new Error(`Invalid ${key}`);
    return value;
  };
  return { mode, appUrl, dataKey, hashKey, provider,
    smsDelay: seconds('SMS_DELAY_SECONDS',90), backupDelay: seconds('BACKUP_DELAY_SECONDS',180),
    ttl: seconds('INCIDENT_TTL_SECONDS',600), dailySmsLimit: seconds('DAILY_SMS_LIMIT',100) };
}
