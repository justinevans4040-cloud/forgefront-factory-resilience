import { test } from 'node:test';
import assert from 'node:assert/strict';
import { investigate } from '../../src/agent/investigation.mjs';
import { createSnapshot, buildDemoScenarioInput } from '../../src/domain/scenario.mjs';
const snapshot = createSnapshot(buildDemoScenarioInput());
function client(responses) { return { mode:'live', sample:false, label:'LIVE test', route:{model:'verified-meta'}, async complete(){ return {modelId:'verified-meta', text:JSON.stringify(responses.shift()), usage:null}; } }; }
test('investigation dispatches multiple read-only steps and validates exact source quantities', async()=>{
  const records=[];
  const result=await investigate({snapshot,client:client([
    {action:'tool',name:'get_incident',arguments:{}},
    {action:'tool',name:'compare_recovery_options',arguments:{}},
    {action:'final',optionId:'allocate_substitute',claims:[{evidenceId:'ev-cert-qty',value:120,unit:'each',documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'}], narrative:'Advisory only'}
  ]),record:async r=>records.push(r)});
  assert.equal(result.run.toolCalls,2); assert.equal(records.length,3);
  assert.equal(result.claims.accepted.length,1);
  assert.equal(result.operationalRelease,false);
  assert.equal(result.proposalValid,true);
});
test('provider errors and timeout stop with recorded failure and require explicit retry',async()=>{
 for(const status of [429,503,null,'timeout']){let attempts=0;const records=[];const c=client([]);c.complete=async()=>{attempts++;throw Object.assign(Error('controlled failure'),status==='timeout'?{name:'AbortError'}:status?{status}:{});};
 const result=await investigate({snapshot,client:c,record:async r=>records.push(r)});assert.equal(attempts,1);assert.equal(records.length,1);assert.equal(result.proposalValid,false);assert.equal(result.narrative,'');assert.equal(result.run.sample,false);assert.equal(records[0].failure,status==='timeout'?'MODEL_TIMEOUT':status?'MODEL_HTTP_'+status:'INVALID_OR_FAILED_MODEL_RESPONSE');
 await investigate({snapshot,client:c});assert.equal(attempts,2);
 }
});
test('wrong values, units, source entities and fabricated citations are rejected',async()=>{
  const result=await investigate({snapshot,client:client([{action:'final',claims:[
    {evidenceId:'ev-cert-qty',value:999,unit:'each'},
    {evidenceId:'ev-cert-qty',value:120,unit:'kg'},
    {evidenceId:'invented',value:120,unit:'each'}]}])});
  assert.equal(result.claims.accepted.length,0); assert.equal(result.claims.rejected.length,3);
});
test('malformed claims, invented relationships and wrong source lines cannot gain validation',async()=>{
 const exact={evidenceId:'ev-cert-qty',value:120,unit:'each',documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'};
 const result=await investigate({snapshot,client:client([{action:'final',claims:[null,{...exact,entity:'invented-supplier-commitment'},{...exact,lineId:'L999'}]}])});
 assert.equal(result.claims.accepted.length,0);assert.equal(result.claims.rejected.length,3);assert.equal(result.proposalValid,false);
});
test('unknown tools, malformed JSON and wrong returned model stop visibly',async()=>{
  const bad=await investigate({snapshot,client:client([{action:'tool',name:'approve_plan',arguments:{}}])});
  assert.equal(bad.run.ok,false);
  const wrong=client([]); wrong.complete=async()=>({modelId:'other',text:'{}'});
  const records=[]; const result=await investigate({snapshot,client:wrong,record:async r=>records.push(r)});
  assert.equal(result.run.ok,false); assert.equal(records[0].status,'rejected');
});
test('call evidence redacts credentials and excludes raw prompts and replies',async()=>{
  const records=[]; const c=client([{action:'final',narrative:'private-value'}]);
  await investigate({snapshot,client:c,secrets:['private-value'],record:async r=>records.push(r)});
  assert.ok(!JSON.stringify(records).includes('private-value'));
  assert.ok(records[0].responseDigest); assert.equal(records[0].snapshotDigest,snapshot.snapshotDigest);
});
test('Meta commentary prefixes remain data while one terminal JSON envelope dispatches',async()=>{
 const c=client([]);let turn=0;c.complete=async()=>({modelId:'verified-meta',text:++turn===1?'Investigating.\n{"action":"tool","name":"get_incident","arguments":{}}':'<|start|>assistant<|message|>Done.<|eom|>{"action":"final","claims":[]}'});
 const result=await investigate({snapshot,client:c});assert.equal(result.run.ok,true);assert.equal(result.run.toolCalls,1);
});
