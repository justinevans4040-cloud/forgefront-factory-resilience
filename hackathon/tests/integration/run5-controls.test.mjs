import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server.mjs';
test('login failures are ledgered without credentials, role rights differ, and plaintext exports require acknowledgement',async()=>{
 const app=createApp({models:{env:{HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-controls-')),HACKATHON_LEDGER_KEY:'synthetic-ledger',HACKATHON_ADMIN_TOKEN:'synthetic-admin',HACKATHON_OPERATORS_JSON:JSON.stringify([{id:'planner',role:'operator',token:'synthetic-planner'}])}}});const addr=await app.listen(0);const base=`http://127.0.0.1:${addr.port}`;
 const login=token=>fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}});
 const post=(s,route,body={})=>fetch(base+'/api/workflow/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':s.session,'X-CSRF-Token':s.csrf},body:JSON.stringify(body)});
 try{
 assert.equal((await login('never-store-this-credential')).status,401);
 const admin=await (await login('synthetic-admin')).json(),operator=await (await login('synthetic-planner')).json();
 const packet=await (await post(admin,'export',{acknowledgePlaintext:'EXPORT PLAINTEXT'})).json();assert.match(packet.label,/PLAINTEXT EXPORT/);assert.ok(packet.events.some(e=>e.type==='login_failed'));assert.ok(!packet.events.some(e=>e.type==='snapshot_initialized'));assert.ok(!JSON.stringify(packet).includes('never-store-this-credential'));
 assert.match((await (await post(admin,'report',{acknowledgePlaintext:'EXPORT PLAINTEXT'})).json()).text,/PLAINTEXT EXPORT/);
 assert.equal((await post(admin,'export')).status,400);assert.equal((await post(admin,'report')).status,400);
 assert.equal((await post(admin,'report',{acknowledgePlaintext:'EXPORT PLAINTEXT'})).status,200);
 assert.equal((await post(operator,'reset')).status,403);assert.equal((await post(admin,'revoke')).status,403);
 assert.equal((await post(operator,'revoke')).status,200);assert.equal((await post(admin,'reset')).status,200);
 }finally{await app.close();}
});
test('failed login attempts are bounded with Retry-After and cannot bypass the limit using forwarded headers',async()=>{
 const app=createApp({models:{env:{HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-login-limit-')),HACKATHON_LEDGER_KEY:'synthetic-ledger',HACKATHON_ADMIN_TOKEN:'synthetic-admin'}}});const addr=await app.listen(0);
 try{let response;for(let i=0;i<13;i++)response=await fetch(`http://127.0.0.1:${addr.port}/api/meta/session`,{method:'POST',headers:{Authorization:'Bearer wrong','X-Forwarded-For':'client-'+i}});assert.equal(response.status,429);assert.ok(Number(response.headers.get('Retry-After'))>0);}finally{await app.close();}
});

test('server restart requires reauthentication and restores consent only to its original named operator',async()=>{
 const env={HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-durable-consent-')),HACKATHON_LEDGER_KEY:'synthetic-ledger',HACKATHON_OPERATORS_JSON:JSON.stringify([{id:'planner',role:'operator',token:'synthetic-planner'},{id:'peer',role:'operator',token:'synthetic-peer'}])};
 let app=createApp({models:{env}}),addr=await app.listen(0),base=`http://127.0.0.1:${addr.port}`;
 const login=async token=>(await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}})).json();
 const post=(s,route,body={})=>fetch(base+'/api/workflow/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':s.session,'X-CSRF-Token':s.csrf},body:JSON.stringify(body)});
 try{
 const before=await login('synthetic-planner');const run=await (await post(before,'investigate',{provider:'sample'})).json();const optionId=run.analysis.recovery.options.find(o=>o.feasible).optionId;
 const envelope=await (await post(before,'review',{runId:run.runId,optionId})).json();await app.close();app=createApp({models:{env}});addr=await app.listen(0);base=`http://127.0.0.1:${addr.port}`;
 assert.equal((await post(before,'status')).status,401);
 const peer=await login('synthetic-peer'),owner=await login('synthetic-planner');assert.equal((await (await post(peer,'status')).json()).pendingConsents.length,0);
 assert.equal((await post(peer,'confirm',{nonce:envelope.nonce,typed:`APPROVE ${optionId}`})).status,409);
 assert.equal((await (await post(owner,'status')).json()).pendingConsents.length,1);
 const accepted=await post(owner,'confirm',{nonce:envelope.nonce,typed:`APPROVE ${optionId}`});assert.equal(accepted.status,200);const decision=await accepted.json();assert.equal(decision.resumedAfterRestart,true);assert.match(decision.confirmationActor,/^[a-f0-9]{64}$/);assert.notEqual(decision.confirmationActor,envelope.actor);
 assert.equal((await post(owner,'confirm',{nonce:envelope.nonce,typed:`APPROVE ${optionId}`})).status,409);
 }finally{await app.close();}
});
