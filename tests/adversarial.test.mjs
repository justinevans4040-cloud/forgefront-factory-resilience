import test from "node:test";
import assert from "node:assert/strict";
import { validateCertificate, traceImpact, buildRecoveryPlans, scheduleJobs } from "../src/engine.mjs";
import { reconcilePacket, parseDocument } from "../src/intake.mjs";
import { scanSupplierText } from "../src/prompt-defense.mjs";
import { ADVERSARIAL_CASES, factoryForCase } from "../fixtures/adversarial/cases.mjs";

for (const caseRow of ADVERSARIAL_CASES) {
  test(`adversarial case ${caseRow.id}`, () => {
    const factory = factoryForCase(caseRow);
    const certificate = validateCertificate(factory, caseRow.cert);
    if (caseRow.expectCert) assert.equal(certificate.status, caseRow.expectCert);
    const impact = traceImpact(factory, certificate);
    if (caseRow.expectJobs != null) assert.equal(impact.jobIds.length, caseRow.expectJobs);
    if (caseRow.expectUnits != null) assert.equal(impact.units, caseRow.expectUnits);
    if (caseRow.expectCriticalJobsMin) {
      const critical = impact.jobs.filter(j => j.priority === "critical").length;
      assert.ok(critical >= caseRow.expectCriticalJobsMin);
    }

    const docs = [
      parseDocument("material_certificate", caseRow.cert, "c"),
      parseDocument("purchase_order", caseRow.po, "p"),
      parseDocument("inventory_receipt", caseRow.inv, "i")
    ];
    const lot = factory.lots.find(l => l.id === factory.incomingLotId);
    const packet = reconcilePacket(docs, lot);
    if (caseRow.expectPacketConflict === false) {
      assert.equal(packet.contradictions.filter(c => c.severity === "REVIEW_REQUIRED").length, 0);
    }
    if (caseRow.expectCrossPoHeat || caseRow.expectInvQtyConflict || caseRow.expectLotCrossConflict) {
      assert.ok(packet.contradictions.length > 0, "expected cross-document contradiction");
    }

    if (!impact.blocked && !caseRow.outageHours) return;

    const overrides = {
      substituteStock: caseRow.substituteStock ?? 96,
      expeditedLotHours: 20,
      machineOutageHours: caseRow.outageHours ?? 0,
      expediteFee: caseRow.expediteFee ?? 1650
    };
    const plans = buildRecoveryPlans(factory, impact, overrides);
    for (const plan of plans) {
      assert.equal(plan.schedule.length, 40);
      assert.equal(plan.status, "PROPOSED — NOT AUTHORIZED");
    }
    if (caseRow.expectReallocateStockUsed != null) {
      const realloc = plans.find(p => p.id === "reallocate");
      assert.equal(realloc.stockUsed, caseRow.expectReallocateStockUsed);
    }
    if (caseRow.expectExpediteCostHigh) {
      const expedite = plans.find(p => p.id === "expedite");
      assert.ok(expedite.estimatedCost > 50000);
    }
    if (caseRow.expectPartialAllocation) {
      const hybrid = plans.find(p => p.id === "hybrid");
      assert.ok(hybrid.stockUsed > 0 && hybrid.conditionalJobs > 0);
    }
    if (caseRow.expectLateIncrease) {
      const baseline = scheduleJobs(factory);
      const stressed = scheduleJobs(factory, {}, caseRow.outageHours);
      const baseLate = baseline.reduce((s, j) => s + j.lateHours, 0);
      const newLate = stressed.reduce((s, j) => s + j.lateHours, 0);
      assert.ok(newLate >= baseLate);
    }
    if (caseRow.expectSubstituteBlocked) {
      const realloc = plans.find(p => p.id === "reallocate");
      assert.equal(realloc.stockUsed, 0);
    }
    if (caseRow.expectInjectionQuarantined) {
      const scan = scanSupplierText(caseRow.cert);
      assert.equal(scan.quarantined, true);
    }
  });
}

test("adversarial catalog has at least twenty cases", () => {
  assert.ok(ADVERSARIAL_CASES.length >= 20);
});
