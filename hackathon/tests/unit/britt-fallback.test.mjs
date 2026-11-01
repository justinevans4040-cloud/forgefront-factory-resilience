import test from 'node:test';
import assert from 'node:assert/strict';
import * as board from '../../src/recovery-board.mjs';
const context={owner:'operator',shockHours:0,snapshotDigest:'current',option:{optionId:'substitute',finishHours:10,evidenceIds:['source']}};
const client=(provider,complete)=>({sample:false,route:{provider,model:provider==='baseten'?'meta-models/muse-spark-open':'muse-wonder-1.0'},complete});
test('Britt uses one bounded Wonder attempt then Baseten fallback without widening provider allowlist',async()=>{
 let primary=0,backup=0;const wonder=client('meta-model-api',async()=>{primary++;throw Error('HTTP 503');});const baseten=client('baseten',async req=>{backup++;assert.ok(req.timeoutMs<=45000);return {modelId:'meta-models/muse-spark-open',text:JSON.stringify(board.sampleDraft(context))};});
 const result=await board.draftBoardWithFallback?.(wonder,()=>baseten,context);assert.equal(primary,1);assert.equal(backup,1);assert.equal(result.model,'meta-models/muse-spark-open');assert.equal(result.fallbackUsed,true);
 await assert.rejects(()=>board.draftBoardWithFallback(wonder,()=>client('fireworks',async()=>{}),context),/PRIMARY_META_ROUTE_REQUIRED/);
});
test('successful Wonder drafting never constructs a fallback client',async()=>{
 const wonder=client('meta-model-api',async()=>({modelId:'muse-wonder-1.0',text:JSON.stringify(board.sampleDraft(context))}));let created=0;
 const result=await board.draftBoardWithFallback?.(wonder,()=>{created++;throw Error('must not run');},context);assert.equal(result?.model,'muse-wonder-1.0');assert.equal(created,0);
});
