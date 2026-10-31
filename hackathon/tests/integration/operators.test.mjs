import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('named operators have separate authenticated identities and auditors cannot invoke privileged workflow',async()=>{
 const accounts=[{id:'planner',role:'operator',token:'synthetic-planner-token'},{id:'judge',role:'auditor',token:'synthetic-judge-token'}];
 const app=createApp({models:{env:{HACKATHON_OPERATORS_JSON:JSON.stringify(accounts),HACKATHON_LEDGER_KEY:'synthetic-ledger',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-iam-'))}}});const addr=await app.listen(0);const base=`http://127.0.0.1:${addr.port}`;
 async function login(token){const r=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}});assert.equal(r.status,200);return r.json();}
 const post=(s,action,body={})=>fetch(base+'/api/workflow/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':s.session,'X-CSRF-Token':s.csrf},body:JSON.stringify(body)});
 try{
 const planner=await login(accounts[0].token),auditor=await login(accounts[1].token);assert.equal(planner.operator.id,'planner');assert.equal(auditor.operator.role,'auditor');
 const status=await (await post(auditor,'status')).json();assert.equal(status.operator.id,'judge');
 for(const [action,body]of [['investigate',{provider:'sample'}],['investigation-start',{provider:'sample'}],['review',{runId:'x',optionId:'allocate_substitute'}],['confirm',{nonce:'x',typed:'x'}],['shock',{cellId:'CELL-MILL-2'}],['reset',{}],['revoke',{}]])assert.equal((await post(auditor,action,body)).status,403,action);
 for(const action of ['checkpoint','report','verify'])assert.equal((await post(auditor,action,action==='report'?{acknowledgePlaintext:'EXPORT PLAINTEXT'}:{})).status,200,action);
 assert.equal((await fetch(base+'/api/meta/respond',{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':auditor.session,'X-CSRF-Token':auditor.csrf},body:JSON.stringify({provider:'wonder',prompt:'test'})})).status,403);
 const run=await (await post(planner,'investigate',{provider:'sample'})).json();const optionId=run.analysis.recovery.options.find(o=>o.feasible).optionId;
 const envelope=await (await post(planner,'review',{runId:run.runId,optionId})).json();assert.equal(envelope.operatorId,'planner');
 const peer=await login(accounts[0].token);
 assert.equal((await post(peer,'confirm',{nonce:envelope.nonce,typed:`APPROVE ${optionId}`})).status,409);
 assert.equal((await post(planner,'confirm',{nonce:envelope.nonce,typed:`APPROVE ${optionId}`})).status,200);
 const packet=await (await post(auditor,'export',{acknowledgePlaintext:'EXPORT PLAINTEXT'})).json();assert.equal(packet.decision.operatorId,'planner');assert.ok(!JSON.stringify(packet).includes(accounts[0].token));assert.equal(packet.operationalRelease,false);
 }finally{await app.close();}
});
test('invalid duplicate or ambiguous operator configuration fails closed at startup',()=>{
 for(const accounts of [[{id:'a',role:'admin',token:'synthetic-token'}],[{id:'a',role:'operator',token:'short'}],[{id:'a',role:'operator',token:'synthetic-token'},{id:'b',role:'auditor',token:'synthetic-token'}],[{id:'a',role:'operator',token:'synthetic-token'},{id:'a',role:'auditor',token:'another-token'}]])assert.throws(()=>createApp({models:{env:{HACKATHON_OPERATORS_JSON:JSON.stringify(accounts)}}}),/OPERATOR_CONFIGURATION_INVALID/);
});
