import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server.mjs';

test('selected route preflight is explicit, ledgered, red on failure and green only on nonce identity match',async()=>{
 let calls=0,fail=true;
 const env={HACKATHON_ADMIN_TOKEN:'synthetic-admin-token',HACKATHON_LEDGER_KEY:'synthetic-ledger-key',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-route-')),BASETEN_API_KEY:'synthetic-provider-key',FIREWORKS_API_KEY:'synthetic-other-key'};
 const app=createApp({models:{env,fetchImpl:async(url,{body})=>{calls++;if(fail)return new Response('{}',{status:503});const b=JSON.parse(body);const nonce=b.messages[0].content.match(/ROUTE_OK_[a-f0-9]+/)[0];return new Response(JSON.stringify({model:b.model,choices:[{message:{content:nonce}}]}));}}});
 const a=await app.listen(0),base='http://127.0.0.1:'+a.port;let auth={};
 const post=(path,body={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...auth},body:JSON.stringify(body)});
 try{
 assert.equal((await post('/api/workflow/provider-check',{provider:'baseten'})).status,401);assert.equal(calls,0);
 const s=await (await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+env.HACKATHON_ADMIN_TOKEN}})).json();auth={'X-Session-Token':s.session,'X-CSRF-Token':s.csrf};
 const red=await (await post('/api/workflow/provider-check',{provider:'baseten'})).json();assert.equal(red.light,'RED');assert.equal(calls,1);assert.match(red.reason,/503/);
 let status=await (await post('/api/workflow/status')).json();assert.equal(status.routeHealth.baseten.light,'RED');assert.equal(status.routeHealth.fireworks.light,'UNCHECKED');assert.equal(status.routeHealth.wonder.light,'RED');
 assert.equal((await post('/api/workflow/provider-check',{provider:'sample'})).status,400);assert.equal(calls,1);
 fail=false;const green=await (await post('/api/workflow/provider-check',{provider:'baseten'})).json();assert.equal(green.light,'GREEN');assert.equal(calls,2);
 const packet=await (await post('/api/workflow/export',{acknowledgePlaintext:'EXPORT PLAINTEXT'})).json();const events=packet.events.filter(e=>e.type==='model_call');assert.equal(events.length,2);assert.equal(packet.operationalRelease,false);
 for(const key of [env.BASETEN_API_KEY,env.FIREWORKS_API_KEY])assert.ok(!JSON.stringify({green,red,packet}).includes(key));
 }finally{await app.close();}
});

test('route check rejects identity and nonce mismatch, preserves role and CSRF guards and sanitizes failures',async()=>{
 let mode='identity',calls=0;
 const env={HACKATHON_ADMIN_TOKEN:'synthetic-admin-token',HACKATHON_LEDGER_KEY:'synthetic-ledger-key',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-route-guard-')),BASETEN_API_KEY:'synthetic-provider-secret',HACKATHON_OPERATORS_JSON:JSON.stringify([{id:'reader',role:'auditor',token:'synthetic-auditor-token'}])};
 const app=createApp({models:{env,fetchImpl:async(url,{body,signal})=>{calls++;const b=JSON.parse(body),nonce=b.messages[0].content.match(/ROUTE_OK_[a-f0-9]+/)[0];assert.equal(signal.aborted,false);if(mode==='timeout')throw Object.assign(Error(env.BASETEN_API_KEY),{name:'AbortError'});return new Response(JSON.stringify({model:mode==='identity'?'wrong-model':b.model,choices:[{message:{content:mode==='nonce'?'wrong-nonce':nonce}}]}));}}});
 const a=await app.listen(0),base='http://127.0.0.1:'+a.port;
 const login=async token=>(await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}})).json();
 let s=await login(env.HACKATHON_ADMIN_TOKEN);
 const post=(body,csrf=s.csrf)=>fetch(base+'/api/workflow/provider-check',{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':s.session,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 try{
 assert.equal((await post({provider:'baseten'},'wrong-csrf')).status,403);assert.equal(calls,0);
 assert.equal((await post({provider:'baseten',endpoint:'https://example.invalid'})).status,400);assert.equal(calls,0);
 for(mode of ['identity','nonce','timeout']){const result=await (await post({provider:'baseten'})).json();assert.equal(result.light,'RED');assert.ok(!JSON.stringify(result).includes(env.BASETEN_API_KEY));}
 assert.equal(calls,3);s=await login('synthetic-auditor-token');assert.equal((await post({provider:'baseten'})).status,403);assert.equal(calls,3);
 }finally{await app.close();}
});
