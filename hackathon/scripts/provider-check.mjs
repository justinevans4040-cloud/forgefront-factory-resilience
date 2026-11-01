import {runSmoke} from './smoke-meta.mjs';
import {writeEvidence,evidenceRun} from './public-evidence.mjs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
// Real nonce/identity requests, one per configured route. No server or stored credentials.
export async function checkProviders(options={}){
 const {includeBackup=false,...smokeOptions}=options;
 const env=smokeOptions.env??process.env;
 const results=await runSmoke({...smokeOptions,includeBackup,env:includeBackup?env:{...env,FIREWORKS_API_KEY:''}});
 if(!includeBackup){const backup=results.find(r=>r.provider==='spark-fireworks');if(backup)backup.error='Optional backup not requested; primary routes checked';}
 const primary=results.filter(r=>r.provider!=='spark-fireworks');
 return {passed:primary.every(r=>r.passed),policy:'One request per route; no retry, switch or Sample. Wonder and Baseten gate readiness. Fireworks is an optional backup that reports GREEN/RED and never fails the overall check. Identity is provider-reported.',providers:results.map(r=>({provider:r.provider,light:r.passed?'GREEN':'RED',status:r.status,elapsedMs:r.elapsedMs,requestedModel:r.requestedModel,returnedModel:r.returnedModel??null,reason:r.passed?'Live nonce and model identity matched':r.error,optionalBackup:r.provider==='spark-fireworks'}))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await checkProviders();
 for(const p of result.providers)console.log(`${p.light} ${p.provider} · ${p.elapsedMs}ms · ${p.reason}`);
 console.log(result.policy);
 writeEvidence(new URL('../evidence/'+evidenceRun()+'/providers.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 process.exitCode=result.passed?0:1;
}
