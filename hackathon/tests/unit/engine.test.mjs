import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeSnapshot,
  compareRecoveryOptions,
  listImpactedJobs,
} from "../../src/domain/engine.mjs";
import { buildDemoScenarioInput, createSnapshot } from "../../src/domain/scenario.mjs";

describe("calculation engine", () => {
  it('never reuses cell capacity across substitute material draws',()=>{
    const input=buildDemoScenarioInput();input.materials[1].onHand=40;input.materials.push({...input.materials[1],materialId:'MAT-C',onHand:30});input.materials[0].substitutes.push('MAT-C');input.cells[0].compatibleMaterials.push('MAT-C');input.cells[0].availableHours=20;input.cells[1].availableHours=0;
    const option=()=>compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='allocate_substitute');assert.equal(option().feasible,false);input.cells[0].availableHours=40;assert.equal(option().feasible,true);assert.equal(option().finishHours,35);
  });
  it('rejects invalid references, duplicate IDs and inconsistent or nonfinite quantities',()=>{
    for(const mutate of [s=>s.materials[0].held=999,s=>s.materials[0].unitCostUsd=-1,s=>s.materials[0].replenishmentHours=Infinity,s=>s.jobs[0].materialId='missing',s=>s.cells.push(s.cells[0]),s=>s.materials[1].unit='kg']){const input=buildDemoScenarioInput();mutate(input);assert.throws(()=>createSnapshot(input));}
  });
  it('splits real production work across cells and recomputes after outage',()=>{
    const input=buildDemoScenarioInput();let option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');
    assert.equal(option.detail.allocations.length,2);assert.equal(option.finishHours,17.5);assert.equal(option.detail.allocations.reduce((n,a)=>n+a.hours,0),35);
    input.cells[1].availableHours=5;option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');assert.equal(option.finishHours,30);
    input.cells[0].online=false;option=compareRecoveryOptions(createSnapshot(input)).options.find(o=>o.optionId==='split_capacity');assert.equal(option.feasible,false);
  });
  it("computes impacted jobs and units from the held material", () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const impact = listImpactedJobs(snapshot);
    assert.equal(impact.heldMaterialId, "MAT-ALLOY-A");
    assert.equal(impact.impactedJobCount, 2);
    assert.equal(impact.impactedUnits, 70);
    assert.equal(impact.jobs[0].totalHours, 20);
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
    assert.equal(drawn, 70);
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
