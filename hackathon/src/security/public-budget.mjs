import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {existsSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {createStateCodec} from './state-codec.mjs';

// Only the hosting edge may supply forwarding metadata. Direct clients cannot choose an identity.
export function isTrustedRenderProxy(address,env={}) {
 if(env.RENDER!=='true')return false;
 const ip=String(address??'').replace(/^::ffff:/,'');
 return ip==='::1'||/^127\./.test(ip)||/^10\./.test(ip)||/^192\.168\./.test(ip)||/^172\.(?:1[6-9]|2\d|3[01])\./.test(ip);
}
export function publicRequestIdentity(req,trustProxy=()=>false){
 const remote=req.socket?.remoteAddress??'unknown';
 if(!trustProxy(remote))return remote;
 // The last hop is appended by the trusted edge; ignore any client-prepended values.
 const forwarded=String(req.headers['x-forwarded-for']??'').split(',').at(-1)?.trim();
 return isIP(forwarded)?forwarded:remote;
}

// Reserve a whole bounded investigation/draft before it starts, including retries and tool turns.
// The encrypted daily counter survives process restarts and rolls over at the UTC day boundary.
export function createPublicBudget({visitorMaximum=10,dailyMaximum=300,now=Date.now,persistence,capacity=4096}={}){
 const codec=persistence?createStateCodec(persistence.key):null;
 let state={day:Math.floor(now()/86400000),count:0,visitors:[]};
 if(persistence&&existsSync(persistence.path)){
  try{
   state=codec.decode(readFileSync(persistence.path,'utf8'),'public-live-budget');
   if(!Number.isSafeInteger(state.day)||!Number.isSafeInteger(state.count)||state.count<0||!Array.isArray(state.visitors)||state.visitors.length>capacity)throw Error();
   for(const [id,e] of state.visitors)if(!/^[a-f0-9]{64}$/.test(id)||!Number.isFinite(e.start)||!Number.isSafeInteger(e.count)||e.count<0)throw Error();
  }catch{throw Error('PUBLIC_BUDGET_STATE_INVALID');}
 }
 let visitors=new Map(state.visitors);
 const persist=()=>{
  if(!persistence)return;
  const fd=openSync(persistence.path+'.next','w',0o600);
  try{writeFileSync(fd,codec.encode({...state,visitors:[...visitors]},'public-live-budget'));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(persistence.path+'.next',persistence.path);
 };
 return {reserve(identity){
  const time=now(),day=Math.floor(time/86400000);
  if(day>state.day){state.day=day;state.count=0;}
  if(state.count>=dailyMaximum)return {mode:'sample',reason:'Daily live capacity reached. Continuing with the offline Sample route.'};
  for(const [id,e] of visitors)if(time-e.start>=3600000)visitors.delete(id);
  const id=createHash('sha256').update(String(identity)).digest('hex');
  let entry=visitors.get(id);
  if(!entry){if(visitors.size>=capacity)return {mode:'limited',retryAfter:3600};entry={start:time,count:0};visitors.set(id,entry);}
  if(entry.count>=visitorMaximum)return {mode:'limited',retryAfter:Math.max(1,Math.ceil((3600000-(time-entry.start))/1000))};
  entry.count++;state.count++;persist();return {mode:'live'};
 }};
}
