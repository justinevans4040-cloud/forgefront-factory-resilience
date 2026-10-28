/**
 * Deterministic-first resolution ladder with per-answer provenance (server-side).
 *
 *   Rung 1 · ENGINE  — a deterministic resolver answers factual questions straight from the
 *                      engine (cost, impact, WSJF, CPM/EVM, cell flow, certificate fields).
 *                      Answers are recomputed every time (never cached) and claim-checked.
 *   Rung 2 · CACHE   — a previously VERIFIED Muse Spark answer for the same scenario hash and
 *                      normalized question (saves a model call; provenance keeps the origin).
 *   Rung 3 · MUSE SPARK — used where it adds value: narrative synthesis (why / trade-off /
 *                      compare / recommend) or questions no resolver covers. The model works
 *                      through the same read-only engine tools; every sentence is claim-checked.
 *                      The ledger records WHY the engine alone was not enough.
 */
import { sha256Hex } from "./sha256.mjs";
import { executeBriefTool } from "./brief-context.mjs";

export const PROVENANCE = Object.freeze({ ENGINE: "engine", CACHE: "cache", MUSE: "muse-spark" });

/** Strong narrative cues always need synthesis; weak cues only when no resolver covers the question. */
const NARRATIVE_RE = /\b(why|explain|explanation|trade-?offs?|compare|comparison|versus|vs\.?|recommend|recommendation|risks?|what\s+if|summari[sz]e|summary|implications?|justify|pros|cons)\b/i;
const WEAK_NARRATIVE_RE = /\b(should|better|worse|best|ok(?:ay)?|good|bad)\b/i;
const DOMAIN_RE = /\b(plan|option|cost|job|order|unit|lot|heat|cert|certificate|cell|machine|haas|schedule|late|recover|recovery|supplier|material|wsjf|cpm|cpi|evm|flow|utili[sz]ation|incident|priority|split|expedite|reallocate|hold|reissue|kanban|shock|outage|bottleneck|risk)\w*/i;
const ACTION_RE = /\b(approve|authori[sz]e|release|ship|sign\s*off|accept\s+(?:the\s+)?plan|move\s+(?:the\s+)?card|mark\s+.*done)\b/i;

export function normalizeQuestion(q) {
  return String(q || "").toLowerCase().normalize("NFKC").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
}

const planByText = (payload, q) => {
  const n = normalizeQuestion(q);
  const aliases = { hybrid: ["hybrid", "priority recovery", "split"], expedite: ["expedite", "expedited", "replacement lot"], reallocate: ["reallocate", "reallocation", "qualified stock"], reissue: ["reissue", "hold", "verify"] };
  for (const p of payload.plans) {
    if ((aliases[p.id] || [p.id]).some(a => n.includes(a)) || n.includes(p.label.toLowerCase())) return p;
  }
  return null;
};
const cellByText = (payload, q) => {
  const n = normalizeQuestion(q).replace(/\s|-/g, "");
  return (payload.pm?.cells || []).find(c => n.includes(c.machineId.toLowerCase().replace(/-/g, "")) || n.includes(c.machineId.replace("HAAS-", "").toLowerCase()));
};

/** Deterministic resolvers. Each returns {text, evidenceIds} built from engine data, or null. */
export const RESOLVERS = [
  { id: "action-request", test: q => ACTION_RE.test(q), resolve: payload => ({
      text: `[evidence:scenario:${payload.scenarioId}] Answers never take actions: acceptance is a human consent in Decision control (review token, then typed phrase), and this system never releases physical material.`,
      evidenceIds: [`scenario:${payload.scenarioId}`], policy: "NO_ACTION_FROM_QUESTIONS" }) },
  { id: "cheapest-plan", test: q => /\b(cheapest|lowest[-\s]cost|least\s+expensive|lowest\s+estimated)\b/i.test(q), resolve: payload => {
      const p = payload.plans[0];
      return p && { text: `[evidence:plan:${p.id}] The lowest estimated scenario cost option is "${p.label}" at $${p.estimatedCost} with ${p.lateHours} incremental late hours.`, evidenceIds: [`plan:${p.id}`] };
  } },
  { id: "plan-cpi", test: q => /\b(cpi|spi|eac|earned\s+value|evm)\b/i.test(q), resolve: (payload, q) => {
      const p = planByText(payload, q) || payload.plans[0];
      return p?.evm && { text: `[evidence:pm:cpi:${p.id}] [evidence:pm:spi:${p.id}] "${p.label}" has a synthetic CPI of ${p.evm.costPerformanceIndex} and SPI of ${p.evm.schedulePerformanceIndex}.`, evidenceIds: [`pm:cpi:${p.id}`, `pm:spi:${p.id}`] };
  } },
  { id: "plan-schedule", test: q => /\b(critical\s+path|cpm|finish|delta)\b/i.test(q), resolve: (payload, q) => {
      const p = planByText(payload, q) || payload.plans[0];
      return p?.cpm && { text: `[evidence:pm:finishDelta:${p.id}] [evidence:pm:impactedFinishDelta:${p.id}] Under "${p.label}" the shop CPM finish moves ${p.cpm.finishDeltaHours}h and the impacted-job finish moves ${p.cpm.impactedFinishDeltaHours}h versus baseline.`, evidenceIds: [`pm:finishDelta:${p.id}`, `pm:impactedFinishDelta:${p.id}`] };
  } },
  { id: "plan-cost", test: (q, payload) => /\b(cost|price|dollars?|\$|late\s+hours?|late\s+jobs?)\b/i.test(q) && Boolean(planByText(payload, q)), resolve: (payload, q) => {
      const p = planByText(payload, q);
      return p && { text: `[evidence:plan:${p.id}] "${p.label}" is estimated at $${p.estimatedCost} with ${p.lateHours} incremental late hours and ${p.lateJobsShopWide} late jobs shop-wide.`, evidenceIds: [`plan:${p.id}`] };
  } },
  { id: "fix-first", test: q => /\b(wsjf|fix\s+first|priorit(?:y|ise|ize)|most\s+urgent|first)\b/i.test(q), resolve: payload => {
      const rows = (payload.pm?.wsjfRank || []).slice(0, 3);
      return rows.length && { text: `${rows.map(r => `[evidence:pm:wsjf:${r.jobId}]`).join(" ")} Fix first by WSJF: ${rows.map(r => `${r.jobId} (${r.wsjfScore})`).join(", ")}.`, evidenceIds: rows.map(r => `pm:wsjf:${r.jobId}`) };
  } },
  { id: "cell-flow", test: (q, payload) => /\b(utili[sz]ation|throughput|little'?s?\s+law|flow|wip|queue|bottleneck|busiest)\b/i.test(q) || Boolean(cellByText(payload, q)), resolve: (payload, q) => {
      const cells = payload.pm?.cells || [];
      const c = cellByText(payload, q) || [...cells].sort((a, b) => b.utilizationPct - a.utilizationPct)[0];
      return c && { text: `[evidence:cell:${c.machineId}] ${c.machineId} runs ${c.wipJobs} jobs at ${c.utilizationPct}% utilization with ${c.averageTimeInSystemHours} hours average time in system.`, evidenceIds: [`cell:${c.machineId}`] };
  } },
  { id: "impacted-units", test: q => /\bunits?\b/i.test(q) && /\b(held|hold|impact|affect|blocked|how\s+many)\b/i.test(q), resolve: payload => ({
      text: `[evidence:metric:impactedUnits] ${payload.summary.impactedUnits} units are held pending documented reconciliation.`, evidenceIds: ["metric:impactedUnits"] }) },
  { id: "impacted-jobs", test: q => /\b(jobs?|orders?)\b/i.test(q) && /\b(impact|affect|held|hold|blocked|how\s+many|which)\b/i.test(q), resolve: payload => {
      const ids = payload.summary.jobs.map(j => j.id);
      return { text: `[evidence:metric:impactedOrders] ${ids.map(id => `[evidence:job:${id}]`).join(" ")} ${payload.summary.impactedOrders} jobs are held: ${ids.join(", ")}.`, evidenceIds: ["metric:impactedOrders", ...ids.map(id => `job:${id}`)] };
  } },
  { id: "affected-cells", test: q => /\b(cells?|machines?)\b/i.test(q), resolve: payload => ({
      text: `[evidence:metric:affectedCells] ${payload.summary.affectedMachines.length} of ${payload.summary.totalMachines} cells carry held work: ${payload.summary.affectedMachines.join(", ")}.`, evidenceIds: ["metric:affectedCells"] }) },
  { id: "certificate-conflict", test: q => /\b(heat|certificate|cert|mtr|conflict|mismatch|wrong|discrepanc\w*|grade|po)\b/i.test(q), resolve: payload => {
      const bad = payload.summary.findings.filter(f => f.status !== "MATCH");
      if (!bad.length) return { text: `[evidence:scenario:${payload.scenarioId}] All checked certificate fields match the master record.`, evidenceIds: [`scenario:${payload.scenarioId}`] };
      return { text: bad.map(f => `[evidence:field:${f.field}] The certificate ${f.field} reads ${f.observed ?? "nothing"} where the master record expects ${f.expected}.`).join(" "), evidenceIds: bad.map(f => `field:${f.field}`) };
  } },
  { id: "exposure", test: q => /\b(exposure|value\s+at\s+risk|order\s+value)\b/i.test(q), resolve: payload => ({
      text: `[evidence:metric:exposure] Illustrative order exposure is $${payload.summary.indicativeOrderValue} (not a realized loss).`, evidenceIds: ["metric:exposure"] }) }
];

/** Rung 1. Returns {answered, resolver, text, evidenceIds, tried} or {answered:false, tried, reason}. */
export function resolveDeterministic(question, payload) {
  const q = String(question || "");
  const tried = [];
  if (ACTION_RE.test(q)) {
    const r = RESOLVERS[0].resolve(payload, q);
    return { answered: true, resolver: "action-request", tried: ["action-request"], ...r };
  }
  if (NARRATIVE_RE.test(q)) {
    return { answered: false, tried, reason: "NEEDS_NARRATIVE_SYNTHESIS", why: "The question asks for an explanation or trade-off; the engine returns numbers, not reasoning across them." };
  }
  for (const r of RESOLVERS.slice(1)) {
    tried.push(r.id);
    if (!r.test(q, payload)) continue;
    const out = r.resolve(payload, q);
    if (out) return { answered: true, resolver: r.id, tried, ...out };
  }
  if (WEAK_NARRATIVE_RE.test(q)) {
    return { answered: false, tried, reason: "NEEDS_NARRATIVE_SYNTHESIS", why: `The question asks for a judgement and no deterministic resolver covers it (tried ${tried.length}).` };
  }
  return { answered: false, tried, reason: "NO_RESOLVER_MATCH", why: `No deterministic resolver covers this question (tried ${tried.length}: ${tried.join(", ")}).` };
}

/** Topics steer which read-only tools the Sample-mode planner calls for a narrative question. */
export function questionTopics(question) {
  const q = String(question || "");
  const topics = new Set(["incident"]);
  if (/\b(cost|cheap|plan|option|compare|versus|vs|better|worse|recommend|should|trade|split|expedite|reallocate|hold|reissue)\b/i.test(q)) topics.add("plans");
  if (/\b(priorit|first|urgent|wsjf|order)\b/i.test(q)) topics.add("priority");
  if (/\b(cell|machine|flow|utili|bottleneck|queue|capacity|little)\b/i.test(q)) topics.add("flow");
  if (topics.size === 1) { topics.add("plans"); topics.add("priority"); }
  return [...topics];
}

/** Which plans a question is about: named plans first, then the cheapest and fastest of the rest. */
const PLAN_CUES = [
  ["reissue", /\b(hold(ing)?|verify|verification|wait(ing)?|reissue)\b/i],
  ["expedite", /\b(expedit\w*|replacement lot|new lot)\b/i],
  ["reallocate", /\b(realloc\w*|reassign\w*)\b/i],
  ["hybrid", /\b(split|hybrid|priority recovery)\b/i]
];
export function pickPlansForQuestion(plans, question) {
  const q = String(question || "");
  const byId = new Map(plans.map(p => [p.id, p]));
  const named = PLAN_CUES.filter(([id, re]) => byId.has(id) && re.test(q)).map(([id]) => byId.get(id));
  for (const p of plans) if (q.toLowerCase().includes(String(p.label).toLowerCase()) && !named.includes(p)) named.push(p);
  if (named.length >= 2) return named.slice(0, 2);
  const rest = plans.filter(p => !named.includes(p));
  const cheapest = [...rest].sort((x, y) => x.estimatedCost - y.estimatedCost)[0];
  if (named.length === 1) return [named[0], cheapest].filter(Boolean);
  const fastest = [...rest].filter(p => p !== cheapest).sort((x, y) => x.incrementalLateHours - y.incrementalLateHours)[0];
  return [cheapest, fastest].filter(Boolean);
}

/** Sample-mode Muse planner for a question: REAL tool executions, template wording, citations. */
export function sampleAnswerPlanner(payload, question) {
  const trace = [];
  const call = (name, args = {}, why) => {
    const result = executeBriefTool(payload, name, args);
    trace.push({ step: trace.length + 1, tool: name, args, why, evidenceIds: result.evidenceIds, ok: !result.error });
    return result.data;
  };
  const topics = questionTopics(question);
  const sentences = [];
  if (!DOMAIN_RE.test(String(question || ""))) {
    sentences.push(`[evidence:scenario:${payload.scenarioId}] That question is outside the scenario data the engine tools expose, so here is what they do show.`);
  }
  const incident = call("get_incident_summary", {}, "Ground the answer in the active incident.");
  const heat = incident.findings.find(f => f.status !== "MATCH");
  if (heat) sentences.push(`[evidence:field:${heat.field}] [evidence:metric:impactedOrders] The ${heat.field} conflict (${heat.observed} versus ${heat.expected}) holds ${incident.impactedJobs} jobs.`);
  if (topics.includes("plans")) {
    const plans = call("list_recovery_plans", {}, "Compare the options the question is about.");
    const [a, b] = pickPlansForQuestion(plans || [], question);
    if (a && b) {
      const ma = call("get_plan_metrics", { planId: a.id }, `Schedule effect of ${a.label}.`);
      const mb = call("get_plan_metrics", { planId: b.id }, `Schedule effect of ${b.label}.`);
      sentences.push(`[evidence:plan:${a.id}] [evidence:plan:${b.id}] "${a.label}" is estimated at $${a.estimatedCost} with ${a.incrementalLateHours} incremental late hours, versus $${b.estimatedCost} and ${b.incrementalLateHours} hours for "${b.label}".`);
      if (ma?.cpm && mb?.cpm) {
        const da = ma.cpm.impactedFinishDeltaHours, db = mb.cpm.impactedFinishDeltaHours;
        const aCheaper = a.estimatedCost <= b.estimatedCost;
        const [cheap, dear] = aCheaper ? [a, b] : [b, a];
        const [dCheap, dDear] = aCheaper ? [da, db] : [db, da];
        const verdict = dCheap === dDear
          ? `both finish the same, so cost decides in favour of "${cheap.label}"`
          : dCheap < dDear
            ? `"${cheap.label}" is both cheaper and faster`
            : `the trade-off is $${dear.estimatedCost - cheap.estimatedCost} more for "${dear.label}" against ${Math.round((dCheap - dDear) * 100) / 100}h faster recovery`;
        sentences.push(`[evidence:pm:impactedFinishDelta:${a.id}] [evidence:pm:impactedFinishDelta:${b.id}] Impacted jobs finish ${da}h later than baseline under "${a.label}" and ${db}h under "${b.label}", so ${verdict}.`);
      }
      for (const p of [a, b]) sentences.push(`[evidence:plan:${p.id}] "${p.label}" uses ${p.qualifiedUnits} qualified units and leaves ${p.conditionalJobs} jobs conditional on documents.`);
    }
  }
  if (topics.includes("priority")) {
    const rows = call("get_wsjf_priorities", { limit: 3 }, "Order the work by cost of delay.");
    if (rows?.length) sentences.push(`${rows.map(r => `[evidence:pm:wsjf:${r.jobId}]`).join(" ")} By WSJF the fix-first order is ${rows.map(r => r.jobId).join(", ")}.`);
  }
  if (topics.includes("flow")) {
    const cells = call("get_cell_flow", {}, "Find the most loaded cell.");
    const c = [...(cells || [])].sort((x, y) => y.utilizationPct - x.utilizationPct)[0];
    if (c) sentences.push(`[evidence:cell:${c.machineId}] The most loaded cell is ${c.machineId} at ${c.utilizationPct}% utilization, so recovery work there queues first.`);
  }
  sentences.push(`[evidence:scenario:${payload.scenarioId}] This is an explanation over engine outputs; the operator still decides in Decision control (review token, then typed confirmation).`);
  return { text: sentences.join(" "), trace, topics };
}

/** Rung 2 cache: verified Muse answers keyed by scenario hash + normalized question. */
export class AnswerCache {
  constructor(max = 200) { this.max = max; this.rows = new Map(); this.hits = 0; this.misses = 0; }
  key(scenarioHash, question) { return sha256Hex(`${scenarioHash}|${normalizeQuestion(question)}`); }
  get(scenarioHash, question) {
    const k = this.key(scenarioHash, question);
    const row = this.rows.get(k);
    if (row) { this.hits++; this.rows.delete(k); this.rows.set(k, row); } else this.misses++;
    return row || null;
  }
  put(scenarioHash, question, value) {
    const k = this.key(scenarioHash, question);
    this.rows.set(k, { ...value, cachedAt: new Date().toISOString(), cacheKey: k.slice(0, 16) });
    while (this.rows.size > this.max) this.rows.delete(this.rows.keys().next().value);
  }
  get size() { return this.rows.size; }
}
