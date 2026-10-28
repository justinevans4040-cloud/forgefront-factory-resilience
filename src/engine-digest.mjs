/** Stable digest of the deterministic engine's outputs for a scenario (used by the offline proof). */
import { buildPmContextFromState } from "./pm/pm-analysis.mjs";
import { sha256Hex } from "./sha256.mjs";

export function engineOutputs(inputs) {
  const { certificate, impact, plans, pm } = buildPmContextFromState(inputs);
  return {
    certificateStatus: certificate.status,
    impacted: { jobs: impact.jobIds, units: impact.units, cells: impact.affectedMachines },
    plans: plans.map(p => [p.id, p.estimatedCost, p.incrementalLateHours, p.stockUsed, p.conditionalJobs, p.lateJobs]),
    wsjf: (pm?.wsjfRank || []).map(r => [r.jobId, r.wsjfScore]),
    cells: (pm?.baseline?.littlesLaw || []).map(c => [c.machineId, c.averageItemsInSystem, c.throughputJobsPerHour, c.utilizationPct])
  };
}

export const engineDigest = inputs => {
  const outputs = engineOutputs(inputs);
  return { digest: sha256Hex(JSON.stringify(outputs)), planCount: outputs.plans.length, cheapest: outputs.plans[0]?.[0] ?? null };
};
