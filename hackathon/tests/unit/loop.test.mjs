import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createAgentLoop } from '../../src/agent/loop.mjs';
import { createSnapshot, buildDemoScenarioInput } from '../../src/domain/scenario.mjs';
it('stops on schema rejection and never accepts a completion beyond its deadline',async()=>{
 const snapshot=createSnapshot(buildDemoScenarioInput());const bad=await createAgentLoop().run({snapshot,tools:{invoke:async()=>{throw Object.assign(new Error('bad args'),{code:'TOOL_SCHEMA'});}},modelClient:{complete:async()=>({toolCalls:[{name:'get_incident',arguments:{write:true}}]})}});assert.equal(bad.stopReason,'TOOL_SCHEMA');
 let clock=0;const late=await createAgentLoop({maxWallClockMs:5,now:()=>clock}).run({snapshot,tools:{invoke:async()=>{}},modelClient:{complete:async()=>{clock=6;return {text:'late',toolCalls:[]};}}});assert.equal(late.ok,false);assert.equal(late.stopReason,'WALL_CLOCK_EXCEEDED');
 assert.equal(createAgentLoop({maxTurns:100}).limits.maxTurns,6);
});
it('serializes normalized tool calls for the chat protocol and keeps release advisory',async()=>{
 let turns=0;
 const result=await createAgentLoop().run({snapshot:createSnapshot(buildDemoScenarioInput()),tools:{invoke:async()=>({synthetic:true})},modelClient:{mode:'live',complete:async({messages})=>{
   turns++;
   if(turns===1)return {text:'',toolCalls:[{id:'one',name:'get_incident',arguments:{}}]};
   assert.deepEqual(messages[2].tool_calls,[{id:'one',type:'function',function:{name:'get_incident',arguments:'{}'}}]);
   assert.equal(messages[3].tool_call_id,'one');
   return {text:'finished',toolCalls:[]};
 }}});
 assert.equal(result.stopReason,'MODEL_STOP');assert.equal(result.toolCalls,1);assert.equal(result.operationalRelease,false);
});
