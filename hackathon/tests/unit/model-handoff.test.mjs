import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorkflow} from '../../src/workflow.mjs';
import {sampleDraft} from '../../src/recovery-board.mjs';
const actor={id:'operator',role:'operator'};
function live(provider,seen){let turn=0;return {sample:false,id:provider==='baseten'?'spark-open':'wonder',mode:'live',route:{provider,model:provider==='baseten'?'meta-models/muse-spark-open':'muse-wonder-1.0'},async complete(req){seen.push(req);const replies=[{action:'tool',name:'get_incident',arguments:{}},{action:'tool',name:'compare_recovery_options',arguments:{}},{action:'final',optionId:'allocate_substitute',narrative:'Compare verified capacity.',claims:[{evidenceId:'ev-cert-qty',value:120,unit:'each',documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'}]}];return {modelId:this.route.model,text:JSON.stringify(replies[turn++])};}};}
test('Wonder receives validated Spark handoff and Britt receives accepted investigation',async()=>{
 const w=createWorkflow({directory:mkdtempSync(join(tmpdir(),'ffr-handoff-')),key:'synthetic-handoff-key'});
 const spark=await w.investigate(live('baseten',[]),actor);const requests=[];const wonder=await w.investigate(live('meta-model-api',requests),actor);
 assert.ok(requests.every(r=>r.messages.some(m=>m.content.includes(spark.runId))),'every Wonder turn receives the validated Spark result');
 assert.equal(wonder.handoff.runId,spark.runId);assert.equal(wonder.handoff.snapshotDigest,w.status().snapshot.snapshotDigest);
 const e=w.review(wonder.runId,'allocate_substitute','s',actor);w.confirm(e.nonce,'APPROVE allocate_substitute','s',actor);
 let context;const c=live('meta-model-api',[]);c.complete=async req=>{context=JSON.parse(req.prompt.split('Context: ')[1]);return {modelId:c.route.model,text:JSON.stringify(sampleDraft(context))};};
 await w.draftTasks(c,'s',actor);assert.equal(context.acceptedInvestigation.runId,wonder.runId);assert.equal(context.humanDecision.optionId,'allocate_substitute');assert.equal(context.acceptedInvestigation.handoff.runId,spark.runId);
 w.shock('CELL-MILL-2',actor);const next=await w.investigate(live('meta-model-api',[]),actor);assert.equal(next.handoff,null,'stale snapshot results never transfer');
});
