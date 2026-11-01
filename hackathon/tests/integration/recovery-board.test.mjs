import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server.mjs';
import {decryptPacket} from '../../src/security/export-codec.mjs';
test('board HTTP routes retain role, CSRF, scoped approval, idempotency and encrypted export controls',async()=>{
 const app=createApp({models:{env:{HACKATHON_ADMIN_TOKEN:'test-board-admin',HACKATHON_LEDGER_KEY:'test-board-ledger',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-board-http-')),HACKATHON_OPERATORS_JSON:JSON.stringify([{id:'reader',role:'auditor',token:'test-board-reader'}])}}});
 const address=await app.listen(0),base='http://127.0.0.1:'+address.port;
 const login=async token=>{const s=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}}).then(r=>r.json());return {'X-Session-Token':s.session,'X-CSRF-Token':s.csrf};};
 const post=(action,body,headers)=>fetch(base+'/api/workflow/'+action,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 try{
  const actor=await login('test-board-admin'),reader=await login('test-board-reader');
  assert.equal((await post('britt-draft',{provider:'sample'},reader)).status,403);
  assert.equal((await post('britt-draft',{provider:'sample'},{'X-Session-Token':actor['X-Session-Token']})).status,403);
  assert.equal((await post('britt-draft',{provider:'sample'},actor)).status,409);
  const r=await post('investigate',{provider:'sample'},actor).then(r=>r.json()),id=r.analysis.recovery.options.find(o=>o.feasible).optionId;
  const e=await post('review',{runId:r.runId,optionId:id},actor).then(r=>r.json());assert.equal((await post('confirm',{nonce:e.nonce,typed:'APPROVE '+id},actor)).status,200);
  assert.equal((await post('britt-draft',{provider:'fireworks'},actor)).status,400);
  const proposal=await post('britt-draft',{provider:'sample'},actor).then(r=>r.json());
  const other=await login('test-board-admin');assert.equal((await post('britt-decide',{proposalId:proposal.id,action:'approve'},other)).status,409);
  assert.equal((await post('britt-decide',{proposalId:proposal.id,action:'approve'},actor)).status,200);
  const move={taskId:'t1',status:'Done',idempotencyKey:'first-task-complete'};assert.equal((await post('task-move',move,actor)).status,200);
  const before=await post('status',{},actor).then(r=>r.json());assert.equal((await post('task-move',move,actor)).status,200);assert.equal((await post('status',{},actor).then(r=>r.json())).ledger.head,before.ledger.head);
  const encrypted=await post('encrypted-export',{passphrase:'separate board evidence phrase'},reader).then(r=>r.json());const packet=await decryptPacket(encrypted,'separate board evidence phrase');assert.equal(packet.board.tasks[0].status,'Done');assert.ok(packet.events.some(e=>e.type==='task_moved'));assert.ok(packet.brittMemory.length);
 }finally{app.server.closeAllConnections();await app.close();}
});
