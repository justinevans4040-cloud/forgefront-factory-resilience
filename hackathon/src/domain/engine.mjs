import { RECOVERY_OPTION_IDS } from "../contracts.mjs";
import { buildEvidenceRegistry } from "./evidence.mjs";

/**
 * Deterministic recovery calculations. Models may explain these options;
 * they cannot invent feasible plans or override holds.
 */

export function materialById(snapshot, materialId) {
  return snapshot.materials.find((m) => m.materialId === materialId) || null;
}

export function cellById(snapshot, cellId) {
  return snapshot.cells.find((c) => c.cellId === cellId) || null;
}

export function listImpactedJobs(snapshot) {
  const heldId = snapshot.incident.heldMaterialId;
  const jobs = snapshot.jobs.filter((j) => j.materialId === heldId);
  const totalUnits = jobs.reduce((sum, j) => sum + j.unitsRequired, 0);
  return {
    snapshotDigest: snapshot.snapshotDigest,
    heldMaterialId: heldId,
    jobs: jobs.map((j) => ({
      jobId: j.jobId,
      materialId: j.materialId,
      unitsRequired: j.unitsRequired,
      hoursPerUnit: j.hoursPerUnit,
      preferredCellId: j.preferredCellId,
      dueHours: j.dueHours,
      totalHours: round2(j.unitsRequired * j.hoursPerUnit),
    })),
    impactedJobCount: jobs.length,
    impactedUnits: totalUnits,
  };
}

function onlineCompatibleCells(snapshot, materialId) {
  return snapshot.cells.filter(
    (c) => c.online && c.compatibleMaterials.includes(materialId) && c.availableHours > 0,
  );
}

function allocateHoursAcrossCells(cells, hoursNeeded) {
  const allocations = [];
  let remaining = hoursNeeded;
  const sorted = [...cells].sort((a, b) => a.hourlyCostUsd - b.hourlyCostUsd);
  for (const cell of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(cell.availableHours, remaining);
    if (take <= 0) continue;
    allocations.push({
      cellId: cell.cellId,
      hours: round2(take),
      costUsd: round2(take * cell.hourlyCostUsd),
    });
    remaining = round2(remaining - take);
  }
  return { allocations: Object.freeze(allocations), unmetHours: Math.max(0, remaining) };
}

function optionBase(optionId, feasible, extra = {}) {
  return Object.freeze({
    optionId,
    feasible,
    rejectReason: extra.rejectReason ?? null,
    impactedUnits: extra.impactedUnits ?? null,
    finishHours: extra.finishHours ?? null,
    incrementalCostUsd: extra.incrementalCostUsd ?? null,
    assumptions: Object.freeze([...(extra.assumptions || [])]),
    constraints: Object.freeze([...(extra.constraints || [])]),
    evidenceIds: Object.freeze([...(extra.evidenceIds || [])]),
    detail: extra.detail ? Object.freeze(extra.detail) : null,
  });
}

function computeWait(snapshot, impact) {
  const held = materialById(snapshot, snapshot.incident.heldMaterialId);
  const evidenceIds = (snapshot.evidenceRecords||[]).filter(e=>e.field==='quantity').map(e=>e.evidenceId);

  if (!held || held.replenishmentHours == null) {
    return optionBase(RECOVERY_OPTION_IDS.WAIT_REPLENISHMENT, false, {
      rejectReason: "No documented replenishment lead time for held material",
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Cannot invent supplier commitments"],
    });
  }

  const hoursNeeded = impact.jobs.reduce((s, j) => s + j.totalHours, 0);
  const cells = onlineCompatibleCells(snapshot, held.materialId);
  const { unmetHours } = allocateHoursAcrossCells(cells, hoursNeeded);
  if (unmetHours > 0) {
    return optionBase(RECOVERY_OPTION_IDS.WAIT_REPLENISHMENT, false, {
      rejectReason: "Insufficient compatible online capacity after replenishment",
      impactedUnits: impact.impactedUnits,
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Capacity checked against online compatible cells only"],
    });
  }

  const finishHours = round2(held.replenishmentHours + hoursNeeded);
  return optionBase(RECOVERY_OPTION_IDS.WAIT_REPLENISHMENT, true, {
    impactedUnits: impact.impactedUnits,
    finishHours,
    incrementalCostUsd: 0,
    evidenceIds,
    assumptions: [
      ...snapshot.assumptions,
      `Documented replenishment lead time ${held.replenishmentHours} hours`,
    ],
    constraints: ["Held lot remains unavailable until replenishment posts"],
    detail: { replenishmentHours: held.replenishmentHours, productionHours: hoursNeeded },
  });
}

function computeSubstitute(snapshot, impact) {
  const held = materialById(snapshot, snapshot.incident.heldMaterialId);
  const evidenceIds = (snapshot.evidenceRecords||[]).filter(e=>e.field==='onHand'||e.field==='quantity').map(e=>e.evidenceId);

  if (!held || !held.substitutes.length) {
    return optionBase(RECOVERY_OPTION_IDS.ALLOCATE_SUBSTITUTE, false, {
      rejectReason: "No verified substitute materials declared",
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Held material cannot be issued"],
    });
  }

  const unitsNeeded = impact.impactedUnits;
  let remaining = unitsNeeded;
  const draws = [];
  let materialPremium = 0;
  const remainingCapacity=new Map(snapshot.cells.map(c=>[c.cellId,c.availableHours]));

  for (const subId of held.substitutes) {
    const sub = materialById(snapshot, subId);
    if (!sub || sub.available <= 0) continue;
    const cells = onlineCompatibleCells(snapshot, sub.materialId).map(c=>({...c,availableHours:remainingCapacity.get(c.cellId)}));
    if (!cells.length) continue;
    const take = Math.min(sub.available, remaining);
    if (take <= 0) continue;
    const hoursNeeded = impact.jobs.reduce((s, j) => s + j.hoursPerUnit * (j.unitsRequired / unitsNeeded) * take, 0);
    // Allocate production hours proportional to units covered by this substitute draw.
    const proportionalHours = round2(
      impact.jobs.reduce((s, j) => s + j.totalHours, 0) * (take / unitsNeeded),
    );
    const { allocations, unmetHours } = allocateHoursAcrossCells(cells, proportionalHours);
    if (unmetHours > 0) continue;
    for(const a of allocations)remainingCapacity.set(a.cellId,round2(remainingCapacity.get(a.cellId)-a.hours));
    const premium = round2(Math.max(0, sub.unitCostUsd - held.unitCostUsd) * take);
    materialPremium = round2(materialPremium + premium);
    const labor = round2(allocations.reduce((s, a) => s + a.costUsd, 0));
    draws.push({
      materialId: sub.materialId,
      units: take,
      hours: proportionalHours,
      laborCostUsd: labor,
      materialPremiumUsd: premium,
      cells: allocations,
    });
    remaining = round2(remaining - take);
    if (remaining <= 0) break;
    void hoursNeeded;
  }

  if (remaining > 0) {
    return optionBase(RECOVERY_OPTION_IDS.ALLOCATE_SUBSTITUTE, false, {
      rejectReason: "Insufficient verified substitute stock or compatible capacity",
      impactedUnits: unitsNeeded,
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Cannot over-allocate substitute stock", "Held material stays unavailable"],
      detail: { shortfallUnits: remaining, draws },
    });
  }

  const cellTotals=new Map();for(const draw of draws)for(const a of draw.cells)cellTotals.set(a.cellId,(cellTotals.get(a.cellId)||0)+a.hours);
  const finishHours = round2(Math.max(...cellTotals.values(), 0));
  const laborCost = round2(draws.reduce((s, d) => s + d.laborCostUsd, 0));
  return optionBase(RECOVERY_OPTION_IDS.ALLOCATE_SUBSTITUTE, true, {
    impactedUnits: unitsNeeded,
    finishHours,
    incrementalCostUsd: round2(laborCost + materialPremium),
    evidenceIds,
    assumptions: [
      ...snapshot.assumptions,
      "Substitute allocation uses only verified available stock",
    ],
    constraints: ["Held MAT lot remains on hold", "No supplier messaging"],
    detail: { draws, materialPremiumUsd: materialPremium, laborCostUsd: laborCost },
  });
}

function computeSplit(snapshot, impact) {
  const held = materialById(snapshot, snapshot.incident.heldMaterialId);
  const evidenceIds = (snapshot.evidenceRecords||[]).filter(e=>e.field==='onHand').map(e=>e.evidenceId);

  // Split path: cover demand using substitute material across all compatible online cells.
  if (!held?.substitutes?.length) {
    return optionBase(RECOVERY_OPTION_IDS.SPLIT_CAPACITY, false, {
      rejectReason: "Split capacity requires a verified substitute while primary material is held",
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Primary held material cannot be issued"],
    });
  }

  const sub = materialById(snapshot, held.substitutes[0]);
  if (!sub || sub.available < impact.impactedUnits) {
    return optionBase(RECOVERY_OPTION_IDS.SPLIT_CAPACITY, false, {
      rejectReason: "Substitute stock cannot cover all impacted units for split plan",
      impactedUnits: impact.impactedUnits,
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["No stock over-allocation"],
    });
  }

  const cells = onlineCompatibleCells(snapshot, sub.materialId);
  if (cells.length < 2) {
    return optionBase(RECOVERY_OPTION_IDS.SPLIT_CAPACITY, false, {
      rejectReason: "Split requires at least two online compatible cells",
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Offline cells excluded"],
    });
  }

  const hoursNeeded = impact.jobs.reduce((s, j) => s + j.totalHours, 0);
  // Minimize makespan with a capped water-fill over simultaneous cell hours.
  // This differs from the cost-first substitute path and actually uses both cells.
  let remaining=hoursNeeded;let active=[...cells];const allocations=[];
  while(active.length && remaining>0){
    const share=remaining/active.length;
    const capped=active.filter(c=>c.availableHours<share);
    if(!capped.length){for(const c of active)allocations.push({cellId:c.cellId,hours:round2(share),costUsd:round2(share*c.hourlyCostUsd)});remaining=0;break;}
    for(const c of capped){allocations.push({cellId:c.cellId,hours:c.availableHours,costUsd:round2(c.availableHours*c.hourlyCostUsd)});remaining-=c.availableHours;}
    active=active.filter(c=>!capped.includes(c));
  }
  const unmetHours=Math.max(0,remaining);
  if (unmetHours > 0) {
    return optionBase(RECOVERY_OPTION_IDS.SPLIT_CAPACITY, false, {
      rejectReason: "Combined cell capacity cannot absorb required hours",
      impactedUnits: impact.impactedUnits,
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Capacity is sum of online compatible cells only"],
    });
  }

  const laborCost = round2(allocations.reduce((s, a) => s + a.costUsd, 0));
  const materialPremium = round2(Math.max(0, sub.unitCostUsd - held.unitCostUsd) * impact.impactedUnits);
  const finishHours = round2(Math.max(...allocations.map((a) => a.hours)));

  return optionBase(RECOVERY_OPTION_IDS.SPLIT_CAPACITY, true, {
    impactedUnits: impact.impactedUnits,
    finishHours,
    incrementalCostUsd: round2(laborCost + materialPremium),
    evidenceIds,
    assumptions: [
      ...snapshot.assumptions,
      "Production hours split across compatible online cells",
    ],
    constraints: ["Held primary material not issued", "Cost includes labor and material premium"],
    detail: { materialId: sub.materialId, allocations },
  });
}

export function compareRecoveryOptions(snapshot) {
  const impact = listImpactedJobs(snapshot);
  if (impact.impactedUnits <= 0) {
    return {
      snapshotDigest: snapshot.snapshotDigest,
      impacted: impact,
      options: [],
      feasibleCount: 0,
      status: "insufficient_feasible_recovery_options",
      message: "No jobs impacted by the held material",
    };
  }

  const options = [
    computeWait(snapshot, impact),
    computeSubstitute(snapshot, impact),
    computeSplit(snapshot, impact),
  ];
  const feasibleCount = options.filter((o) => o.feasible).length;
  return {
    snapshotDigest: snapshot.snapshotDigest,
    impacted: impact,
    options,
    feasibleCount,
    status: feasibleCount > 0 ? "options_available" : "insufficient_feasible_recovery_options",
    message:
      feasibleCount > 0
        ? `${feasibleCount} feasible recovery option(s) computed from snapshot inputs`
        : "insufficient feasible recovery options; additional evidence required",
  };
}

export function getCapacity(snapshot) {
  return {
    snapshotDigest: snapshot.snapshotDigest,
    cells: snapshot.cells.map((c) =>
      Object.freeze({
        cellId: c.cellId,
        online: c.online,
        availableHours: c.availableHours,
        hourlyCostUsd: c.hourlyCostUsd,
        compatibleMaterials: c.compatibleMaterials,
      }),
    ),
  };
}

export function analyzeSnapshot(snapshot) {
  const registry = buildEvidenceRegistry(snapshot);
  const impacted = listImpactedJobs(snapshot);
  const recovery = compareRecoveryOptions(snapshot);
  const capacity = getCapacity(snapshot);
  return {
    snapshotDigest: snapshot.snapshotDigest,
    scenarioId: snapshot.scenarioId,
    incident: snapshot.incident,
    impacted,
    recovery,
    capacity,
    evidenceCount: registry.size,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
