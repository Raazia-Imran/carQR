import { tick } from '../src/lib/worker';
import { pool } from '../src/lib/db';
import { config } from '../src/lib/config';
config(); let stopping=false;
for(const event of ['SIGINT','SIGTERM']) process.on(event,()=>{stopping=true;});
console.log('Notification worker started; transport mode:',process.env.APP_MODE);
while(!stopping) {try {const sent=await tick();if(!sent) await new Promise(resolve=>setTimeout(resolve,1000));} catch {console.error('Worker cycle failed. Check database/configuration; payloads are not logged.');await new Promise(resolve=>setTimeout(resolve,3000));}}
await pool.end();
