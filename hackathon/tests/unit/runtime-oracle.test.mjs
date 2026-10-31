import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoScenarioInput,createSnapshot } from '../../src/domain/scenario.mjs';
import { analyzeSnapshot } from '../../src/domain/engine.mjs';
test('independent arithmetic oracle matches runtime jobs, stock, shared work and shock',()=>{
 const input=buildDemoScenarioInput(),before=analyzeSnapshot(createSnapshot(input));const options=Object.fromEntries(before.recovery.options.map(o=>[o.optionId,o]));
 // Independently hand-derived from job records: (40+30)*0.5=35 cell-hours.
 assert.equal(before.impacted.impactedUnits,70);assert.equal(options.wait_replenishment.finishHours,48+35);
 assert.equal(options.allocate_substitute.finishHours,35);assert.equal(options.allocate_substitute.incrementalCostUsd,35*85+70*(14-12));
 assert.equal(options.split_capacity.finishHours,35/2);assert.equal(options.split_capacity.incrementalCostUsd,17.5*(85+90)+70*2);
 const after=analyzeSnapshot(createSnapshot({...input,cells:input.cells.map(c=>({...c,online:c.cellId!=='CELL-MILL-2'}))}));
 assert.equal(after.recovery.options.find(o=>o.optionId==='split_capacity').feasible,false);assert.equal(after.recovery.options.find(o=>o.optionId==='allocate_substitute').finishHours,35);
});
