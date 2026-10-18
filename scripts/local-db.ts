import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
if(process.env.APP_MODE !== 'local') throw new Error('Embedded database is development-only.');
const db = await PGlite.create('./.local/postgres');
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port:5433});
await server.start(); console.log('Local PostgreSQL-compatible database on 127.0.0.1:5433');
for(const event of ['SIGINT','SIGTERM']) process.on(event,async()=>{await server.stop();await db.close();process.exit(0);});
