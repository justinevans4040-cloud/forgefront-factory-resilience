import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoScenarioInput,createSnapshot } from '../../src/domain/scenario.mjs';
import { analyzeSnapshot } from '../../src/domain/engine.mjs';

test('independent arithmetic oracle matches runtime jobs, stock, shared work and shock',()=>{
 const input=buildDemoScenarioInput(),before=analyzeSnapshot(createSnapshot(input));
 const options=Object.fromEntries(before.recovery.options.map(o=>[o.optionId,o]));
 // From records: (60+40)*0.5=50 cell-hours; Cell 1 has 40h, Cell 2 has 24h.
 assert.equal(before.impacted.impactedUnits,100);
 assert.equal(options.wait_replenishment.feasible,false,'only 40 hours support primary material after replenishment');
 assert.equal(options.wait_replenishment.finishHours,null);
 assert.equal(options.allocate_substitute.finishHours,40);
 assert.equal(options.allocate_substitute.incrementalCostUsd,40*85+10*90+100*(14-12));
 assert.equal(options.split_capacity.finishHours,26,'24-hour Cell 2 cap leaves 26 hours on Cell 1');
 assert.equal(options.split_capacity.incrementalCostUsd,26*85+24*90+100*2);
 const after=analyzeSnapshot(createSnapshot({...input,cells:input.cells.map(c=>({...c,online:c.cellId!=='CELL-MILL-2'}))}));
 assert.equal(after.recovery.feasibleCount,0,'40 hours cannot cover 50 hours after outage');
 assert.ok(after.recovery.options.every(o=>!o.feasible&&o.finishHours===null));
 // Independently change primary capacity to make the documented waiting path possible.
 input.cells[0].availableHours=50;
 const wait=analyzeSnapshot(createSnapshot(input)).recovery.options.find(o=>o.optionId==='wait_replenishment');
 assert.equal(wait.finishHours,48+50);assert.equal(wait.incrementalCostUsd,0);
});
