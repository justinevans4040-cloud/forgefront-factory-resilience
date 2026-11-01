import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server.mjs';

async function withSession(fn){
 const directory=mkdtempSync(join(tmpdir(),'ffr-plant-accept-'));
 const env={HACKATHON_DEMO_MODE:'1',HACKATHON_ADMIN_TOKEN:'synthetic-admin-token',HACKATHON_LEDGER_KEY:'synthetic-ledger-key',HACKATHON_STATE_DIR:directory,HACKATHON_OPERATORS_JSON:''};
 const app=createApp({models:{env,fetchImpl:async()=>{throw Error('No network');}}});
 const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
 try{
  const entry=await (await fetch(base+'/api/meta/demo-entry',{method:'POST'})).json();
  const headers={'Content-Type':'application/json','X-Session-Token':entry.session,'X-CSRF-Token':entry.csrf};
  await fn({base,headers,entry});
 }finally{await app.close();rmSync(directory,{recursive:true,force:true});}
}

test('full-shop plant recovery seals consent, ledger and Britt draft',async()=>{
 await withSession(async({base,headers})=>{
  const plant=await (await fetch(base+'/api/plant',{headers})).json();
  assert.ok(plant.machines.length>=40);
  const review=await fetch(base+'/api/workflow/plant-review',{method:'POST',headers,body:JSON.stringify({lotId:plant.lots[0].id,failure:'wrong-cert',strategy:'reroute'})});
  const reviewBody=await review.text();
  assert.equal(review.status,200,reviewBody);
  const envelope=JSON.parse(reviewBody);
  assert.equal(envelope.kind,'plant');
  assert.equal(envelope.optionId,'reroute');
  assert.match(envelope.runId,/^plant:/);
  assert.equal((await fetch(base+'/api/workflow/confirm',{method:'POST',headers,body:JSON.stringify({nonce:envelope.nonce,typed:'APPROVE wrong'})})).status,409);
  const confirmed=await fetch(base+'/api/workflow/confirm',{method:'POST',headers,body:JSON.stringify({nonce:envelope.nonce,typed:'APPROVE reroute'})});
  const confirmBody=await confirmed.text();
  assert.equal(confirmed.status,200,confirmBody);
  const decision=JSON.parse(confirmBody);
  assert.equal(decision.status,'accepted');
  assert.equal(decision.kind,'plant');
  assert.equal(decision.operationalRelease,false);
  const draft=await fetch(base+'/api/workflow/britt-draft',{method:'POST',headers,body:JSON.stringify({provider:'sample'})});
  const draftBody=await draft.text();
  assert.equal(draft.status,200,draftBody);
  const proposal=JSON.parse(draftBody);
  assert.ok(proposal.board.tasks.length>=1);
  assert.equal(proposal.board.optionId,'reroute');
  const status=await (await fetch(base+'/api/workflow/status',{method:'POST',headers,body:'{}'})).json();
  assert.equal(status.decision.status,'accepted');
  assert.equal(status.britt.name,'The Britt');
  assert.ok(status.ledger.count>=3);
 });
});

test('plant recovery reject wrong strategy and wrong session phrase',async()=>{
 await withSession(async({base,headers})=>{
  const plant=await (await fetch(base+'/api/plant',{headers})).json();
  assert.equal((await fetch(base+'/api/workflow/plant-review',{method:'POST',headers,body:JSON.stringify({lotId:plant.lots[0].id,failure:'wrong-cert',strategy:'invent'})})).status,400);
 });
});
