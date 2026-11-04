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
      totalHours: j.unitsRequired * j.hoursPerUnit,
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
      hours: take,
      costUsd: round2(take * cell.hourlyCostUsd),
    });
    remaining = Math.max(0,remaining - take);
  }
  return { allocations: Object.freeze(allocations), unmetHours: remaining<1e-9?0:remaining };
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
  const { allocations, unmetHours } = allocateHoursAcrossCells(cells, hoursNeeded);
  if (unmetHours > 0) {
    return optionBase(RECOVERY_OPTION_IDS.WAIT_REPLENISHMENT, false, {
      rejectReason: "Insufficient compatible online capacity after replenishment",
      impactedUnits: impact.impactedUnits,
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Capacity checked against online compatible cells only"],
    });
  }

  const finishHours = ceilHours(held.replenishmentHours + hoursNeeded);
  return optionBase(RECOVERY_OPTION_IDS.WAIT_REPLENISHMENT, true, {
    impactedUnits: impact.impactedUnits,
    finishHours,
    incrementalCostUsd: 0,
    evidenceIds,
    assumptions: [
      ...snapshot.assumptions,
      `Documented replenishment lead time ${held.replenishmentHours} hours`,
      "Production requires replenishment covering all impacted demand; held stock is not issued",
    ],
    constraints: ["Held lot remains unavailable until replenishment posts"],
    detail: { replenishmentHours: held.replenishmentHours, productionHours: hoursNeeded, allocations, supply: {materialId:held.materialId,unitsRequired:impact.impactedUnits,source:"planned_replenishment",documentedLeadTimeHours:held.replenishmentHours} },
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
    const proportionalHours = impact.jobs.reduce((s, j) => s + j.totalHours, 0) * (take / unitsNeeded);
    const { allocations, unmetHours } = allocateHoursAcrossCells(cells, proportionalHours);
    if (unmetHours > 0) continue;
    for(const a of allocations)remainingCapacity.set(a.cellId,Math.max(0,remainingCapacity.get(a.cellId)-a.hours));
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
    remaining = Math.max(0,remaining - take);
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
  const finishHours = ceilHours(Math.max(...cellTotals.values(), 0));
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

// Solve exact material -> compatible cell work flows. Search makespan caps in
// hundredths of an hour, but retain fractional work and units inside the plan. Every path consumes both verified stock
// and one shared cell budget. Residual edges let later materials reroute earlier
// draws instead of reporting an avoidable incompatibility as infeasible.
function compatibleSplit(substitutes, cells, hoursNeeded, unitsNeeded) {
  const work = hoursNeeded;
  const epsilon=1e-10*Math.max(1,work);
  const capacities = cells.map(c => c.availableHours);
  function route(limit) {
    const sink=1+substitutes.length+cells.length;
    const graph=Array.from({length:sink+1},()=>[]);
    const add=(from,to,capacity)=>{
      const edge={to,capacity,initial:capacity,reverse:graph[to].length};
      graph[from].push(edge);
      graph[to].push({to:from,capacity:0,initial:0,reverse:graph[from].length-1});
      return edge;
    };
    const routes=[];
    substitutes.forEach((sub,i)=>{
      add(0,1+i,Math.min(work,sub.available*work/unitsNeeded));
      cells.forEach((cell,j)=>{
        if(cell.compatibleMaterials.includes(sub.materialId)){
          routes.push({sub,cell,edge:add(1+i,1+substitutes.length+j,work)});
        }
      });
    });
    cells.forEach((cell,j)=>add(1+substitutes.length+j,sink,Math.min(limit,capacities[j])));
    let sent=0;
    while(sent<work-epsilon){
      const parents=Array(graph.length).fill(null),queue=[0];parents[0]={};
      for(let head=0;head<queue.length&&!parents[sink];head++){
        const from=queue[head];
        for(const edge of graph[from])if(edge.capacity>epsilon&&!parents[edge.to]){
          parents[edge.to]={from,edge};queue.push(edge.to);
        }
      }
      if(!parents[sink])break;
      let take=work-sent;
      for(let to=sink;to!==0;to=parents[to].from)take=Math.min(take,parents[to].edge.capacity);
      for(let to=sink;to!==0;to=parents[to].from){
        const edge=parents[to].edge;edge.capacity-=take;graph[to][edge.reverse].capacity+=take;
      }
      sent+=take;
    }
    return {sent,routes};
  }
  let low=0,high=Math.ceil(Math.max(0,...capacities)*100);
  if(route(high/100).sent<work-epsilon)return null;
  // Feasibility is monotone in the shared makespan cap.
  while(low<high){const mid=Math.floor((low+high)/2);if(route(mid/100).sent>=work-epsilon)high=mid;else low=mid+1;}
  return route(low/100).routes.filter(r=>r.edge.initial-r.edge.capacity>epsilon).map(r=>({
    materialId:r.sub.materialId,cellId:r.cell.cellId,
    hours:r.edge.initial-r.edge.capacity,
    costUsd:round2((r.edge.initial-r.edge.capacity)*r.cell.hourlyCostUsd),
  }));
}

function computeSplit(snapshot, impact) {
  const held = materialById(snapshot, snapshot.incident.heldMaterialId);
  const evidenceIds = (snapshot.evidenceRecords||[]).filter(e=>e.field==='onHand').map(e=>e.evidenceId);

  // Split path: cover demand using every verified substitute across all compatible online cells.
  if (!held?.substitutes?.length) {
    return optionBase(RECOVERY_OPTION_IDS.SPLIT_CAPACITY, false, {
      rejectReason: "Split capacity requires a verified substitute while primary material is held",
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Primary held material cannot be issued"],
    });
  }

  const substitutes=held.substitutes.map(id=>materialById(snapshot,id)).filter(sub=>sub&&sub.available>0);
  const totalSubstituteUnits=substitutes.reduce((sum,sub)=>sum+sub.available,0);
  if (!substitutes.length || totalSubstituteUnits < impact.impactedUnits) {
    return optionBase(RECOVERY_OPTION_IDS.SPLIT_CAPACITY, false, {
      rejectReason: "Substitute stock cannot cover all impacted units for split plan",
      impactedUnits: impact.impactedUnits,
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["No stock over-allocation"],
    });
  }

  const cellCapacity=new Map();
  for(const sub of substitutes){
    for(const cell of onlineCompatibleCells(snapshot, sub.materialId)){
      const prior=cellCapacity.get(cell.cellId);
      if(!prior||cell.availableHours>prior.availableHours)cellCapacity.set(cell.cellId,{...cell});
    }
  }
  const cells=[...cellCapacity.values()];
  if (cells.length < 2) {
    return optionBase(RECOVERY_OPTION_IDS.SPLIT_CAPACITY, false, {
      rejectReason: "Split requires at least two online compatible cells",
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Offline cells excluded"],
    });
  }

  const hoursNeeded = impact.jobs.reduce((s, j) => s + j.totalHours, 0);
  const materialAllocations=compatibleSplit(substitutes,cells,hoursNeeded,impact.impactedUnits);
  const unmetHours=materialAllocations===null?hoursNeeded:0;
  if (unmetHours > 0) {
    return optionBase(RECOVERY_OPTION_IDS.SPLIT_CAPACITY, false, {
      rejectReason: "Compatible cells cannot absorb required hours for available substitute stock",
      impactedUnits: impact.impactedUnits,
      evidenceIds,
      assumptions: snapshot.assumptions,
      constraints: ["Capacity is sum of online compatible cells only"],
    });
  }

  const allocations=cells.map(cell=>{
    const hours=materialAllocations.filter(a=>a.cellId===cell.cellId).reduce((sum,a)=>sum+a.hours,0);
    return {cellId:cell.cellId,hours,costUsd:round2(hours*cell.hourlyCostUsd)};
  }).filter(a=>a.hours>0);
  const draws=[];
  let materialPremium=0;
  let zeroWorkUnits=impact.impactedUnits;
  for(const sub of substitutes){
    const routes=materialAllocations.filter(a=>a.materialId===sub.materialId);
    const hours=routes.reduce((sum,a)=>sum+a.hours,0);
    if(hours<=0&&hoursNeeded>0)continue;
    const units=hoursNeeded>0?Math.min(sub.available,hours/hoursNeeded*impact.impactedUnits):Math.min(sub.available,zeroWorkUnits);
    zeroWorkUnits-=units;
    if(units<=0)continue;
    const premium=round2(Math.max(0,sub.unitCostUsd-held.unitCostUsd)*units);
    materialPremium=round2(materialPremium+premium);
    draws.push({materialId:sub.materialId,units,materialPremiumUsd:premium,cells:routes.map(({materialId,...a})=>a)});
  }
  const laborCost = round2(allocations.reduce((s, a) => s + a.costUsd, 0));
  const finishHours = ceilHours(Math.max(0,...allocations.map((a) => a.hours)));

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
    detail: { draws, materialPremiumUsd: materialPremium, laborCostUsd: laborCost, allocations },
  });
}

// Attach the same server-computed work to named job portions. A job can use
// more than one cell; inventing whole-job browser assignments changes makespan.
function attachJobAssignments(snapshot, impact, option) {
  if(!option.feasible)return option;
  const assignments=[],loads=new Map();
  const jobs=[...impact.jobs].sort((a,b)=>(a.dueHours??Infinity)-(b.dueHours??Infinity)||a.jobId.localeCompare(b.jobId));
  if(option.optionId===RECOVERY_OPTION_IDS.WAIT_REPLENISHMENT){
    const routes=option.detail.allocations.map(a=>({...a,remaining:a.hours}));
    let clock=option.detail.replenishmentHours;
    for(const job of jobs){
      let remainingUnits=job.unitsRequired;
      const candidates=routes.length?routes:[{cellId:onlineCompatibleCells(snapshot,job.materialId)[0]?.cellId,remaining:0}];
      for(const route of candidates){
        if(remainingUnits<=1e-9)break;
        const units=job.hoursPerUnit>0?Math.min(remainingUnits,route.remaining/job.hoursPerUnit):remainingUnits;
        if(units<=1e-9)continue;
        const hours=units*job.hoursPerUnit;
        assignments.push({jobId:job.jobId,materialId:job.materialId,cellId:route.cellId,units,hours,startHours:clock,finishHours:clock+hours,dueHours:job.dueHours,materialSource:'planned_replenishment'});
        clock+=hours;route.remaining=Math.max(0,route.remaining-hours);remainingUnits=Math.max(0,remainingUnits-units);
      }
    }
    return optionBase(option.optionId,true,{...option,detail:{...option.detail,assignments}});
  }
  const draws=option.detail?.draws??[];
  for(const draw of draws){
    const routes=(draw.cells??[]).map(a=>({...a,remaining:a.hours}));
    if(!routes.length&&jobs.every(job=>job.hoursPerUnit===0)){
      const cell=onlineCompatibleCells(snapshot,draw.materialId)[0];
      if(cell)routes.push({cellId:cell.cellId,remaining:0});
    }
    for(const job of jobs){
      let remainingUnits=job.unitsRequired*draw.units/impact.impactedUnits;
      for(const route of routes){
        if(remainingUnits<=1e-8)break;
        const units=job.hoursPerUnit>0?Math.min(remainingUnits,route.remaining/job.hoursPerUnit):remainingUnits;
        if(units<=1e-8)continue;
        const hours=units*job.hoursPerUnit;
        const startHours=loads.get(route.cellId)??0;
        assignments.push({jobId:job.jobId,materialId:draw.materialId,cellId:route.cellId,units,hours,startHours,finishHours:startHours+hours,dueHours:job.dueHours});
        loads.set(route.cellId,startHours+hours);route.remaining=Math.max(0,route.remaining-hours);remainingUnits=Math.max(0,remainingUnits-units);
      }
    }
  }
  return optionBase(option.optionId,true,{...option,detail:{...option.detail,assignments}});
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
  ].map(option=>attachJobAssignments(snapshot,impact,option));
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

// Never promise a displayed completion earlier than its exact scheduled finish.
function ceilHours(n) {
  const scaled=n*100,nearest=Math.round(scaled);
  const rounded=Math.abs(scaled-nearest)<=Number.EPSILON*Math.max(1,Math.abs(scaled))*8?nearest:Math.ceil(scaled);
  return Math.max(0,rounded/100);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
