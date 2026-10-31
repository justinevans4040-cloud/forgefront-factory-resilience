import {runSmoke} from './smoke-meta.mjs';
import {writeEvidence} from './public-evidence.mjs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
// Real nonce/identity requests, one per configured route. No server or stored credentials.
export async function checkProviders(options={}){
 const results=await runSmoke(options);
 return {passed:results.every(r=>r.passed),policy:'One request per route; no retry, switch or Sample. Identity is provider-reported.',providers:results.map(r=>({provider:r.provider,light:r.passed?'GREEN':'RED',status:r.status,elapsedMs:r.elapsedMs,requestedModel:r.requestedModel,returnedModel:r.returnedModel??null,reason:r.passed?'Live nonce and model identity matched':r.error}))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await checkProviders();
 for(const p of result.providers)console.log(`${p.light} ${p.provider} · ${p.elapsedMs}ms · ${p.reason}`);
 console.log(result.policy);
 writeEvidence(new URL('../evidence/run10/providers.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 process.exitCode=result.passed?0:1;
}
