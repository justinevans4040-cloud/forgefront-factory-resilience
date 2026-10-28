import { createScenario } from "./scenario.mjs";
import { enrichCertificateWithEpistemic } from "./epistemic.mjs";
import { assertFactoryRouting, machineById } from "./machine-routing.mjs";

const FIELDS = [
  { key: "po", title: "Purchase Order", expression: /\b(?:Purchase\s+Order|PO)(?:\s*(?:No\.?|Number|#))?\s*[:=\-]?\s*(PO[- ]?\d{4,8})\b/i },
  { key: "heat", title: "Heat Number", expression: /\bHeat(?:\s*(?:No\.?|Number|#))?\s*[:=\-]?\s*([A-Z]{1,3}[- ]?\d{3,7})\b/i },
  { key: "grade", title: "Material Grade", expression: /\b(?:Material\s+Grade|Grade|Spec(?:ification)?)\s*[:=\-]?\s*(AMS[- ]?\d{4,5})\b/i }
];

export function extractCertificate(text) {
  const lines = String(text || "").split(/\r?\n/);
  const fields = {};
  for (const field of FIELDS) {
    const at = lines.findIndex(line => field.expression.test(line));
    const match = at < 0 ? null : lines[at].match(field.expression);
    fields[field.key] = match ? {
      value: match[1].toUpperCase().replace(/\s+/g, "").replace(/^(PO|H|A|S)(?=\d)/, "$1-"),
      line: at + 1, quote: lines[at].trim(), source: "incoming-material-certificate"
    } : null;
  }
  return { fields, lineCount: lines.length, present: Object.values(fields).filter(Boolean).length, sourceText: String(text || "") };
}

export function validateCertificate(factory, certificateText) {
  const lot = factory.lots.find(item => item.id === factory.incomingLotId);
  if (!lot) throw new Error("Incoming lot not found.");
  const extraction = extractCertificate(certificateText);
  const findings = FIELDS.map(({ key, title }) => {
    const evidence = extraction.fields[key];
    const expected = lot[key];
    return {
      field: key, label: title, expected,
      observed: evidence?.value || null,
      status: !evidence ? "UNKNOWN" : evidence.value === expected ? "MATCH" : "CONFLICT",
      evidence: evidence ? { line: evidence.line, quote: evidence.quote } : null,
      sourceRef: `lot:${lot.id}:${key}`
    };
  });
  const status = findings.some(f => f.status === "CONFLICT") ? "REVIEW REQUIRED"
    : findings.some(f => f.status === "UNKNOWN") ? "UNKNOWN"
    : "FIELDS MATCHED";
  const base = { lotId: lot.id, status, findings, extraction, source: "submitted-certificate-text", baseline: "synthetic scenario master data" };
  return enrichCertificateWithEpistemic(base);
}

export function traceImpact(factory, certificate) {
  const blocked = certificate.status !== "FIELDS MATCHED";
  const jobs = blocked ? factory.jobs.filter(job => job.lotId === factory.incomingLotId) : [];
  const impactedOrders = [...new Set(jobs.map(job => job.order))];
  const units = jobs.reduce((total, job) => total + job.units, 0);
  return {
    blocked,
    lotId: factory.incomingLotId,
    jobs, jobIds: jobs.map(job => job.id),
    impactedOrders, orderCount: impactedOrders.length, units,
    exposureValue: jobs.reduce((total, job) => total + job.value, 0),
    affectedMachines: [...new Set(jobs.map(job => job.machineId))],
    basis: blocked ? certificate.findings.filter(f => f.status !== "MATCH") : [],
    certainty: "Trace derived from synthetic material-to-job assignments"
  };
}

const priorityPoints = { critical: 0, high: 1, normal: 2 };

export function scheduleJobs(factory, releaseTimes = {}, outageHours = 0) {
  assertFactoryRouting(factory);
  const byMachine = new Map(factory.machines.map(m => [m.id, []]));
  for (const job of factory.jobs) {
    if (!byMachine.has(job.machineId)) throw new Error("Unknown production machine");
    byMachine.get(job.machineId).push(job);
  }
  const schedule = [];
  for (const [machineId, jobs] of byMachine.entries()) {
    const machine = machineById(factory.machines, machineId);
    const pool = [...jobs];
    const outageMachine = factory.outageMachineId || "HAAS-EC400";
    let clock = machineId === outageMachine ? outageHours : 0;
    let previousJob = null;
    while (pool.length) {
      const available = pool.filter(job => (releaseTimes[job.id] || 0) <= clock);
      if (!available.length) {
        clock = Math.min(...pool.map(job => releaseTimes[job.id] || 0));
      }
      const ready = pool.filter(job => (releaseTimes[job.id] || 0) <= clock)
        .sort((a, b) => a.dueHour - b.dueHour ||
          priorityPoints[a.priority] - priorityPoints[b.priority] ||
          a.id.localeCompare(b.id));
      const job = ready[0];
      if (!job) throw new Error("No schedulable jobs");
      let start = clock;
      if (previousJob) start += machine.setupHours || 0;
      const end = start + job.hours;
      schedule.push({
        id: job.id, order: job.order, machineId: machineId, start, end,
        dueHour: job.dueHour, lateHours: Math.max(0, +(end - job.dueHour).toFixed(2)),
        priority: job.priority, lotId: job.lotId, routingProfile: job.routingProfile
      });
      clock = end;
      previousJob = job;
      pool.splice(pool.findIndex(row => row.id === job.id), 1);
    }
  }
  return schedule.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

export function buildRecoveryPlans(factory, impact, overrides = {}) {
  const a = { ...factory.assumptions, ...overrides };
  const valid = ["reissueHours", "expeditedLotHours", "hybridRemainderHours", "substituteStock", "expediteFee", "hybridFee", "substitutionPremiumPerUnit", "latenessCostPerHour", "machineOutageHours"];
  const MAX_ASSUMPTION = 1e12;
  for (const key of valid) {
    if (!Number.isFinite(a[key]) || a[key] < 0) throw new Error(`Invalid assumption: ${key}`);
    if (a[key] > MAX_ASSUMPTION) throw new Error(`Invalid assumption: ${key}`);
  }
  const substituteLotId = factory.substituteLotId || "LOT-TI-ALT";
  const source = factory.lots.find(l => l.id === substituteLotId);
  const reference = factory.lots.find(l => l.id === factory.incomingLotId);
  const substituteQualified = source?.grade === reference?.grade && source?.status === "qualified-inventory";
  const substituteCapacity = substituteQualified ? Math.min(a.substituteStock, source.quantity) : 0;
  const baseline = scheduleJobs(factory);
  const baselineById = new Map(baseline.map(item => [item.id, item]));
  const priorityJobs = [...impact.jobs].sort((x, y) =>
    priorityPoints[x.priority] - priorityPoints[y.priority] ||
    x.dueHour - y.dueHour || x.id.localeCompare(y.id));
  const definitions = [
    { id: "reissue", label: "Hold & verify", description: "Protect quality while the supplier reconciles the record.", delay: a.reissueHours, stock: 0, fee: 0, notes: "All impacted jobs remain blocked pending documented resolution." },
    { id: "expedite", label: "Expedited qualified lot", description: "Use a replacement lot after its credentials and receipt are verified.", delay: a.expeditedLotHours, stock: 0, fee: a.expediteFee, notes: "Supply ETA is a planning assumption, not a confirmed supplier commitment." },
    { id: "reallocate", label: "Reallocate qualified stock", description: "Assign available matching material to the highest-priority jobs.", delay: a.reissueHours, stock: substituteCapacity, fee: 0, notes: "Remaining jobs stay on hold pending certificate reconciliation." },
    { id: "hybrid", label: "Priority recovery split", description: "Recover critical jobs from qualified stock and expedite the rest.", delay: a.hybridRemainderHours, stock: substituteCapacity, fee: a.hybridFee, notes: "Requires review of available inventory and replacement lot documents." }
  ];
  return definitions.map(def => {
    let stockRemaining = def.stock;
    const allocations = [];
    const release = {};
    for (const job of priorityJobs) {
      const allocated = stockRemaining >= job.units;
      if (allocated) stockRemaining -= job.units;
      const replacement = allocated ? substituteLotId :
        def.id === "expedite" || def.id === "hybrid" ? "QUALIFIED-INBOUND (proposed)" :
          "LOT-TI-001 (quarantined)";
      const time = allocated ? 0 : def.delay;
      release[job.id] = time;
      allocations.push({
        jobId: job.id, units: job.units, material: replacement,
        releaseHour: time, status: allocated ? "AVAILABLE FOR REASSIGNMENT" : "BLOCKED UNTIL EVIDENCE",
        conditional: !allocated
      });
    }
    const schedule = scheduleJobs(factory, release, a.machineOutageHours);
    const totalLate = schedule.reduce((s, item) => s + item.lateHours, 0);
    const baselineLate = baseline.reduce((s, item) => s + item.lateHours, 0);
    const incrementalLate = schedule.reduce((sum, item) => sum + Math.max(0, item.lateHours - baselineById.get(item.id).lateHours), 0);
    const useStock = def.stock - stockRemaining;
    const materialPremium = useStock * a.substitutionPremiumPerUnit;
    const burdenLateCost = schedule.reduce((sum, row) => {
      const machine = machineById(factory.machines, row.machineId);
      const base = baselineById.get(row.id);
      const delta = Math.max(0, row.lateHours - (base?.lateHours || 0));
      return sum + delta * a.latenessCostPerHour * (machine.burdenRatePerHour / 120);
    }, 0);
    const estimatedCost = Math.round(def.fee + materialPremium + burdenLateCost);
    return {
      id: def.id, label: def.label, description: def.description, notes: def.notes,
      status: "PROPOSED — NOT AUTHORIZED", expectedReleaseHours: def.delay,
      stockUsed: useStock, stockAvailable: substituteCapacity, fee: def.fee,
      affectedJobs: impact.jobIds.length, conditionalJobs: allocations.filter(x => x.conditional).length,
      lateJobs: schedule.filter(x => x.lateHours > 0).length,
      totalLateHours: +totalLate.toFixed(2), baselineLateHours: +baselineLate.toFixed(2),
      incrementalLateHours: +incrementalLate.toFixed(2), estimatedCost,
      assumptions: { ...a, qualifiedStock: substituteQualified },
      allocations, schedule
    };
  }).sort((a, b) => a.estimatedCost - b.estimatedCost || a.conditionalJobs - b.conditionalJobs);
}

export function createReport(factory, certificate, impact, plans, approval, eventLog, extras = {}) {
  const chosen = plans.find(plan => plan.id === approval?.planId) || null;
  return {
    reportType: "FORGEFRONT_FACTORY_RESILIENCE_SCENARIO",
    reportVersion: "1.0",
    generatedAt: new Date().toISOString(),
    scenario: { id: factory.scenarioId, name: factory.name, synthetic: true },
    certificate: {
      status: certificate.status, source: certificate.source,
      lotId: certificate.lotId, findings: certificate.findings
    },
    exposure: {
      jobIds: impact.jobIds, count: impact.orderCount,
      units: impact.units, illustrativeOrderValue: impact.exposureValue,
      affectedMachines: impact.affectedMachines, certainty: impact.certainty
    },
    plans: plans.map(p => ({
      id: p.id, label: p.label, status: p.status,
      estimatedCost: p.estimatedCost, incrementalLateHours: p.incrementalLateHours,
      qualifiedStockAllocated: p.stockUsed, conditionalJobs: p.conditionalJobs,
      assumptions: p.assumptions, allocations: p.allocations
    })),
    approval: chosen ? {
      planId: chosen.id, status: "OPERATOR ACCEPTED FOR SCENARIO",
      operator: approval.operator, at: approval.at,
      expiresAt: approval.expiresAt || null, consentJti: approval.consentJti || null,
      scenarioHash: approval.scenarioHash || null, consentFlow: "two-step review/confirm (server-recomputed plan hash)",
      operationalRelease: false
    } : null,
    eventLog: [...eventLog],
    auditLedger: extras.auditLedger || null,
    claimAudit: extras.claimAudit || null,
    metaBrief: extras.metaBrief || null,
    build: extras.build || null,
    projectManagement: extras.projectManagement || null,
    kanban: extras.kanban || null,
    declaration: "Synthetic scenario; no physical material authorization, actual cost quote, customer delivery guarantee, or AS9100 compliance certification."
  };
}

export function applyDisruptions(factory, assumptions = {}) {
  const clone = {
    ...factory,
    lots: factory.lots.map(l => ({ ...l })),
    assumptions: { ...factory.assumptions },
    disruptions: { ...factory.disruptions }
  };
  if (assumptions.machineOutageHours != null) clone.disruptions.machineOutageHours = assumptions.machineOutageHours;
  if (assumptions.substituteLotQuestioned) {
    const alt = clone.lots.find(l => l.id === clone.substituteLotId);
    if (alt) alt.status = "hold-review";
    clone.disruptions.substituteLotQuestioned = true;
  }
  return clone;
}

export function initialize(overrides = {}) {
  let factory = createScenario();
  factory = applyDisruptions(factory, overrides);
  const certificate = validateCertificate(factory, factory.certificate);
  const impact = traceImpact(factory, certificate);
  const planOverrides = {
    ...overrides,
    machineOutageHours: overrides.machineOutageHours ?? factory.disruptions.machineOutageHours ?? 0
  };
  return {
    factory,
    certificate,
    impact,
    plans: impact.blocked ? buildRecoveryPlans(factory, impact, planOverrides) : []
  };
}
