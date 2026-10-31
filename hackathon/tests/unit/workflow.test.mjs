import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkflow } from '../../src/workflow.mjs';
const setup=()=>{const directory=mkdtempSync(join(tmpdir(),'ffr-workflow-'));return {directory,key:'synthetic-ledger-key'};};
const model={mode:'sample',sample:true,label:'SAMPLE - OFFLINE; NO LIVE AI',async complete(){return {sample:true,text:'Offline deterministic advisory',toolCalls:[]};}};
test('review binds actor, session and digest; confirmation is typed and single use',async()=>{
  const w=createWorkflow(setup()); const r=await w.investigate(model);
  const option=r.analysis.recovery.options.find(o=>o.feasible).optionId;
  const e=w.review(r.runId,option,'session-a');
  assert.throws(()=>w.confirm(e.nonce,`APPROVE ${option}`,'session-b'));
  assert.throws(()=>w.confirm(e.nonce,'yes','session-a'));
  assert.equal(w.confirm(e.nonce,`APPROVE ${option}`,'session-a').operationalRelease,false);
  assert.throws(()=>w.confirm(e.nonce,`APPROVE ${option}`,'session-a'));
  assert.equal(w.exportPacket().decision.status,'accepted');
});
test('shock invalidates old proposals and consent; restart preserves authoritative state',async()=>{
  const options=setup();const w=createWorkflow(options);const r=await w.investigate(model);
  const option=r.analysis.recovery.options.find(o=>o.feasible).optionId;
  const e=w.review(r.runId,option,'s');w.shock('CELL-MILL-1');
  assert.throws(()=>w.confirm(e.nonce,`APPROVE ${option}`,'s'));
  assert.throws(()=>w.review(r.runId,option,'s'));
  const restarted=createWorkflow(options);assert.equal(restarted.status().decision.status,'invalidated');
  assert.equal(restarted.status().analysis.capacity.cells[0].online,false);
});
test('ledger tampering blocks reads and exports without clearing evidence',()=>{
  const options=setup();const w=createWorkflow(options);w.shock('CELL-MILL-1');
  appendFileSync(join(options.directory,'events.jsonl'),'{}\n');
  assert.throws(()=>w.exportPacket(),/LEDGER_TAMPERED/);
  assert.throws(()=>createWorkflow(options),/LEDGER_TAMPERED/);
});
test('expired review and pending consent after restart are denied',async()=>{
  let clock=100;const options={...setup(),now:()=>clock};const w=createWorkflow(options);const r=await w.investigate(model);
  const option=r.analysis.recovery.options.find(o=>o.feasible).optionId;const e=w.review(r.runId,option,'s');
  clock+=300001;assert.throws(()=>w.confirm(e.nonce,`APPROVE ${option}`,'s'));
  const next=createWorkflow(options);assert.throws(()=>next.confirm(e.nonce,`APPROVE ${option}`,'s'));
});
test('confirmation races succeed at most once and cannot resurrect after restart',async()=>{
 const options=setup();const w=createWorkflow(options);const r=await w.investigate(model);const option=r.analysis.recovery.options.find(o=>o.feasible).optionId;const e=w.review(r.runId,option,'s');
 const attempts=await Promise.allSettled([Promise.resolve().then(()=>w.confirm(e.nonce,`APPROVE ${option}`,'s')),Promise.resolve().then(()=>w.confirm(e.nonce,`APPROVE ${option}`,'s'))]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 assert.throws(()=>createWorkflow(options).confirm(e.nonce,`APPROVE ${option}`,'s'));
 w.shock('CELL-MILL-2');assert.equal(w.status().decision.status,'invalidated');
});
test('shock during inference records calls but rejects the stale completed proposal',async()=>{
 const w=createWorkflow(setup());let finish;const stalled={...model,complete:()=>new Promise(resolve=>finish=resolve)};
 const task=w.investigate(stalled);w.shock('CELL-MILL-2');finish({sample:true,text:'Offline',toolCalls:[]});await assert.rejects(task,/STALE_INVESTIGATION/);assert.equal(w.status().runs.length,0);assert.ok(w.exportPacket().events.some(e=>e.type==='model_call'));
});
test('reset never revives a previously successful investigation',async()=>{
 const w=createWorkflow(setup());const r=await w.investigate(model);w.reset();assert.notEqual(w.status().snapshot.snapshotDigest,r.run.snapshotDigest);assert.throws(()=>w.review(r.runId,r.analysis.recovery.options[0].optionId,'s'));
});
