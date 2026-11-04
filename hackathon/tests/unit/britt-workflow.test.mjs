import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorkflow} from '../../src/workflow.mjs';
import {createModelClient} from '../../src/models/client.mjs';
import {verifyCheckpoint} from '../../src/packet.mjs';
const actor={id:'board-operator',role:'operator'};
async function setup(){const options={directory:mkdtempSync(join(tmpdir(),'ffr-board-')),key:'synthetic-board-key'};const w=createWorkflow(options);const r=await w.investigate(createModelClient('sample'),actor);const option=r.analysis.recovery.options.find(o=>o.feasible);const e=w.review(r.runId,option.optionId,'session',actor);w.confirm(e.nonce,'APPROVE '+option.optionId,'session',actor);return {w,options};}
test('Britt proposal waits for owner approval, persists encrypted scoped memory and exports board events',async()=>{
 const {w,options}=await setup();const p=await w.draftTasks(createModelClient('sample'),'session',actor);assert.equal(w.status().board.tasks.length,0);assert.equal(w.brittFor('different',actor).proposal,null);assert.throws(()=>w.decideTasks(p.id,'approve','different',actor),/SCOPE/);w.decideTasks(p.id,'approve','session',actor);assert.equal(w.status().board.tasks.length,3);w.moveTask('t1','Done',actor);const packet=w.exportPacket();assert.ok(packet.events.some(e=>e.type==='task_moved'));assert.ok(packet.events.some(e=>e.type==='task_created'));assert.equal(verifyCheckpoint(packet,w.exportCheckpoint()).ok,true);const changed=structuredClone(packet);changed.events.find(e=>e.type==='task_created').data.board.tasks[0].title='forged';assert.equal(verifyCheckpoint(changed,w.exportCheckpoint()).ok,false);assert.ok(!readFileSync(join(options.directory,'events.jsonl'),'utf8').includes('Verify accepted'));const resumed=createWorkflow(options);assert.equal(resumed.status().board.tasks[0].status,'Done');assert.ok(resumed.brittFor('session',actor).memory.length);w.shock('CELL-MILL-2',actor);assert.equal(w.status().board.tasks[1].status,'Blocked');assert.ok(w.exportPacket().events.some(e=>e.type==='tasks_replanned'));
});
test('Britt decline and snapshot changes prevent proposal execution',async()=>{const {w}=await setup();const p=await w.draftTasks(createModelClient('sample'),'session',actor);w.decideTasks(p.id,'decline','session',actor);assert.equal(w.status().board.tasks.length,0);assert.throws(()=>w.decideTasks(p.id,'approve','session',actor));const next=await w.draftTasks(createModelClient('sample'),'session',actor);w.shock('CELL-MILL-2',actor);assert.throws(()=>w.decideTasks(next.id,'approve','session',actor),/STALE/);});
test('task move idempotency survives restart and rejects reuse for a different operation',async()=>{
 const {w,options}=await setup();const p=await w.draftTasks(createModelClient('sample'),'session',actor);w.decideTasks(p.id,'approve','session',actor);
 w.moveTask('t1','Done',actor,'move-one');const head=w.status().ledger.head;
 w.moveTask('t1','Done',actor,'move-one');assert.equal(w.status().ledger.head,head);
 const resumed=createWorkflow(options);resumed.moveTask('t1','Done',actor,'move-one');assert.equal(resumed.status().ledger.head,head);
 assert.throws(()=>resumed.moveTask('t1','Blocked',actor,'move-one'),/IDEMPOTENCY/);
});
test('fresh task approval retains completed work and the second shock blocks an infeasible recovery',async()=>{
 const {w}=await setup();let p=await w.draftTasks(createModelClient('sample'),'session',actor);w.decideTasks(p.id,'approve','session',actor);w.moveTask('t1','Done',actor);const completed=w.status().board.tasks[0].title;
 const r=await w.investigate(createModelClient('sample'),actor);const option=r.analysis.recovery.options.find(o=>o.feasible);const e=w.review(r.runId,option.optionId,'session',actor);w.confirm(e.nonce,'APPROVE '+option.optionId,'session',actor);p=await w.draftTasks(createModelClient('sample'),'session',actor);w.decideTasks(p.id,'approve','session',actor);
 assert.ok(w.status().board.tasks.some(t=>t.status==='Done'&&t.title===completed));
 w.shock('CELL-MILL-2',actor);const failed=await w.investigate(createModelClient('sample'),actor);
 assert.equal(failed.analysis.recovery.feasibleCount,0);assert.equal(w.status().decision.status,'invalidated');
 assert.ok(w.status().board.tasks.some(t=>t.status==='Done'&&t.title===completed));
 assert.ok(w.status().board.tasks.filter(t=>t.status!=='Done').every(t=>t.status==='Blocked'));
 assert.throws(()=>w.review(failed.runId,'allocate_substitute','session',actor),/STALE_OR_FAILED_INVESTIGATION|INFEASIBLE_OPTION/);
 await assert.rejects(w.draftTasks(createModelClient('sample'),'session',actor),/ACCEPT_RECOVERY_FIRST/);
});
