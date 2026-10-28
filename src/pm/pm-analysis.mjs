import { scheduleJobs, buildRecoveryPlans, validateCertificate, traceImpact } from "../engine.mjs";
import { machineById } from "../machine-routing.mjs";
import { createScenario } from "../scenario.mjs";
import { calculateCpm, CpmCycleError } from "./cpm-calculator.mjs";
import { calculateEvm } from "./evm-calculator.mjs";
import { calculateWsjf, averageItemsInSystem, averageTimeInSystem } from "./wsjf-calculator.mjs";

const PRIORITY_RR = { critical: 40, high: 25, normal: 10 };

export function scheduleToCpmActivities(schedule, factory, impact, materialGateHours = 0) {
  const jobById = new Map(factory.jobs.map(j => [j.id, j]));
  const impacted = new Set(impact?.jobIds || []);
  const activities = [];
  const gateId = "GATE-MATERIAL";
  const gateDuration = Math.max(0, Math.ceil(materialGateHours));
  if (gateDuration > 0) {
    activities.push({
      id: gateId,
      name: "Material evidence gate",
      duration: gateDuration,
      predecessorIds: [],
      order: "GATE",
      machineId: "SYSTEM"
    });
  }

  const byMachine = new Map();
  for (const row of schedule) {
    if (!byMachine.has(row.machineId)) byMachine.set(row.machineId, []);
    byMachine.get(row.machineId).push(row);
  }
  for (const [machineId, rows] of byMachine.entries()) {
    const ordered = [...rows].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
    let prevId = null;
    for (const row of ordered) {
      const duration = Math.max(1, Math.round(row.end - row.start));
      const preds = [];
      if (prevId) preds.push(prevId);
      else if (gateDuration > 0 && impacted.has(row.id)) preds.push(gateId);
      const job = jobById.get(row.id);
      activities.push({
        id: row.id,
        name: `${row.order} @ ${machineId}`,
        duration,
        predecessorIds: preds,
        order: row.order,
        machineId
      });
      prevId = row.id;
    }
  }
  return activities;
}

function materialGateHours(plan, impact) {
  if (!plan?.allocations?.length) return 0;
  const releases = plan.allocations
    .filter(a => impact.jobIds.includes(a.jobId))
    .map(a => a.releaseHour || 0);
  return releases.length ? Math.max(...releases) : 0;
}

function orderSlackMap(cpmResult, activities) {
  const actMap = new Map(cpmResult.activities.map(a => [a.id, a]));
  const byOrder = new Map();
  for (const act of activities) {
    if (!act.order || act.order === "GATE") continue;
    const row = actMap.get(act.id);
    if (!row) continue;
    const prev = byOrder.get(act.order) ?? 0;
    byOrder.set(act.order, prev + row.totalFloat);
  }
  return byOrder;
}

function compareCpmPlans(baselineCpm, planCpm, baselineActs, planActs, impact) {
  const baseCrit = new Set(baselineCpm.criticalPathIds.filter(id => id !== "GATE-MATERIAL"));
  const planCrit = new Set(planCpm.criticalPathIds.filter(id => id !== "GATE-MATERIAL"));
  const newlyCritical = [...planCrit].filter(id => !baseCrit.has(id) && impact.jobIds.includes(id));
  const baseSlack = orderSlackMap(baselineCpm, baselineActs);
  const planSlack = orderSlackMap(planCpm, planActs);
  const slackConsumedPerOrder = {};
  for (const order of new Set([...baseSlack.keys(), ...planSlack.keys()])) {
    const consumed = +(Math.max(0, (baseSlack.get(order) || 0) - (planSlack.get(order) || 0)).toFixed(2));
    if (consumed > 0) slackConsumedPerOrder[order] = consumed;
  }
  const impactedFinish = cpm => Math.max(0, ...cpm.activities.filter(a => impact.jobIds.includes(a.id)).map(a => a.earlyFinish));
  return {
    impactedFinishDeltaHours: +(impactedFinish(planCpm) - impactedFinish(baselineCpm)).toFixed(2),
    newlyCriticalJobIds: newlyCritical.sort(),
    slackConsumedPerOrder,
    finishDeltaHours: +(planCpm.projectDuration - baselineCpm.projectDuration).toFixed(2)
  };
}

export function rankImpactedJobsWsjf(impactJobs, factory) {
  const horizon = Math.max(...factory.jobs.map(j => j.dueHour), 1);
  return impactJobs
    .map(job => {
      const businessValue = job.value / 1000;
      const timeCriticality = Math.max(0, (horizon - job.dueHour + 1) / 2);
      const riskReduction = PRIORITY_RR[job.priority] ?? 10;
      const jobSize = Math.max(1, (job.hours * job.units) / 12);
      const score = calculateWsjf(businessValue, timeCriticality, riskReduction, jobSize);
      return {
        jobId: job.id,
        order: job.order,
        customer: job.customer,
        wsjfScore: +score.toFixed(4),
        businessValue: +businessValue.toFixed(2),
        timeCriticality: +timeCriticality.toFixed(2),
        riskReduction,
        jobSize: +jobSize.toFixed(2)
      };
    })
    .sort((a, b) => b.wsjfScore - a.wsjfScore || a.jobId.localeCompare(b.jobId));
}

/**
 * Little's Law per cell, MEASURED from the schedule (not restated from WIP):
 *   - arrival(job) = material release hour (0 unless the plan holds it for evidence)
 *   - T  = observation window per cell: first arrival → last completion
 *   - λ  = completed jobs / T                         (measured throughput)
 *   - W  = mean(completion − arrival)                 (measured flow time per job)
 *   - L  = ∫ N(t) dt / T via an event sweep over arrivals/departures (measured WIP)
 * L is computed independently of λ and W; littleCheck = |L − λ·W| verifies the law.
 * Also reports queue wait (start − arrival) and machine utilization (busy / T).
 */
export function littlesLawForCells(schedule, factory, impact, arrivals = {}) {
  const affected = new Set(impact.affectedMachines || []);
  return factory.machines
    .filter(m => affected.has(m.id))
    .map(machine => {
      const rows = schedule.filter(r => r.machineId === machine.id);
      const n = rows.length;
      const arrive = r => Math.min(arrivals[r.id] ?? 0, r.start);
      const t0 = n ? Math.min(...rows.map(arrive)) : 0;
      const t1 = n ? Math.max(...rows.map(r => r.end)) : 0;
      const window = Math.max(0, t1 - t0);
      const events = rows.flatMap(r => [[arrive(r), +1], [r.end, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      let area = 0, inSystem = 0, last = t0, peak = 0;
      for (const [t, d] of events) {
        area += inSystem * (t - last);
        inSystem += d;
        peak = Math.max(peak, inSystem);
        last = t;
      }
      const L = window > 0 ? area / window : 0;
      const lambda = window > 0 ? n / window : 0;
      const W = n ? rows.reduce((s, r) => s + (r.end - arrive(r)), 0) / n : 0;
      const wait = n ? rows.reduce((s, r) => s + (r.start - arrive(r)), 0) / n : 0;
      const busy = rows.reduce((s, r) => s + (r.end - r.start), 0);
      return {
        machineId: machine.id,
        label: machine.label,
        wipJobs: n,
        observationWindowHours: +window.toFixed(2),
        throughputJobsPerHour: +lambda.toFixed(4),
        averageTimeInSystemHours: +W.toFixed(2),
        averageQueueWaitHours: +wait.toFixed(2),
        averageItemsInSystem: +L.toFixed(2),
        peakJobsInSystem: peak,
        littleCheck: +Math.abs(L - lambda * W).toFixed(4),
        utilizationPct: window > 0 ? +((busy / window) * 100).toFixed(1) : 0,
        burdenRatePerHour: machine.burdenRatePerHour,
        method: "measured-event-sweep",
        synthetic: true
      };
    });
}

function burdenWeightedHours(factory, schedule) {
  return schedule.reduce((sum, row) => {
    const machine = machineById(factory.machines, row.machineId);
    const hours = Math.max(0, row.end - row.start);
    return sum + hours * (machine.burdenRatePerHour / 100);
  }, 0);
}

function computePlanEvm(plan, baselinePlan, evmRates, factory) {
  const bac = evmRates.budgetAtCompletion;
  const pv = bac * evmRates.plannedPercentComplete;
  const delayFactor = plan.incrementalLateHours / evmRates.scheduleHorizonHours;
  const earnedPct = Math.max(0, evmRates.plannedPercentComplete - delayFactor * 0.05);
  const ev = bac * earnedPct;
  const burdenDelta = burdenWeightedHours(factory, plan.schedule) -
    burdenWeightedHours(factory, baselinePlan?.schedule || plan.schedule);
  const ac = evmRates.actualCostToDate + plan.estimatedCost * evmRates.recoverySpendFactor + burdenDelta * 42;
  const evm = calculateEvm({
    plannedValue: pv,
    earnedValue: ev,
    actualCost: ac,
    budgetAtCompletion: bac
  });
  return {
    ...evm,
    scheduleImpactHours: +plan.incrementalLateHours.toFixed(2),
    costImpactUsd: plan.estimatedCost,
    baselineCostUsd: baselinePlan?.estimatedCost ?? 0
  };
}

export function analyzeProjectManagement({ factory, certificate, impact, plans, overrides = {} }) {
  if (!impact?.blocked) {
    return {
      synthetic: true,
      active: false,
      message: "No material conflict — PM analytics apply when recovery plans exist."
    };
  }

  const evmRates = {
    ...factory.evmSynthetic,
    ...(overrides.evmSynthetic || {})
  };
  const baselineSchedule = scheduleJobs(factory, {}, factory.assumptions.machineOutageHours ?? 0);
  const baselineActs = scheduleToCpmActivities(baselineSchedule, factory, impact, 0);
  let baselineCpm;
  try {
    baselineCpm = calculateCpm(baselineActs);
  } catch (error) {
    if (error instanceof CpmCycleError) {
      return { synthetic: true, active: false, error: "CYCLE_DETECTED", scope: "baseline" };
    }
    throw error;
  }

  const wsjfRank = rankImpactedJobsWsjf(impact.jobs, factory);
  const baselinePlan = plans[0];

  const planResults = plans.map(plan => {
    const gate = materialGateHours(plan, impact);
    const acts = scheduleToCpmActivities(plan.schedule, factory, impact, gate);
    let cpm;
    try {
      cpm = calculateCpm(acts);
    } catch (error) {
      if (error instanceof CpmCycleError) {
        return { planId: plan.id, error: "CYCLE_DETECTED" };
      }
      throw error;
    }
    const comparison = compareCpmPlans(baselineCpm, cpm, baselineActs, acts, impact);
    const evm = computePlanEvm(plan, baselinePlan, evmRates, factory);
    return {
      planId: plan.id,
      label: plan.label,
      cpm: {
        projectDurationHours: cpm.projectDuration,
        criticalPathIds: cpm.criticalPathIds,
        activities: cpm.activities.map(a => ({
          id: a.id,
          name: a.name,
          duration: a.duration,
          earlyStart: a.earlyStart,
          earlyFinish: a.earlyFinish,
          lateStart: a.lateStart,
          lateFinish: a.lateFinish,
          totalFloat: a.totalFloat,
          isCritical: a.isCritical
        })),
        ...comparison
      },
      evm,
      littlesLaw: littlesLawForCells(plan.schedule, factory, { affectedMachines: factory.machines.map(m => m.id) },
        Object.fromEntries((plan.allocations || []).map(a => [a.jobId, a.releaseHour || 0])))
    };
  });

  return {
    synthetic: true,
    active: true,
    evmRates,
    baseline: {
      cpm: {
        projectDurationHours: baselineCpm.projectDuration,
        criticalPathIds: baselineCpm.criticalPathIds
      },
      littlesLaw: littlesLawForCells(baselineSchedule, factory, { affectedMachines: factory.machines.map(m => m.id) })
    },
    wsjfRank,
    plans: planResults
  };
}

export function buildPmContextFromState({ certificateText, assumptions = {}, disruptions = {} }) {
  let factory = createScenario();
  factory = {
    ...factory,
    assumptions: { ...factory.assumptions, ...assumptions },
    disruptions: { ...factory.disruptions, ...disruptions }
  };
  if (disruptions.substituteLotQuestioned) {
    const alt = factory.lots.find(l => l.id === factory.substituteLotId);
    if (alt) alt.status = "hold-review";
  }
  const certificate = validateCertificate(factory, certificateText);
  const impact = traceImpact(factory, certificate);
  const plans = impact.blocked
    ? buildRecoveryPlans(factory, impact, {
        ...assumptions,
        machineOutageHours: assumptions.machineOutageHours ?? factory.disruptions.machineOutageHours ?? 0
      })
    : [];
  const pm = analyzeProjectManagement({ factory, certificate, impact, plans });
  return { factory, certificate, impact, plans, pm };
}
