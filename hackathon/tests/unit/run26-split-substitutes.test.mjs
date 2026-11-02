import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSnapshot} from '../../src/domain/engine.mjs';
import {createSnapshot} from '../../src/domain/scenario.mjs';
import {buildDemoScenarioInput} from '../../fixtures/demo-scenario.mjs';

test('split recovery draws every verified substitute by real capacity math',()=>{
 const input=buildDemoScenarioInput();
 const held=input.materials.find(material=>material.materialId===input.incident.heldMaterialId);
 assert.ok(held.substitutes.length>=1);
 const firstSubstitute=input.materials.find(material=>material.materialId===held.substitutes[0]);
 assert.ok(firstSubstitute);
 // Force the first substitute alone below demand so split must combine multiple substitutes.
 firstSubstitute.onHand=Math.max(1,Math.floor(impactUnits(input)/2));
 firstSubstitute.held=0;
 const extra={
  materialId:'MAT-EXTRA-SPLIT',
  unit:held.unit,
  onHand:impactUnits(input),
  held:0,
  unitCostUsd:(held.unitCostUsd??0)+2,
  substitutes:[],
  replenishmentHours:null,
 };
 input.materials.push(extra);
 held.substitutes=[...held.substitutes,extra.materialId];
 for(const cell of input.cells){
  if(!cell.compatibleMaterials.includes(extra.materialId))cell.compatibleMaterials=[...cell.compatibleMaterials,extra.materialId];
  if(cell.availableHours<1)cell.availableHours=8;
  cell.online=true;
 }
 const snapshot=createSnapshot(input);
 const split=analyzeSnapshot(snapshot).recovery.options.find(option=>option.optionId==='split_capacity');
 assert.equal(split.feasible,true,split.rejectReason);
 assert.ok(Array.isArray(split.detail.draws));
 assert.ok(split.detail.draws.length>=2,'split must use more than the first substitute');
 assert.equal(split.detail.draws.reduce((sum,draw)=>sum+draw.units,0),split.impactedUnits);
 assert.ok(split.detail.allocations.length>=2);
});

function impactUnits(input){
 return input.jobs.filter(job=>job.materialId===input.incident.heldMaterialId).reduce((sum,job)=>sum+job.unitsRequired,0);
}
