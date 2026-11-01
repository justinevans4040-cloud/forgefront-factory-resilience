import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateDraft,moveTask,replanBoard,sampleDraft,approveProposal,draftBoard} from '../../src/recovery-board.mjs';
const context={snapshotDigest:'snapshot-a',option:{optionId:'split_capacity',finishHours:17.5,evidenceIds:['source-a']},owner:'operator-a',shockHours:0};
test('board validates source-bound tasks and computes dependency due windows',()=>{
 const b=validateDraft(sampleDraft(context),context);assert.equal(b.tasks.length,3);assert.equal(b.tasks.at(-1).dueHours,17.5);assert.throws(()=>moveTask(b,b.tasks[1].id,'In progress'),/DEPENDENCY/);const first=moveTask(b,b.tasks[0].id,'Done');assert.equal(moveTask(first,first.tasks[1].id,'In progress').tasks[1].status,'In progress');assert.throws(()=>moveTask(b,b.tasks[0].id,'unknown'),/STATUS/);
});
test('board rejects unknown sources, cycles, extra fields and invalid deadlines',()=>{
 for(const mutate of [d=>d.tasks[0].evidenceIds=['invented'],d=>d.tasks[0].dependsOn=['t3'],d=>d.tasks[0].extra=true,d=>d.tasks[0].dueHours=-1]){const d=sampleDraft(context);mutate(d);assert.throws(()=>validateDraft(d,context));}
});
test('second shock preserves completed work and blocks remaining work with visible reasons',()=>{
 let b=validateDraft(sampleDraft(context),context);b=moveTask(b,'t1','Done');const r=replanBoard(b,'snapshot-b','CELL-MILL-2');assert.equal(r.tasks[0].status,'Done');assert.equal(r.tasks[1].status,'Blocked');assert.match(r.tasks[1].change.reason,/CELL-MILL-2/);assert.equal(r.snapshotDigest,'snapshot-b');
});
test('Britt cannot execute a stale, declined or unapproved proposal',()=>{
 const b=validateDraft(sampleDraft(context),context);const p={id:'p1',status:'pending',scope:'session-a',snapshotDigest:'snapshot-a',board:b};assert.throws(()=>approveProposal(p,'decline','session-a','snapshot-a'),/APPROVAL/);assert.throws(()=>approveProposal(p,'approve','session-b','snapshot-a'),/SCOPE/);assert.throws(()=>approveProposal(p,'approve','session-a','snapshot-b'),/STALE/);assert.equal(approveProposal(p,'approve','session-a','snapshot-a').tasks.length,3);
});
test('Britt accepts validated primary Meta drafts and rejects unknown routes, identity and malformed output',async()=>{
 const client={sample:false,route:{provider:'meta-model-api',model:'muse-wonder-1.0'},complete:async()=>({modelId:'muse-wonder-1.0',text:JSON.stringify(sampleDraft(context))})};
 assert.equal((await draftBoard(client,context)).board.tasks.length,3);
 await assert.rejects(draftBoard({...client,route:{provider:'other'}},context),/PRIMARY_META/);
 await assert.rejects(draftBoard({...client,complete:async()=>({modelId:'wrong',text:'{}'})},context),/IDENTITY/);
 await assert.rejects(draftBoard({...client,complete:async()=>({modelId:'muse-wonder-1.0',text:'broken'})},context),/JSON/);
});
