import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server.mjs';
const makeEnv=dir=>({HACKATHON_STATE_DIR:dir,HACKATHON_LEDGER_KEY:'synthetic-public-ledger',HACKATHON_ADMIN_TOKEN:'synthetic-public-admin',HACKATHON_DEMO_MODE:'1',FIREWORKS_API_KEY:'test-never-call-fireworks'});
async function withApp(options,fn){const dir=mkdtempSync(join(tmpdir(),'ffr-public-http-'));const app=createApp({models:{env:makeEnv(dir),fetchImpl:async()=>{throw Error('No network allowed');}},publicHosting:{...options,trustProxy:()=>true}});const address=await app.listen(0);try{await fn(`http://127.0.0.1:${address.port}`);}finally{await app.close();rmSync(dir,{recursive:true,force:true});}}
async function enter(base,identity='198.51.100.1'){const r=await fetch(base+'/api/meta/demo-entry',{method:'POST',headers:{'X-Forwarded-For':identity}});assert.equal(r.status,200);const s=await r.json();return {'Content-Type':'application/json','X-Session-Token':s.session,'X-CSRF-Token':s.csrf,'X-Forwarded-For':identity};}
const post=(base,route,headers,body={})=>fetch(base+'/api/workflow/'+route,{method:'POST',headers,body:JSON.stringify(body)});
test('public healthz, body cap and 30/min visitor quota use trusted edge identity',async()=>withApp({},async base=>{
 assert.equal((await fetch(base+'/healthz')).status,200);
 const headers=await enter(base);
 assert.equal((await post(base,'status',headers,{payload:'x'.repeat(65536)})).status,413);
 // demo-entry already consumed 1 of 30; 29 more status posts fill the window; the 31st request is denied.
 for(let i=0;i<29;i++)assert.notEqual((await post(base,'status',headers)).status,429);
 const denied=await post(base,'status',headers);assert.equal(denied.status,429);assert.ok(Number(denied.headers.get('retry-after'))>0);
 const other=await enter(base,'198.51.100.2');assert.equal((await post(base,'status',other)).status,200);
}));
test('public daily cap uses genuine offline investigation and never reaches Fireworks',async()=>withApp({dailyMaximum:0},async base=>{
 const headers=await enter(base);
 const r=await post(base,'investigate',headers,{provider:'wonder'});assert.equal(r.status,200);
 const result=await r.json();assert.equal(result.run.sample,true);assert.equal(result.publicFallback,'daily-live-cap');
 assert.equal((await post(base,'investigate',headers,{provider:'fireworks'})).status,400);
}));
test('public hourly live quota returns 429 with Retry-After before contacting provider',async()=>withApp({visitorMaximum:0},async base=>{
 const headers=await enter(base);const r=await post(base,'investigate',headers,{provider:'wonder'});
 assert.equal(r.status,429);assert.ok(Number(r.headers.get('retry-after'))>0);
}));
test('public visitors have independent snapshots and cannot reset another recovery',async()=>withApp({},async base=>{
 const a=await enter(base,'198.51.100.1'),b=await enter(base,'198.51.100.2');
 const before=await (await post(base,'status',b)).json();
 assert.equal((await post(base,'shock',a,{cellId:'CELL-MILL-2'})).status,200);
 const after=await (await post(base,'status',b)).json();assert.equal(after.snapshot.snapshotDigest,before.snapshot.snapshotDigest);
 const changed=await (await post(base,'status',a)).json();assert.notEqual(changed.snapshot.snapshotDigest,before.snapshot.snapshotDigest);
}));
test('public Sample approves a task plan, rejects an infeasible shocked recovery and exports encrypted proof within the request budget',async()=>withApp({},async base=>{
 const headers=await enter(base);let requests=1;
 const call=async(route,body={})=>{requests++;const r=await post(base,route,headers,body);assert.equal(r.status,200,route+': '+await r.clone().text());return r.json();};
 await call('reset');
 for(let stage=0;stage<2;stage++){
  const job=await call('investigation-start',{provider:'sample'});assert.equal(job.pollAfterMs,5000);
  await new Promise(resolve=>setTimeout(resolve,20));
  const result=await call('investigation-status',{jobId:job.jobId});assert.equal(result.status,'completed');
  const run=result.result;
  if(stage===1){
   assert.equal(run.analysis.recovery.feasibleCount,0);
   assert.equal((await post(base,'review',headers,{runId:run.runId,optionId:'allocate_substitute'})).status,409);requests++;
   assert.equal((await post(base,'britt-draft',headers,{provider:'sample'})).status,409);requests++;
   const state=await call('status');assert.equal(state.decision.status,'invalidated');assert.ok(state.board.tasks.every(t=>t.status==='Blocked'));
   break;
  }
  const optionId=run.analysis.recovery.options.find(o=>o.feasible).optionId;
  const envelope=await call('review',{runId:run.runId,optionId});await call('confirm',{nonce:envelope.nonce,typed:'APPROVE '+optionId});
  const proposal=await call('britt-draft',{provider:'sample'});await call('britt-decide',{proposalId:proposal.id,action:'approve'});
  if(stage===0)await call('shock',{cellId:'CELL-MILL-2'});
 }
 assert.equal((await call('verify')).ok,true);assert.ok(await call('encrypted-export',{passphrase:'Independent recovery evidence phrase'}));
 assert.ok(await call('checkpoint'));assert.ok(requests<=30);
}));

test('public legacy reset and analysis stay in the requesting visitor workspace',async()=>withApp({},async base=>{
 const a=await enter(base,'198.51.100.11'),b=await enter(base,'198.51.100.12');
 const otherBefore=await(await post(base,'status',b)).json();
 await post(base,'shock',a,{cellId:'CELL-MILL-2'});
 const prior=await(await post(base,'status',a)).json();
 const response=await fetch(base+'/api/scenario/reset-demo',{method:'POST',headers:a,body:'{}'});assert.equal(response.status,200);
 const reset=await(await post(base,'status',a)).json();assert.notEqual(reset.snapshot.snapshotDigest,prior.snapshot.snapshotDigest);assert.equal(reset.decision.status,'none');
 const otherAfter=await(await post(base,'status',b)).json();assert.equal(otherAfter.snapshot.snapshotDigest,otherBefore.snapshot.snapshotDigest);
 const analysis=await(await fetch(base+'/api/analysis',{headers:a})).json();assert.equal(analysis.snapshotDigest,reset.snapshot.snapshotDigest);
}));
test('daily cap preflight advertises offline continuation in the next status',async()=>withApp({dailyMaximum:0},async base=>{
 const a=await enter(base);const preflight=await post(base,'provider-check',a,{provider:'baseten'});assert.equal(preflight.status,200);
 const state=await(await post(base,'status',a)).json();assert.equal(state.publicOffline,true);
}));
test('the eleventh live operation is blocked even when the visitor opens another session',async()=>withApp({},async base=>{
 const headers=await enter(base,'198.51.100.20');
 for(let i=0;i<10;i++)assert.equal((await post(base,'provider-check',headers,{provider:'wonder'})).status,200);
 const next=await enter(base,'198.51.100.20');const r=await post(base,'provider-check',next,{provider:'baseten'});assert.equal(r.status,429);assert.ok(Number(r.headers.get('retry-after'))>0);
}));
test('public sign-in-free entry also rejects oversized bodies',async()=>withApp({},async base=>{
 const r=await fetch(base+'/api/meta/demo-entry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({padding:'x'.repeat(65536)})});assert.equal(r.status,413);
}));
