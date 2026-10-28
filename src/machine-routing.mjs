/** Illustrative Haas-style cell routing (synthetic — not manufacturer specs). */

export const ROUTING_PROFILES = {
  "5axis-complex": "HAAS-UMC750",
  "large-prismatic": "HAAS-VF6",
  "small-prismatic": "HAAS-VF2",
  "horizontal-production": "HAAS-EC400"
};

const SIZE_RANK = { small: 1, medium: 2, large: 3 };

export function machineById(machines, id) {
  const row = machines.find(m => m.id === id);
  if (!row) throw new Error(`Unknown production machine: ${id}`);
  return row;
}

export function resolveMachineForProfile(machines, profile) {
  const id = ROUTING_PROFILES[profile];
  if (!id) throw new Error(`Unknown routing profile: ${profile}`);
  return machineById(machines, id);
}

export function jobIsCompatible(job, machine) {
  if (job.routingProfile && ROUTING_PROFILES[job.routingProfile] !== machine.id) return false;
  if (job.requiredCapabilities?.length) {
    if (!job.requiredCapabilities.every(cap => machine.capabilities.includes(cap))) return false;
  }
  if (job.minSizeClass) {
    if ((SIZE_RANK[machine.sizeClass] || 0) < (SIZE_RANK[job.minSizeClass] || 0)) return false;
  }
  if (job.maxSizeClass) {
    if ((SIZE_RANK[machine.sizeClass] || 99) > (SIZE_RANK[job.maxSizeClass] || 99)) return false;
  }
  return job.machineId === machine.id;
}

export function assertFactoryRouting(factory) {
  for (const job of factory.jobs) {
    const machine = machineById(factory.machines, job.machineId);
    if (!jobIsCompatible(job, machine)) {
      throw new Error(`Incapable machine ${job.machineId} for ${job.id} (${job.routingProfile})`);
    }
  }
}

export function computeJobRunHours(job, machine) {
  const unitHours = (job.baseUnitHours || 0.35) * (job.units || 1);
  const scaled = unitHours * (machine.cycleTimeMultiplier || 1);
  const setup = job.includesSetup ? (machine.setupHours || 0) : 0;
  return +(setup + scaled).toFixed(2);
}
