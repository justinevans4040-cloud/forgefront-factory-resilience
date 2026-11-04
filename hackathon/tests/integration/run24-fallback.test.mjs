import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createApp} from '../../server.mjs';
test('HTTP investigation records both rejected Wonder attempts and a validated Baseten continuation',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'ffr-run24-fallback-'));let wonder=0,baseten=0;
 const app=createApp({models:{env:{HACKATHON_DEMO_MODE:'1',HACKATHON_ADMIN_TOKEN:'test-only-admin-code',HACKATHON_LEDGER_KEY:'test-only-ledger-key',HACKATHON_STATE_DIR:directory,MUSE_API_KEY:'test-only-wonder',BASETEN_API_KEY:'test-only-baseten',FIREWORKS_API_KEY:'never-use-standby'},fetchImpl:async(url,init)=>{
  const b=JSON.parse(init.body);if(url.includes('api.meta.ai')){wonder++;return new Response('{}',{status:503});}
  assert.ok(url.includes('baseten'));baseten++;const prompt=b.messages.map(m=>m.content).join('\n');
  const envelope=prompt.includes('Next call get_incident')?{action:'tool',name:'get_incident',arguments:{}}:prompt.includes('Next call compare_recovery_options')?{action:'tool',name:'compare_recovery_options',arguments:{}}:{action:'final',optionId:'allocate_substitute',narrative:'Use verified substitute after human review.',claims:[{evidenceId:'ev-cert-qty',value:100,unit:'each',documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'}]};
  return new Response(JSON.stringify({model:'meta-models/muse-spark-open',choices:[{message:{content:JSON.stringify(envelope)}}]}));
 }}});const address=await app.listen(0),base='http://127.0.0.1:'+address.port;
 try{
  const s=await(await fetch(base+'/api/meta/demo-entry',{method:'POST'})).json();const headers={'Content-Type':'application/json','X-Session-Token':s.session,'X-CSRF-Token':s.csrf};
  const response=await fetch(base+'/api/workflow/investigate',{method:'POST',headers,body:JSON.stringify({provider:'wonder'})});assert.equal(response.status,200);const r=await response.json();assert.equal(r.proposalValid,true);assert.equal(wonder,2);assert.equal(baseten,3);assert.ok(r.calls.every(c=>c.provider==='baseten'&&c.fallbackUsed));
  const packet=await(await fetch(base+'/api/workflow/export',{method:'POST',headers,body:JSON.stringify({acknowledgePlaintext:'EXPORT PLAINTEXT'})})).json();assert.equal(packet.events.filter(e=>e.type==='model_call'&&e.data.status==='rejected').length,2);
 }finally{await app.close();rmSync(directory,{recursive:true,force:true});}
});
