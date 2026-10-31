import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../../server.mjs';
test('authenticated workflow completes investigation, acceptance, shock and evidence export',async()=>{
 const app=createApp({models:{env:{HACKATHON_ADMIN_TOKEN:'test-admin-ok',HACKATHON_LEDGER_KEY:'test-ledger-ok',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-http-'))}}});
 const a=await app.listen(0);const base=`http://127.0.0.1:${a.port}`;let auth={};
 const post=async(path,body={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...auth},body:JSON.stringify(body)});
 try{
 assert.equal((await post('/api/workflow/status')).status,401);
 const login=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer test-admin-ok'}});const s=await login.json();auth={'X-Session-Token':s.session,'X-CSRF-Token':s.csrf};
 const r=await (await post('/api/workflow/investigate',{provider:'sample'})).json();assert.equal(r.run.ok,true);
 const optionId=r.analysis.recovery.options.find(o=>o.feasible).optionId;
 const e=await (await post('/api/workflow/review',{runId:r.runId,optionId})).json();
 assert.equal((await post('/api/workflow/confirm',{nonce:e.nonce,typed:`APPROVE ${optionId}`})).status,200);
 assert.equal((await post('/api/workflow/confirm',{nonce:e.nonce,typed:`APPROVE ${optionId}`})).status,409);
 assert.equal((await post('/api/workflow/shock',{cellId:'CELL-MILL-1'})).status,200);
 const packet=await (await post('/api/workflow/export',{acknowledgePlaintext:'EXPORT PLAINTEXT'})).json();assert.equal(packet.decision.status,'invalidated');assert.ok(packet.ledger.ok);assert.ok(packet.events.some(e=>e.type==='model_call'));assert.equal(packet.operationalRelease,false);
 }finally{await app.close();}
});
