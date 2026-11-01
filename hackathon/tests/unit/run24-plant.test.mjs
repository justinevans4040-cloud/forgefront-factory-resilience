import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';

for(const size of [2,40,1000,5000])test(`plant graph retains and schedules ${size} machines`,async()=>{
 const {analyzePlant,compareQuantities,dependencyChain}=await import('../../public/plant-engine.mjs');
 const {generatedPlant}=await import('../../fixtures/generated-plant.mjs');
 const plant=generatedPlant(size),start=performance.now(),result=analyzePlant(plant,{lotId:'lot-primary',failure:'wrong-cert',strategy:'reroute'});
 const elapsed=performance.now()-start;
 assert.equal(result.machines.length,size);assert.equal(result.operations.length,size);
 assert.equal(result.affected.length,size);assert.equal(result.board.length,size);
 assert.equal(result.metrics.lostHours,size*2);assert.equal(result.metrics.exposureUsd,size*200);
 assert.equal(result.recovery.feasible,true);assert.equal(result.recovery.finishHours,size*2);
 assert.equal(result.recovery.assignments.length,size);
 assert.ok(result.recovery.assignments.every((a,i)=>a.machineId!==plant.operations[i].machineId));
 assert.equal(dependencyChain(plant,'op-0').length,size);
 assert.equal(compareQuantities(plant.evidence).recordCount,size);
 if(size===1000)assert.ok(elapsed<2000,`elapsed ${elapsed}`);
 // Independent serial resource calculation; no engine helper is used for the oracle.
 let finish=0;for(const a of result.recovery.assignments){assert.equal(a.startHours,finish);finish+=2;assert.equal(a.finishHours,finish);}
 for(let i=1;i<result.board.length;i++)assert.deepEqual(result.board[i].dependsOn,['recover-op-'+(i-1)]);
});

test('plant rejects cycles, unknown references and insufficient alternate capacity',async()=>{
 const {analyzePlant}=await import('../../public/plant-engine.mjs');const {generatedPlant}=await import('../../fixtures/generated-plant.mjs');
 const p=generatedPlant(40);p.operations[0].dependsOn=['op-39'];assert.throws(()=>analyzePlant(p,{lotId:'lot-primary',failure:'wrong-cert'}),/cycle/i);
 p.operations[0].dependsOn=['missing'];assert.throws(()=>analyzePlant(p,{lotId:'lot-primary',failure:'wrong-cert'}),/Unknown/);
 p.operations[0].dependsOn=[];for(const machine of p.machines)machine.capacityHours=1;
 const r=analyzePlant(p,{lotId:'lot-primary',failure:'wrong-cert',strategy:'reroute'});assert.equal(r.recovery.feasible,false);assert.equal(r.recovery.unscheduled.length,40);
});

test('quantity comparisons retain all records and separate incompatible units',async()=>{
 const {compareQuantities}=await import('../../public/plant-engine.mjs');
 const r=compareQuantities([{id:'a',quantity:{value:120,unit:'each'}},{id:'b',quantity:{value:80,unit:'each'}},{id:'c',quantity:{value:10,unit:'each'}},{id:'d',quantity:{value:2,unit:'kg'}}]);
 assert.equal(r.recordCount,4);assert.equal(r.groups.length,2);assert.equal(r.groups.find(g=>g.unit==='each').gap,110);
});

test('recovery uses capabilities, precedence and shared capacity rather than fixed machine names',async()=>{
 const {analyzePlant}=await import('../../public/plant-engine.mjs');const {generatedPlant}=await import('../../fixtures/generated-plant.mjs');
 const p=generatedPlant(2);p.machines.push({id:'other-route',capabilities:['cut'],capacityHours:10,hourlyCostUsd:50,online:true});
 p.machines[0].capabilities.push('cut');p.operations[1].capability='cut';p.operations[1].hours=3;
 const r=analyzePlant(p,{lotId:'lot-primary',failure:'wrong-cert',strategy:'reroute'});
 assert.equal(r.recovery.assignments[1].machineId,'other-route');assert.equal(r.recovery.assignments[1].startHours,2);assert.equal(r.recovery.finishHours,5);
 assert.equal(r.metrics.lostHours,5);assert.equal(r.recovery.costUsd,350);
});
