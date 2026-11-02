import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server.mjs';
import {generatedPlant} from '../../fixtures/generated-plant.mjs';

async function withPlant(size,fn){
 const directory=mkdtempSync(join(tmpdir(),'ffr-plant-investigate-'));
 const env={HACKATHON_DEMO_MODE:'1',HACKATHON_ADMIN_TOKEN:'synthetic-admin-token',HACKATHON_LEDGER_KEY:'synthetic-ledger-key',HACKATHON_STATE_DIR:directory,HACKATHON_OPERATORS_JSON:''};
 const app=createApp({plant:generatedPlant(size),models:{env,fetchImpl:async()=>{throw Error('No network');}}});
 const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
 try{
  const entry=await (await fetch(base+'/api/meta/demo-entry',{method:'POST'})).json();
  const headers={'Content-Type':'application/json','X-Session-Token':entry.session,'X-CSRF-Token':entry.csrf};
  await fn({base,headers,size});
 }finally{await app.close();rmSync(directory,{recursive:true,force:true});}
}

for(const size of [2,40,1000]){
 test('plant Meta investigation seals consent and Britt draft at '+size+' machines',async()=>{
  await withPlant(size,async({base,headers,size:machines})=>{
   const plant=await (await fetch(base+'/api/plant',{headers})).json();
   assert.equal(plant.machines.length,machines);
   const started=performance.now();
   const investigation=await fetch(base+'/api/workflow/plant-investigate',{method:'POST',headers,body:JSON.stringify({provider:'sample',lotId:plant.lots[0].id,failure:'wrong-cert',strategy:'reroute'})});
   const body=await investigation.text();
   assert.equal(investigation.status,200,body);
   const result=JSON.parse(body);
   assert.equal(result.kind,'plant');
   assert.equal(result.proposalValid,true);
   assert.equal(result.selectedOptionId,'reroute');
   assert.equal(result.claims.accepted.length,plant.evidence.length);
   assert.equal(result.claims.rejected.length,0);
   assert.ok(result.analysis.operations.length===machines);
   if(machines<=1000)assert.ok(performance.now()-started<2000,'sample plant investigation stays under 2s at '+machines);
   const review=await fetch(base+'/api/workflow/plant-review',{method:'POST',headers,body:JSON.stringify({lotId:plant.lots[0].id,failure:'wrong-cert',strategy:'reroute'})});
   const reviewBody=await review.text();
   assert.equal(review.status,200,reviewBody);
   const envelope=JSON.parse(reviewBody);
   assert.equal(envelope.investigated,true);
   assert.equal(envelope.runId,result.runId);
   const confirmed=await fetch(base+'/api/workflow/confirm',{method:'POST',headers,body:JSON.stringify({nonce:envelope.nonce,typed:'APPROVE reroute'})});
   assert.equal(confirmed.status,200,await confirmed.text());
   const draft=await fetch(base+'/api/workflow/britt-draft',{method:'POST',headers,body:JSON.stringify({provider:'sample'})});
   assert.equal(draft.status,200,await draft.text());
  });
 });
}
