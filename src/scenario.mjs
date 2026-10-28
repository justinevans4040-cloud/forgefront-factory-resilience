// Synthetic aerospace production data. All costs, deadlines, machine envelopes and Haas-style
// class names are illustrative engineering fiction — not manufacturer specifications.
import { ROUTING_PROFILES, computeJobRunHours, resolveMachineForProfile } from "./machine-routing.mjs";

export const INCORRECT_CERT = `MATERIAL TEST REPORT
Supplier: Asterium Metals
Purchase Order: PO-45892
Heat Number: H-7713
Material Grade: AMS4928
Lot ID: LOT-TI-001
Reported Quantity: 400
Inspection Reference: MTR-1028
`;

export const MATCHING_CERT = INCORRECT_CERT.replace("H-7713", "H-7731");

function buildMachines() {
  return [
    {
      id: "HAAS-VF2",
      label: "Haas VF-2 class · small vertical (illustrative)",
      builderLine: "Haas",
      sizeClass: "small",
      envelopeNote: "Illustrative small VMC envelope — not OEM data",
      spindleHoursPerShift: 14,
      setupHours: 0.65,
      cycleTimeMultiplier: 1.0,
      burdenRatePerHour: 92,
      capabilities: ["3axis-milling", "drilling", "tapping", "small-prismatic"]
    },
    {
      id: "HAAS-VF6",
      label: "Haas VF-6 class · large vertical (illustrative)",
      builderLine: "Haas",
      sizeClass: "large",
      envelopeNote: "Illustrative large-plate envelope — not OEM data",
      spindleHoursPerShift: 16,
      setupHours: 1.1,
      cycleTimeMultiplier: 1.15,
      burdenRatePerHour: 138,
      capabilities: ["3axis-milling", "large-prismatic", "boring", "heavy-stock"]
    },
    {
      id: "HAAS-UMC750",
      label: "Haas UMC-750 class · 5-axis (illustrative)",
      builderLine: "Haas",
      sizeClass: "medium",
      envelopeNote: "Illustrative 5-axis twin-pallet class — not OEM data",
      spindleHoursPerShift: 15,
      setupHours: 1.4,
      cycleTimeMultiplier: 1.38,
      burdenRatePerHour: 176,
      capabilities: ["5axis-simultaneous", "complex-contours", "impeller-class", "probe-cycle"]
    },
    {
      id: "HAAS-EC400",
      label: "Haas EC-400 class · horizontal (illustrative)",
      builderLine: "Haas",
      sizeClass: "medium",
      envelopeNote: "Illustrative HMC pallet pool — not OEM data",
      spindleHoursPerShift: 18,
      setupHours: 0.9,
      cycleTimeMultiplier: 0.92,
      burdenRatePerHour: 154,
      capabilities: ["4axis-horizontal", "pallet-pool", "production-volume", "through-boring"]
    }
  ];
}

/** Deterministic 40-job shop load with capability-locked routing. */
function buildJobs(machines) {
  const machineMap = new Map(machines.map(m => [m.id, m]));
  const profiles = [
    "small-prismatic", "horizontal-production", "5axis-complex", "large-prismatic",
    "small-prismatic", "horizontal-production", "5axis-complex", "small-prismatic",
    "large-prismatic", "5axis-complex", "horizontal-production", "small-prismatic",
    "large-prismatic", "horizontal-production", "5axis-complex", "small-prismatic",
    "horizontal-production", "large-prismatic", "small-prismatic", "5axis-complex",
    "small-prismatic", "large-prismatic", "horizontal-production", "5axis-complex",
    "small-prismatic", "large-prismatic", "horizontal-production", "small-prismatic",
    "5axis-complex", "horizontal-production", "large-prismatic", "5axis-complex",
    "small-prismatic", "horizontal-production", "large-prismatic", "small-prismatic",
    "5axis-complex", "horizontal-production", "large-prismatic", "small-prismatic"
  ];
  const customers = ["AeroWest", "Horizon Flight", "Northstar Systems", "Crest Engineering", "Summit Avionics"];
  const affectedIndices = new Set([2, 6, 9, 14, 20, 24, 31]);
  const affectedUnits = [20, 30, 22, 24, 28, 18, 36];
  const affectedProfiles = [
    "5axis-complex",
    "large-prismatic",
    "small-prismatic",
    "horizontal-production",
    "5axis-complex",
    "large-prismatic",
    "horizontal-production"
  ];
  let affectedSlot = 0;

  return profiles.map((routingProfile, index) => {
    const affected = affectedIndices.has(index);
    if (affected) routingProfile = affectedProfiles[affectedSlot];
    const lotId = affected ? "LOT-TI-001" : index % 4 === 0 ? "LOT-AL-014" : index % 4 === 1 ? "LOT-ST-033" : index % 4 === 2 ? "LOT-AL-014" : "LOT-ST-033";
    const grade = affected ? "AMS4928" : lotId === "LOT-AL-014" ? "AMS4027" : "AMS5643";
    const units = affected ? affectedUnits[affectedSlot++] : 6 + (index % 7) * 3 + (index % 3);
    const priority = index === 2 || index === 20 ? "critical" : index % 11 === 0 ? "high" : index % 6 === 1 ? "high" : "normal";
    const machine = resolveMachineForProfile(machines, routingProfile);
    const baseUnitHours = routingProfile === "5axis-complex" ? 0.52
      : routingProfile === "large-prismatic" ? 0.41
        : routingProfile === "horizontal-production" ? 0.28
          : 0.33;
    const dueHour = 18 + index * 2.7 + (routingProfile === "5axis-complex" ? 6 : 0) + (priority === "critical" ? -8 : 0);
    const value = 2200 + index * 180 + units * 22 + (routingProfile === "5axis-complex" ? 2400 : 0);
    const job = {
      id: `JOB-${String(index + 1).padStart(3, "0")}`,
      order: `SO-${74100 + index}`,
      customer: customers[index % customers.length],
      routingProfile,
      requiredCapabilities: routingProfile === "5axis-complex" ? ["5axis-simultaneous"] :
        routingProfile === "large-prismatic" ? ["large-prismatic"] :
          routingProfile === "horizontal-production" ? ["pallet-pool"] : ["small-prismatic"],
      minSizeClass: routingProfile === "large-prismatic" ? "large" : routingProfile === "small-prismatic" ? "small" : "medium",
      machineId: machine.id,
      lotId,
      grade,
      units,
      baseUnitHours,
      includesSetup: true,
      dueHour: +dueHour.toFixed(1),
      value,
      priority
    };
    job.hours = computeJobRunHours(job, machineMap.get(machine.id));
    return job;
  });
}

export function createScenario() {
  const machines = buildMachines();
  const jobs = buildJobs(machines);
  const lots = [
    { id: "LOT-TI-001", po: "PO-45892", heat: "H-7731", grade: "AMS4928", source: "Asterium Metals", quantity: 400, status: "awaiting-document-review" },
    { id: "LOT-TI-ALT", po: "PO-45110", heat: "H-6118", grade: "AMS4928", source: "Asterium Metals", quantity: 96, status: "qualified-inventory" },
    { id: "LOT-AL-014", po: "PO-45200", heat: "A-2482", grade: "AMS4027", source: "Valley Alloy", quantity: 700, status: "qualified-inventory" },
    { id: "LOT-ST-033", po: "PO-45176", heat: "S-1709", grade: "AMS5643", source: "Crown Steel", quantity: 500, status: "qualified-inventory" }
  ];
  const packetDocuments = {
    purchase_order: `PURCHASE ORDER CONFIRMATION
Buyer: Northstar Systems MRO
Purchase Order Number: PO-45892
Material: Titanium bar stock
Specification: AMS4928
Heat Number: H-7731
Lot Reference: LOT-TI-001
Quantity: 400 EA
`,
    inventory_receipt: `RECEIVING / INVENTORY RECORD
Receipt ID: RCV-2026-8841
Purchase Order: PO-45892
Lot ID: LOT-TI-001
Heat Number: H-7731
Grade: AMS4928
Quantity Received: 400
Status: AWAITING-DOCUMENT-REVIEW
`
  };

  return {
    scenarioId: "AEROSPACE-40-LOT-CONFLICT",
    scenarioVersion: "1.2.0",
    name: "Wake Industries · illustrative Haas-class four-cell line",
    machines,
    routingLegend: {
      synthetic: true,
      note: "VF-2 / VF-6 / UMC-750 / EC-400 names denote illustrative size classes only.",
      profiles: ROUTING_PROFILES
    },
    lots,
    jobs,
    incomingLotId: "LOT-TI-001",
    substituteLotId: "LOT-TI-ALT",
    outageMachineId: "HAAS-EC400",
    certificate: INCORRECT_CERT,
    packetDocuments,
    disruptions: {
      substituteLotQuestioned: false,
      machineOutageHours: 0
    },
    assumptions: {
      reissueHours: 48,
      expeditedLotHours: 20,
      hybridRemainderHours: 20,
      substituteStock: 96,
      expediteFee: 1650,
      hybridFee: 2150,
      substitutionPremiumPerUnit: 14,
      latenessCostPerHour: 125,
      machineOutageHours: 0
    },
    evmSynthetic: {
      synthetic: true,
      label: "Illustrative EVM cost rates — burden-weighted by cell, not actual financials",
      budgetAtCompletion: 118400,
      plannedPercentComplete: 0.36,
      actualCostToDate: 42800,
      recoverySpendFactor: 0.44,
      scheduleHorizonHours: 140
    }
  };
}
