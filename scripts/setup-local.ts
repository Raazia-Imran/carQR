import { randomBytes } from 'node:crypto';
import { writeFile, mkdir, access } from 'node:fs/promises';
try { await access('.env'); console.log('.env exists; left unchanged.'); } catch {
 await mkdir('.local',{recursive:true,mode:0o700});
 await writeFile('.env',`APP_MODE=local\nAPP_URL=http://localhost:3000\nDATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/carqr\nDATA_KEY=${randomBytes(32).toString('hex')}\nHASH_KEY=${randomBytes(32).toString('hex')}\nNOTIFICATION_PROVIDER=local\n`,{mode:0o600});
 console.log('Local configuration created. Start npm run db:local, migrate, then dev and worker in separate terminals.');
}
