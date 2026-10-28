import test from "node:test";
import assert from "node:assert/strict";
import { calculateCpm, CpmCycleError } from "../src/pm/cpm-calculator.mjs";
import { calculateEvm } from "../src/pm/evm-calculator.mjs";
import { calculateWsjf } from "../src/pm/wsjf-calculator.mjs";
import { rankImpactedJobsWsjf, buildPmContextFromState } from "../src/pm/pm-analysis.mjs";
import { moveKanbanCard, buildRecoveryKanban, KANBAN_COLUMNS } from "../src/pm/kanban.mjs";
import { checkBriefClaims } from "../src/claim-checker.mjs";
import { INCORRECT_CERT } from "../src/scenario.mjs";
import { initialize } from "../src/engine.mjs";

test("CPM textbook network ES/EF/LS/LF and float", () => {
  const activities = [
    { id: "A", name: "Start", duration: 3, predecessorIds: [] },
    { id: "B", name: "Work", duration: 4, predecessorIds: ["A"] },
    { id: "C", name: "Finish", duration: 2, predecessorIds: ["B"] }
  ];
  const result = calculateCpm(activities);
  assert.equal(result.projectDuration, 9);
  const b = result.activities.find(a => a.id === "B");
  assert.equal(b.earlyStart, 3);
  assert.equal(b.earlyFinish, 7);
  assert.equal(b.totalFloat, 0);
  assert.deepEqual(result.criticalPathIds.sort(), ["A", "B", "C"]);
});

test("CPM rejects dependency cycles", () => {
  const activities = [
    { id: "X", name: "X", duration: 1, predecessorIds: ["Y"] },
    { id: "Y", name: "Y", duration: 1, predecessorIds: ["X"] }
  ];
  assert.throws(() => calculateCpm(activities), CpmCycleError);
});

test("EVM formulas match hand calculation", () => {
  const out = calculateEvm({
    plannedValue: 100,
    earnedValue: 90,
    actualCost: 95,
    budgetAtCompletion: 200
  });
  assert.equal(out.costVariance, -5);
  assert.equal(out.scheduleVariance, -10);
  assert.ok(Math.abs(out.costPerformanceIndex - 90 / 95) < 0.0001);
  assert.equal(out.schedulePerformanceIndex, 0.9);
  const eac = 200 / (90 / 95);
  assert.ok(Math.abs(out.estimateAtCompletion - eac) < 0.02);
  assert.ok(Math.abs(out.varianceAtCompletion - (200 - eac)) < 0.02);
});

test("WSJF ordering and deterministic tie-break by job id", () => {
  const factory = { jobs: [{ id: "JOB-002", dueHour: 10, value: 5000, priority: "high", hours: 2, units: 10, order: "SO-1", customer: "A" },
    { id: "JOB-001", dueHour: 10, value: 5000, priority: "high", hours: 2, units: 10, order: "SO-2", customer: "B" }] };
  const ranked = rankImpactedJobsWsjf(factory.jobs, factory);
  assert.equal(ranked[0].wsjfScore, ranked[1].wsjfScore);
  assert.equal(ranked[0].jobId, "JOB-001");
});

test("PM analysis produces four plan CPM rows for conflict scenario", () => {
  const ctx = buildPmContextFromState({ certificateText: INCORRECT_CERT, assumptions: { substituteStock: 96 } });
  assert.equal(ctx.pm.active, true);
  assert.equal(ctx.pm.plans.length, 4);
  assert.ok(ctx.pm.plans.every(p => p.cpm.projectDurationHours >= 0));
});

test("claim checker blocks PM figures without matching evidence tags", () => {
  const payload = {
    scenarioId: "AEROSPACE-40-LOT-CONFLICT",
    summary: { findings: [], impactedOrders: 7, impactedUnits: 178 },
    plans: [{ id: "reissue", label: "Hold", estimatedCost: 1000, cpm: { finishDeltaHours: 12 }, evm: { costPerformanceIndex: 0.95, schedulePerformanceIndex: 0.9, estimateAtCompletion: 120000 } }],
    pm: { wsjfRank: [{ jobId: "JOB-003", order: "SO-1", wsjfScore: 4.5 }] }
  };
  const bad = checkBriefClaims("Finish delta is 99 hours for the plan.", payload);
  assert.equal(bad.blockedCount, 1);
  const good = checkBriefClaims("[evidence:pm:finishDelta:reissue] Finish delta is 12 hours.", payload);
  assert.equal(good.blockedCount, 0);
});

test("kanban WIP limit enforced", () => {
  const board = buildRecoveryKanban({
    plan: { id: "reissue", label: "Hold", lateJobs: 2 },
    cpm: { projectDuration: 40 },
    wsjfRank: [{ order: "SO-1" }],
    operator: "OP",
    approvalJti: "abc"
  });
  board.cards[0].column = "in_progress";
  board.cards[1].column = "in_progress";
  board.cards[2].column = "in_progress";
  const denied = moveKanbanCard(board, board.cards[3].id, "in_progress");
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, "WIP_LIMIT");
  assert.ok(KANBAN_COLUMNS.includes("blocked"));
});

test("engine initialize still exposes recovery plans", () => {
  const snap = initialize();
  assert.ok(snap.plans.length === 4);
});
