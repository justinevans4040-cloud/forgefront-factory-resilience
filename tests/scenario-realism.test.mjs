import test from "node:test";
import assert from "node:assert/strict";
import { createScenario, INCORRECT_CERT } from "../src/scenario.mjs";
import { validateCertificate, traceImpact, scheduleJobs, buildRecoveryPlans } from "../src/engine.mjs";
import { assertFactoryRouting, jobIsCompatible } from "../src/machine-routing.mjs";
import { analyzeProjectManagement } from "../src/pm/pm-analysis.mjs";

test("four Haas-class cells have distinct Little's Law workload stats", () => {
  const factory = createScenario();
  const certificate = validateCertificate(factory, INCORRECT_CERT);
  const impact = traceImpact(factory, certificate);
  const pm = analyzeProjectManagement({ factory, certificate, impact, plans: buildRecoveryPlans(factory, impact) });
  const cells = pm.baseline.littlesLaw;
  assert.equal(cells.length, 4);
  const wip = cells.map(c => c.wipJobs);
  const throughput = cells.map(c => c.throughputJobsPerHour);
  const timeInSystem = cells.map(c => c.averageTimeInSystemHours);
  assert.ok(new Set(wip).size > 1, "WIP should differ across cells");
  assert.ok(new Set(throughput.map(v => v.toFixed(3))).size > 1, "throughput should differ");
  assert.ok(new Set(timeInSystem.map(v => v.toFixed(1))).size > 1, "time-in-system should differ");
});

test("every job is assigned only to a capable machine", () => {
  const factory = createScenario();
  assertFactoryRouting(factory);
  for (const job of factory.jobs) {
    const machine = factory.machines.find(m => m.id === job.machineId);
    assert.equal(jobIsCompatible(job, machine), true);
  }
});

test("baseline critical path is not a uniform every-fourth-job pattern", () => {
  const factory = createScenario();
  const certificate = validateCertificate(factory, INCORRECT_CERT);
  const impact = traceImpact(factory, certificate);
  const pm = analyzeProjectManagement({ factory, certificate, impact, plans: buildRecoveryPlans(factory, impact) });
  const critical = pm.baseline.cpm.criticalPathIds.filter(id => id.startsWith("JOB-"));
  const indices = critical.map(id => Number(id.replace("JOB-", "")));
  const everyFourth = indices.length >= 3 && indices.every((n, i) => i === 0 || n - indices[i - 1] === 4);
  assert.equal(everyFourth, false);
  assert.ok(critical.length >= 3);
});

test("WSJF ranks show meaningful score spread among impacted jobs", () => {
  const factory = createScenario();
  const certificate = validateCertificate(factory, INCORRECT_CERT);
  const impact = traceImpact(factory, certificate);
  const pm = analyzeProjectManagement({ factory, certificate, impact, plans: [] });
  const scores = pm.wsjfRank.map(r => r.wsjfScore);
  assert.equal(scores.length, 7);
  assert.ok(Math.max(...scores) - Math.min(...scores) > 0.5);
});

test("recovery schedules never place jobs on incapable machines", () => {
  const factory = createScenario();
  const certificate = validateCertificate(factory, INCORRECT_CERT);
  const impact = traceImpact(factory, certificate);
  const plans = buildRecoveryPlans(factory, impact);
  for (const plan of plans) {
    for (const row of plan.schedule) {
      const job = factory.jobs.find(j => j.id === row.id);
      const machine = factory.machines.find(m => m.id === row.machineId);
      assert.equal(job.machineId, row.machineId);
      assert.equal(jobIsCompatible(job, machine), true);
    }
  }
});

test("per-machine job counts are imbalanced like a real shop", () => {
  const factory = createScenario();
  const schedule = scheduleJobs(factory);
  const counts = factory.machines.map(m => schedule.filter(r => r.machineId === m.id).length);
  assert.ok(Math.max(...counts) - Math.min(...counts) >= 2);
});
