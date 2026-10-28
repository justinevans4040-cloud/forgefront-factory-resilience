/**
 * Server-grounded Muse Spark briefing context (server-side only).
 *
 * The brief payload, evidence registry and model tools are ALL derived on the
 * server from the scenario inputs (certificate text, assumptions, disruptions) via
 * the deterministic engine. The browser never supplies "evidence".
 *
 * Tools are read-only views over engine output. A live model (Muse Spark, or a
 * local Llama via Ollama) calls them with OpenAI-compatible tool calls; in Sample
 * mode (no live Muse Spark key) a deterministic planner calls the SAME tools in a
 * fixed order so the reasoning trace and citations are produced by real tool
 * executions — only the final wording is a template.
 */
import { buildPmContextFromState } from "./pm/pm-analysis.mjs";
import { scenarioHash } from "./scenario-hash.mjs";
import { buildSampleStructuredClaims, buildAdversarialStructuredClaims, serializeStructuredBrief } from "./structured-brief.mjs";

export const SAMPLE_MODE_LABEL = "Sample mode (no live Muse Spark key)";

export function buildBriefPayload(inputs) {
  const ctx = buildPmContextFromState(inputs);
  const { factory, certificate, impact, plans, pm } = ctx;
  const pmByPlan = new Map((pm?.plans || []).map(p => [p.planId, p]));
  const lowest = plans[0] ? pmByPlan.get(plans[0].id) : null;
  return {
    ctx,
    scenarioHash: scenarioHash(inputs),
    payload: {
      scenarioId: factory.scenarioId,
      summary: {
        certificateStatus: certificate.status,
        findings: certificate.findings.map(f => ({ field: f.field, expected: f.expected, observed: f.observed, evidence: f.evidence, status: f.status })),
        impactedOrders: impact.orderCount,
        impactedUnits: impact.units,
        indicativeOrderValue: impact.exposureValue,
        affectedMachines: impact.affectedMachines,
        totalMachines: factory.machines.length,
        totalOrders: factory.jobs.length,
        jobs: impact.jobs.map(j => ({ id: j.id, order: j.order, units: j.units, priority: j.priority, machineId: j.machineId, dueHour: j.dueHour }))
      },
      plans: plans.slice(0, 4).map(p => {
        const row = pmByPlan.get(p.id);
        return {
          id: p.id, label: p.label, estimatedCost: p.estimatedCost,
          lateHours: p.incrementalLateHours, substitutedQualifiedUnits: p.stockUsed,
          conditionalJobs: p.conditionalJobs, lateJobsShopWide: p.lateJobs, notes: p.notes,
          cpm: row?.cpm ? { finishDeltaHours: row.cpm.finishDeltaHours, impactedFinishDeltaHours: row.cpm.impactedFinishDeltaHours, newlyCriticalJobIds: row.cpm.newlyCriticalJobIds } : null,
          evm: row?.evm ? { costPerformanceIndex: row.evm.costPerformanceIndex, schedulePerformanceIndex: row.evm.schedulePerformanceIndex, estimateAtCompletion: row.evm.estimateAtCompletion } : null
        };
      }),
      pm: pm?.active ? {
        wsjfRank: pm.wsjfRank,
        cells: (lowest?.littlesLaw || pm.baseline.littlesLaw).map(({ label, burdenRatePerHour, ...c }) => c)
      } : null
    }
  };
}

/** OpenAI-compatible tool schemas exposed to the model. */
export const BRIEF_TOOLS = [
  { type: "function", function: { name: "get_incident_summary", description: "Certificate findings and traced impact (jobs, units, cells, exposure) for the active scenario.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function", function: { name: "list_recovery_plans", description: "All recovery plans ranked by estimated cost, with late hours, units and conditional jobs.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function", function: { name: "get_plan_metrics", description: "Synthetic CPM/EVM metrics for one plan.", parameters: { type: "object", properties: { planId: { type: "string", enum: ["reissue", "expedite", "reallocate", "hybrid"] } }, required: ["planId"], additionalProperties: false } } },
  { type: "function", function: { name: "get_wsjf_priorities", description: "Impacted jobs ranked by WSJF (fix-first order).", parameters: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 7 } }, additionalProperties: false } } },
  { type: "function", function: { name: "get_cell_flow", description: "Measured Little's Law flow stats per production cell under the lowest-cost plan.", parameters: { type: "object", properties: {}, additionalProperties: false } } }
];

/** Execute a tool against the server-computed payload. Read-only; returns data + citable evidence ids. */
export function executeBriefTool(payload, name, args = {}) {
  const s = payload.summary;
  switch (name) {
    case "get_incident_summary":
      return {
        data: { certificateStatus: s.certificateStatus, findings: s.findings.map(f => ({ field: f.field, expected: f.expected, observed: f.observed, status: f.status, line: f.evidence?.line ?? null })), impactedJobs: s.impactedOrders, impactedUnits: s.impactedUnits, affectedCells: s.affectedMachines, illustrativeExposureUsd: s.indicativeOrderValue },
        evidenceIds: [...s.findings.map(f => `field:${f.field}`), "metric:impactedOrders", "metric:impactedUnits", "metric:affectedCells", "metric:exposure"]
      };
    case "list_recovery_plans":
      return {
        data: payload.plans.map(p => ({ id: p.id, label: p.label, estimatedCost: p.estimatedCost, incrementalLateHours: p.lateHours, qualifiedUnits: p.substitutedQualifiedUnits, conditionalJobs: p.conditionalJobs })),
        evidenceIds: payload.plans.map(p => `plan:${p.id}`)
      };
    case "get_plan_metrics": {
      const p = payload.plans.find(x => x.id === args.planId);
      if (!p) return { error: "UNKNOWN_PLAN", evidenceIds: [] };
      return {
        data: { planId: p.id, cpm: p.cpm, evm: p.evm, synthetic: true },
        evidenceIds: [`pm:finishDelta:${p.id}`, `pm:impactedFinishDelta:${p.id}`, `pm:cpi:${p.id}`, `pm:spi:${p.id}`, `pm:eac:${p.id}`]
      };
    }
    case "get_wsjf_priorities": {
      const limit = Math.min(7, Math.max(1, Number(args.limit) || 3));
      const rows = (payload.pm?.wsjfRank || []).slice(0, limit);
      return { data: rows, evidenceIds: rows.map(r => `pm:wsjf:${r.jobId}`) };
    }
    case "get_cell_flow": {
      const cells = payload.pm?.cells || [];
      return { data: cells, evidenceIds: cells.map(c => `cell:${c.machineId}`) };
    }
    default:
      return { error: "UNKNOWN_TOOL", evidenceIds: [] };
  }
}

/** Deterministic planner used in Sample mode: real tool executions, template wording. */
export function runSamplePlanner(payload) {
  const trace = [];
  const call = (name, args = {}, why) => {
    const result = executeBriefTool(payload, name, args);
    trace.push({ step: trace.length + 1, tool: name, args, why, evidenceIds: result.evidenceIds, ok: !result.error });
    return result.data;
  };
  const incident = call("get_incident_summary", {}, "Establish what conflicts and what is held.");
  const plans = call("list_recovery_plans", {}, "Compare recovery options by estimated cost.");
  const top = plans[0];
  const metrics = top ? call("get_plan_metrics", { planId: top.id }, "Check schedule/cost effect of the cheapest option.") : null;
  const wsjf = call("get_wsjf_priorities", { limit: 3 }, "Order the fix-first jobs.");
  const heat = incident.findings.find(f => f.field === "heat");
  const structured = buildSampleStructuredClaims(payload);
  return { text: serializeStructuredBrief(structured), structured, trace };
}

/** Known-bad brief used by "Run adversarial brief" to prove the claim checker blocks things. */
export function adversarialBrief(payload) {
  const structured = buildAdversarialStructuredClaims(payload);
  return {
    text: serializeStructuredBrief(structured),
    structured,
    expectedBlocked: 6,
    expectedSchemaInvalid: true
  };
}
