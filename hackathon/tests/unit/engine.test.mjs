import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeSnapshot,
  compareRecoveryOptions,
  listImpactedJobs,
} from "../../src/domain/engine.mjs";
import { buildDemoScenarioInput, createSnapshot } from "../../src/domain/scenario.mjs";

describe("calculation engine", () => {
  it('covers every varied job and material without rounding away work on all feasible paths', () => {
    const input=buildDemoScenarioInput();
    input.jobs[0].unitsRequired=1;input.jobs[0].hoursPerUnit=0.3333;
    input.jobs[1].unitsRequired=2;input.jobs[1].hoursPerUnit=0.14285;
    input.materials[1].onHand=1;
    input.materials.push({...input.materials[1],materialId:'MAT-C',onHand:2});
    input.materials[0].substitutes.push('MAT-C');
    input.cells.forEach(cell=>{cell.compatibleMaterials.push('MAT-C');if(!cell.compatibleMaterials.includes('MAT-ALLOY-A'))cell.compatibleMaterials.push('MAT-ALLOY-A');cell.availableHours=0.4;});
    const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-8,`${label}: ${actual} vs ${expected}`);
    function verify(){
      const recovery=compareRecoveryOptions(createSnapshot(input));assert.equal(recovery.feasibleCount,3);
      for(const option of recovery.options){
        const portions=option.detail.assignments;
        assert.ok(portions.length>0,option.optionId+' must include job portions');
        for(const job of input.jobs){
          const work=portions.filter(a=>a.jobId===job.jobId);
          close(work.reduce((sum,a)=>sum+a.units,0),job.unitsRequired,option.optionId+' job units');
          close(work.reduce((sum,a)=>sum+a.hours,0),job.unitsRequired*job.hoursPerUnit,option.optionId+' job hours');
          assert.ok(work.every(a=>Math.abs(a.hours-a.units*job.hoursPerUnit)<1e-8));
        }
        for(const cell of input.cells){
          const work=portions.filter(a=>a.cellId===cell.cellId);
          assert.ok(work.reduce((sum,a)=>sum+a.hours,0)<=cell.availableHours+1e-8);
          assert.ok(work.every(a=>cell.compatibleMaterials.includes(a.materialId)));
          for(let i=1;i<work.length;i++)assert.ok(work[i].startHours>=work[i-1].finishHours-1e-8);
        }
        assert.ok(portions.every(a=>a.finishHours<=option.finishHours+1e-8));
        if(option.optionId==='wait_replenishment'){
          assert.ok(portions.every(a=>a.materialId==='MAT-ALLOY-A'&&a.materialSource==='planned_replenishment'&&a.startHours>=48));
          for(let i=1;i<portions.length;i++)assert.ok(portions[i].startHours>=portions[i-1].finishHours-1e-8,'wait work remains sequential across cells');
          close(Math.max(...portions.map(a=>a.finishHours)),48+input.jobs.reduce((sum,j)=>sum+j.unitsRequired*j.hoursPerUnit,0),'sequential replenishment finish');
        }else{
          for(const draw of option.detail.draws){
            const consumed=portions.filter(a=>a.materialId===draw.materialId).reduce((sum,a)=>sum+a.units,0);
            close(consumed,draw.units,'draw units');assert.ok(consumed<=input.materials.find(m=>m.materialId===draw.materialId).onHand+1e-8);
          }
        }
      }
    }
    verify();input.jobs[0].hoursPerUnit=0;verify();input.jobs[1].hoursPerUnit=0;verify();
  });


  it('keeps zero-hour work finite while still consuming substitute stock and premium', () => {
    const input=buildDemoScenarioInput();input.jobs.forEach(job=>job.hoursPerUnit=0);
    const recovery=compareRecoveryOptions(createSnapshot(input));
    for(const option of recovery.options.filter(o=>o.feasible))assert.ok(Number.isFinite(option.finishHours));
    for(const option of recovery.options.filter(o=>['allocate_substitute','split_capacity'].includes(o.optionId))){
      assert.equal(option.finishHours,0);assert.equal(option.incrementalCostUsd,200);
      assert.equal(option.detail.draws.reduce((sum,draw)=>sum+draw.units,0),100);
      assert.equal(option.detail.assignments.reduce((sum,a)=>sum+a.units,0),100);
    }
  });

  it('binds named job portions to the computed cell loads and 26-hour split finish', () => {
    const input=buildDemoScenarioInput();
    const option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');
    assert.equal(Math.max(...option.detail.assignments.map(a=>a.finishHours)),option.finishHours);
    for(const job of input.jobs){
      const portions=option.detail.assignments.filter(a=>a.jobId===job.jobId);
      assert.equal(portions.reduce((sum,a)=>sum+a.units,0),job.unitsRequired);
      assert.equal(portions.reduce((sum,a)=>sum+a.hours,0),job.unitsRequired*job.hoursPerUnit);
      assert.ok(portions.every(a=>a.finishHours<=job.dueHours));
    }
    for(const allocation of option.detail.allocations){
      assert.equal(option.detail.assignments.filter(a=>a.cellId===allocation.cellId).reduce((sum,a)=>sum+a.hours,0),allocation.hours);
    }
  });


  it('splits only the work supported by each material-compatible cell and stock', () => {
    const input=buildDemoScenarioInput();
    input.materials[1].onHand=20;
    input.materials.push({...input.materials[1],materialId:'MAT-C',onHand:80});
    input.materials[0].substitutes.push('MAT-C');
    input.cells[0].compatibleMaterials=['MAT-ALLOY-B'];
    input.cells[0].availableHours=50;
    input.cells[1].compatibleMaterials=['MAT-C'];
    input.cells[1].availableHours=50;
    let option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');
    assert.equal(option.feasible,true);
    assert.equal(option.finishHours,40,'80 pieces require 40 hours on the only compatible cell');
    assert.equal(option.detail.allocations.find(a=>a.cellId==='CELL-MILL-1').hours,10);
    assert.equal(option.detail.allocations.find(a=>a.cellId==='CELL-MILL-2').hours,40);
    for(const draw of option.detail.draws){
      assert.ok(draw.units<=input.materials.find(m=>m.materialId===draw.materialId).onHand);
      assert.equal(draw.cells.reduce((sum,a)=>sum+a.hours,0),draw.units*0.5);
      assert.ok(draw.cells.every(a=>input.cells.find(c=>c.cellId===a.cellId).compatibleMaterials.includes(draw.materialId)));
    }
    input.cells[1].availableHours=24;
    option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');
    assert.equal(option.feasible,false,'pooled capacity cannot consume incompatible substitute stock');
  });


  it('never reuses cell capacity across substitute material draws',()=>{
    const input=buildDemoScenarioInput();input.materials[1].onHand=60;input.materials.push({...input.materials[1],materialId:'MAT-C',onHand:40});input.materials[0].substitutes.push('MAT-C');input.cells[0].compatibleMaterials.push('MAT-C');input.cells[0].availableHours=20;input.cells[1].availableHours=0;
    const option=()=>compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='allocate_substitute');assert.equal(option().feasible,false);input.cells[0].availableHours=50;assert.equal(option().feasible,true);assert.equal(option().finishHours,50);
  });
  it('rejects invalid references, duplicate IDs and inconsistent or nonfinite quantities',()=>{
    for(const mutate of [s=>s.materials[0].held=999,s=>s.materials[0].unitCostUsd=-1,s=>s.materials[0].replenishmentHours=Infinity,s=>s.jobs[0].materialId='missing',s=>s.cells.push(s.cells[0]),s=>s.materials[1].unit='kg']){const input=buildDemoScenarioInput();mutate(input);assert.throws(()=>createSnapshot(input));}
  });
  it('splits real production work across cells and recomputes after outage',()=>{
    const input=buildDemoScenarioInput();let option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');
    assert.equal(option.detail.allocations.length,2);assert.equal(option.finishHours,26);assert.equal(option.detail.allocations.reduce((n,a)=>n+a.hours,0),50);
    input.cells[1].availableHours=10;option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');assert.equal(option.finishHours,40);
    input.cells[1].availableHours=5;option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');assert.equal(option.feasible,false);
    input.cells[0].online=false;option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');assert.equal(option.feasible,false);
  });
  it("computes impacted jobs and units from the held material", () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const impact = listImpactedJobs(snapshot);
    assert.equal(impact.heldMaterialId, "MAT-ALLOY-A");
    assert.equal(impact.impactedJobCount, 2);
    assert.equal(impact.impactedUnits, 100);
    assert.equal(impact.jobs[0].totalHours, 30);
  });

  it("rejects negative material quantities when building a snapshot", () => {
    const input = buildDemoScenarioInput();
    input.materials[0].onHand = -1;
    assert.throws(() => createSnapshot(input), /onHand/);
  });

  it("produces three recovery options without over-allocating substitute stock", () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const recovery = compareRecoveryOptions(snapshot);
    assert.equal(recovery.options.length, 3);
    assert.ok(recovery.feasibleCount >= 1);

    const substitute = recovery.options.find((o) => o.optionId === "allocate_substitute");
    assert.ok(substitute);
    assert.equal(substitute.feasible, true);
    const drawn = substitute.detail.draws.reduce((s, d) => s + d.units, 0);
    assert.equal(drawn, 100);
    assert.ok(drawn <= 100);
  });

  it("marks wait option infeasible when replenishment hours are missing", () => {
    const input = buildDemoScenarioInput();
    input.materials[0].replenishmentHours = null;
    const snapshot = createSnapshot(input);
    const recovery = compareRecoveryOptions(snapshot);
    const wait = recovery.options.find((o) => o.optionId === "wait_replenishment");
    assert.equal(wait.feasible, false);
    assert.match(wait.rejectReason, /replenishment/i);
  });

  it("returns insufficient status when no substitute stock exists", () => {
    const input = buildDemoScenarioInput();
    input.materials[0].substitutes = [];
    input.materials[0].replenishmentHours = null;
    input.materials = [input.materials[0]];
    input.cells=input.cells.map(c=>({...c,compatibleMaterials:c.compatibleMaterials.filter(id=>id===input.materials[0].materialId)}));
    const snapshot = createSnapshot(input);
    const recovery = compareRecoveryOptions(snapshot);
    assert.equal(recovery.feasibleCount, 0);
    assert.equal(recovery.status, "insufficient_feasible_recovery_options");
  });

  it("analyzeSnapshot binds digest across sections", () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const analysis = analyzeSnapshot(snapshot);
    assert.equal(analysis.snapshotDigest, snapshot.snapshotDigest);
    assert.equal(analysis.impacted.snapshotDigest, snapshot.snapshotDigest);
    assert.equal(analysis.recovery.snapshotDigest, snapshot.snapshotDigest);
    assert.equal(analysis.capacity.snapshotDigest, snapshot.snapshotDigest);
  });
});
