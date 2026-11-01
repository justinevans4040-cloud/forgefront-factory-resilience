import {createApp} from '../server.mjs';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export function publicEnvironment(source=process.env){
 const env={...source,HACKATHON_DEMO_MODE:'1',HACKATHON_OPERATORS_JSON:'',HACKATHON_ADMIN_TOKEN:source.HACKATHON_ADMIN_TOKEN?.trim()||randomBytes(24).toString('hex'),HACKATHON_LEDGER_KEY:source.HACKATHON_LEDGER_KEY?.trim()||randomBytes(32).toString('hex'),HACKATHON_STATE_DIR:source.HACKATHON_STATE_DIR?.trim()||mkdtempSync(join(tmpdir(),'ffr-public-'))};
 delete env.FIREWORKS_API_KEY;
 return env;
}
export async function startPublicServer({env:source=process.env,fetchImpl=globalThis.fetch}={}){
 const env=publicEnvironment(source);
 const allowedHosts=['127.0.0.1','localhost',env.RENDER_EXTERNAL_HOSTNAME||'forgefront-factory-resilience.onrender.com'];
 if(allowedHosts.some(h=>!/^[a-z0-9.-]+$/i.test(h)))throw Error('Invalid public hostname');
 const port=Number(source.PORT??10000);
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid public port');
 const app=createApp({guards:{allowedHosts},models:{env,fetchImpl},publicHosting:{}});
 try{return {app,address:await app.listen(port,'0.0.0.0')};}catch(error){await app.close().catch(()=>{});throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {app,address}=await startPublicServer();
 console.log('The Meta Hackathon build is serving publicly on port '+address.port+'.');
 let closing=false;
 const stop=async()=>{if(closing)return;closing=true;await app.close();};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
