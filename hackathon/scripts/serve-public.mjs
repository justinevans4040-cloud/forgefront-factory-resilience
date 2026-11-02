import {createApp} from '../server.mjs';
import {accessSync,constants,mkdirSync,mkdtempSync,unlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export function resolveWritableStateDir(preferred, {
 tmpdir:tempRoot=tmpdir(),
 warn=console.warn,
 mkdirSync:mkdir=mkdirSync,
 accessSync:access=accessSync,
 writeFileSync:write=writeFileSync,
 unlinkSync:unlink=unlinkSync,
 mkdtempSync:mkdtemp=mkdtempSync,
}={}){
 const candidates=[];
 if(typeof preferred==='string'&&preferred.trim())candidates.push(preferred.trim());
 candidates.push(join(tempRoot,'ffr-public-state'));
 for(const directory of candidates){
  try{
   mkdir(directory,{recursive:true});
   access(directory,constants.W_OK);
   const probe=join(directory,'.ffr-write-probe');
   write(probe,'ok');
   unlink(probe);
   if(preferred&&directory!==preferred.trim())warn('HACKATHON_STATE_DIR is not writable; continuing with a local fallback directory');
   return directory;
  }catch{
   // try the next candidate
  }
 }
 return mkdtemp(join(tempRoot,'ffr-public-'));
}

export function publicEnvironment(source=process.env){
 const env={...source,HACKATHON_DEMO_MODE:source.HACKATHON_DEMO_MODE==='0'?'0':'1',HACKATHON_OPERATORS_JSON:source.HACKATHON_DEMO_MODE==='0'?(source.HACKATHON_OPERATORS_JSON??''):'',HACKATHON_ADMIN_TOKEN:source.HACKATHON_ADMIN_TOKEN?.trim()||randomBytes(24).toString('hex'),HACKATHON_LEDGER_KEY:source.HACKATHON_LEDGER_KEY?.trim()||randomBytes(32).toString('hex'),HACKATHON_STATE_DIR:resolveWritableStateDir(source.HACKATHON_STATE_DIR)};
 delete env.FIREWORKS_API_KEY;
 return env;
}
export async function startPublicServer({env:source=process.env,fetchImpl=globalThis.fetch}={}){
 const env=publicEnvironment(source);
 const hostnames=[env.RENDER_EXTERNAL_HOSTNAME,env.VERCEL_URL,env.PUBLIC_HOSTNAME,'forgefront-factory-resilience.onrender.com']
  .filter(Boolean)
  .map(value=>String(value).replace(/^https?:\/\//i,'').split('/')[0].split(':')[0].toLowerCase());
 const allowedHosts=['127.0.0.1','localhost',...new Set(hostnames)];
 if(allowedHosts.some(h=>!/^[a-z0-9.-]+$/i.test(h)))throw Error('Invalid public hostname');
 const port=Number(source.PORT??10000);
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid public port');
 const app=createApp({guards:{allowedHosts},models:{env,fetchImpl},publicHosting:{}});
 try{return {app,address:await app.listen(port,'0.0.0.0'),env};}catch(error){await app.close().catch(()=>{});throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {app,address}=await startPublicServer();
 console.log('The Meta Hackathon build is serving publicly on port '+address.port+' (public entry).');
 let closing=false;
 const stop=async()=>{if(closing)return;closing=true;await app.close();};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
