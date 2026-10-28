import test from "node:test";
import assert from "node:assert/strict";
import { INCORRECT_CERT, MATCHING_CERT, createScenario } from "../src/scenario.mjs";
import { extractCertificate, validateCertificate, traceImpact, scheduleJobs, buildRecoveryPlans, createReport } from "../src/engine.mjs";

const fixture = () => {
  const factory = createScenario();
  const certificate = validateCertificate(factory, INCORRECT_CERT);
  const impact = traceImpact(factory, certificate);
  const plans = buildRecoveryPlans(factory, impact);
  return { factory, certificate, impact, plans };
};

test("synthetic scenario has forty distinct jobs and four CNC work cells", () => {
  const data = createScenario();
  assert.equal(data.jobs.length, 40);
  assert.equal(new Set(data.jobs.map(row => row.id)).size, 40);
  assert.equal(data.machines.length, 4);
  assert.ok(data.jobs.every(job => data.lots.some(lot => lot.id === job.lotId)));
});

test("certificate extracts fields with genuine line references", () => {
  const extract = extractCertificate(INCORRECT_CERT);
  assert.equal(extract.fields.po.value, "PO-45892");
  assert.equal(extract.fields.heat.value, "H-7713");
  assert.equal(extract.fields.grade.value, "AMS4928");
  assert.equal(extract.fields.heat.line, 4);
  assert.match(extract.fields.heat.quote, /H-7713/);
});

test("conflicting material heat requires review and reports the exact discrepancy", () => {
  const { certificate } = fixture();
  assert.equal(certificate.status, "REVIEW REQUIRED");
  assert.deepEqual(certificate.findings.map(item => item.status), ["MATCH", "CONFLICT", "MATCH"]);
  assert.equal(certificate.findings[1].expected, "H-7731");
});

test("matching certificate clears the document conflict without declaring compliance", () => {
  const factory = createScenario();
  const cert = validateCertificate(factory, MATCHING_CERT);
  assert.equal(cert.status, "FIELDS MATCHED");
  assert.equal(traceImpact(factory, cert).orderCount, 0);
});

test("missing certificate fields are unknown rather than verified", () => {
  const factory = createScenario();
  const cert = validateCertificate(factory, "Material Test Report\nPurchase Order: PO-45892");
  assert.equal(cert.status, "UNKNOWN");
  assert.deepEqual(cert.findings.map(item => item.status), ["MATCH", "UNKNOWN", "UNKNOWN"]);
  assert.equal(traceImpact(factory, cert).blocked, true);
});

test("incident traces exactly seven jobs, distinct orders and their value", () => {
  const { impact } = fixture();
  assert.equal(impact.orderCount, 7);
  assert.equal(impact.jobIds.length, 7);
  assert.equal(impact.units, 178);
  assert.equal(impact.affectedMachines.length, 4);
  assert.equal(impact.exposureValue, impact.jobs.reduce((sum, job) => sum + job.value, 0));
});

test("each recovery plan schedules all forty jobs once without machine overlaps", () => {
  const { factory, plans } = fixture();
  assert.equal(plans.length, 4);
  for (const plan of plans) {
    assert.equal(plan.schedule.length, 40);
    assert.equal(new Set(plan.schedule.map(item => item.id)).size, 40);
    assert.ok(plan.schedule.every(item => item.end > item.start));
    for (const machine of factory.machines) {
      const tasks = plan.schedule.filter(job => job.machineId === machine.id).sort((a, b) => a.start - b.start);
      for (let index = 1; index < tasks.length; index++) {
        assert.ok(tasks[index].start >= tasks[index - 1].end, `overlap in ${machine.id}`);
      }
    }
  }
});

test("substitute assignments never exceed available stock or mix grades", () => {
  const { factory, impact } = fixture();
  const plans = buildRecoveryPlans(factory, impact, { substituteStock: 70 });
  for (const plan of plans) {
    assert.ok(plan.stockUsed <= 70);
    assert.ok(plan.stockUsed <= factory.lots.find(lot => lot.id === "LOT-TI-ALT").quantity);
    const allocated = plan.allocations.filter(row => row.material === "LOT-TI-ALT");
    assert.equal(allocated.reduce((sum, row) => sum + row.units, 0), plan.stockUsed);
    assert.ok(allocated.every(row => row.status === "AVAILABLE FOR REASSIGNMENT"));
  }
});

test("invalid capacity and negative ETA are rejected", () => {
  const { factory, impact } = fixture();
  assert.throws(() => buildRecoveryPlans(factory, impact, { substituteStock: -1 }));
  assert.throws(() => buildRecoveryPlans(factory, impact, { expeditedLotHours: -3 }));
});

test("operator accepts a scenario only, never releases physical material", () => {
  const { factory, certificate, impact, plans } = fixture();
  const approval = { planId: plans[0].id, operator: "QA TEST", at: "2026-10-17T00:00:00Z" };
  const report = createReport(factory, certificate, impact, plans, approval, [{ at: approval.at, message: "Test acceptance" }]);
  assert.equal(report.approval.operationalRelease, false);
  assert.equal(report.approval.status, "OPERATOR ACCEPTED FOR SCENARIO");
  assert.equal(report.exposure.count, 7);
  assert.equal(report.scenario.synthetic, true);
  assert.equal(report.plans.length, 4);
  assert.ok(report.certificate.findings[1].evidence.line > 0);
});

test("plans are sorted by their actual estimated scenario cost", () => {
  const { plans } = fixture();
  for (let index = 1; index < plans.length; index++) {
    assert.ok(plans[index].estimatedCost >= plans[index - 1].estimatedCost);
  }
});

test("factory baseline cannot silently reference non-existent work cells", () => {
  const factory = createScenario();
  factory.jobs[0].machineId = "MISSING";
  assert.throws(() => scheduleJobs(factory), /Unknown production machine/);
});
