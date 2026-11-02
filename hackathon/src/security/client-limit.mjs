import {createHash} from 'node:crypto';
import {existsSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {createStateCodec} from './state-codec.mjs';
// Direct socket identity only; encrypted fixed-window counters are committed before granting requests.
export function createClientLimiter({maximum=240,windowMs=60000,now=Date.now,capacity=4096,persistence,identityFor=req=>req.socket?.remoteAddress??'unknown'}={}){
 const codec=persistence?createStateCodec(persistence.key):null;
 let clients=new Map();
 if(persistence&&existsSync(persistence.path)){
  try{
   const state=codec.decode(readFileSync(persistence.path,'utf8'),'client-quota');
   if(state.maximum!==maximum||state.windowMs!==windowMs||!Array.isArray(state.clients)||state.clients.length>capacity)throw Error();
   for(const [id,entry] of state.clients){if(!/^[a-f0-9]{64}$/.test(id)||!Number.isFinite(entry.start)||!Number.isInteger(entry.count)||entry.count<0||entry.count>maximum)throw Error();}
   clients=new Map(state.clients);
  }catch{
   // Corrupt or incompatible quota state must not take down the recovery room.
   clients=new Map();
  }
 }
 function persist(){
  if(!persistence)return;
  try{
   const fd=openSync(persistence.path+'.next','w',0o600);
   try{writeFileSync(fd,codec.encode({maximum,windowMs,clients:[...clients]},'client-quota'));fsyncSync(fd);}finally{closeSync(fd);}
   renameSync(persistence.path+'.next',persistence.path);
  }catch(error){
   console.warn('client-limit: quota persist skipped ('+(error?.code||error?.message||'write-failed')+')');
  }
 }
 return req=>{
  const time=now(),identity=createHash('sha256').update(identityFor(req)).digest('hex');
  for(const [id,entry]of clients)if(time-entry.start>=windowMs)clients.delete(id);
  let entry=clients.get(identity);
  if(!entry){if(clients.size>=capacity)return {allowed:false,retryAfter:Math.ceil(windowMs/1000)};entry={start:time,count:0};clients.set(identity,entry);}
  const allowed=entry.count<maximum;if(allowed){entry.count++;persist();}
  return {allowed,retryAfter:Math.max(1,Math.ceil((windowMs-(time-entry.start))/1000))};
 };
};
