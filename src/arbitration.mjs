/**
 * Conflict arbitration — a dependency-free JS port of the weighted-claim resolver from
 * Justin Evans' Britt Enterprise package (`the_britt/arbitration.py`, ConflictResolver).
 *
 *   score(claim) = Σ weight_f · clip(claim.f) / Σ weight_f
 *   - all claims share one canonical value          → MERGED
 *   - top ≥ minimumWinnerScore and margin ≥ resolveMargin → RESOLVED (winner keeps evidence)
 *   - otherwise, with an escalation authority         → ESCALATED (human decides)
 *   - otherwise                                        → UNRESOLVED_CONFLICT (no invented certainty)
 *
 * Applied here to two real conflict sources, all factor values computed from engine state:
 *   1. Shock contention: two disruptions (material hold, cell outage, substitute-lot hold)
 *      want the same Haas cell's next slot for different jobs.
 *   2. AI vs engine: a model sentence asserts a value the engine evidence disagrees with.
 */
import { sha256Hex } from "./sha256.mjs";
import { scheduleJobs } from "./engine.mjs";
import { extractNumbers } from "./claim-checker.mjs";

export const DEFAULT_POLICY = Object.freeze({
  weights: Object.freeze({
    confidence: 0.12, source_authority: 0.18, evidence_quality: 0.18, recency: 0.10,
    specialization: 0.12, verifier_score: 0.12, reliability: 0.10, known_state_consistency: 0.08
  }),
  resolveMargin: 0.08,
  minimumWinnerScore: 0.55
});

const FACTORS = Object.keys(DEFAULT_POLICY.weights);
const clip = v => Math.max(0, Math.min(1, Number(v) || 0));
const canonical = value => JSON.stringify(value, (_, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
const r3 = n => Math.round(n * 1000) / 1000;

export function makeClaim({ id, agentId, value, evidence = [], metadata = {}, ...factors }) {
  const claim = { id, agentId, value, evidence, metadata };
  for (const f of FACTORS) claim[f] = clip(factors[f] ?? 0.5);
  return claim;
}

export function scoreClaim(claim, policy = DEFAULT_POLICY) {
  let score = 0, total = 0;
  for (const [f, w] of Object.entries(policy.weights)) { score += clip(claim[f]) * w; total += w; }
  return total <= 0 ? 0 : score / total;
}

export function resolveClaims(claims, { policy = DEFAULT_POLICY, escalate = null, subject = "" } = {}) {
  if (!claims?.length) throw new Error("ARBITRATION_NEEDS_CLAIMS");
  const scores = Object.fromEntries(claims.map(c => [c.id, r3(scoreClaim(c, policy))]));
  const factorBreakdown = Object.fromEntries(claims.map(c => [c.id, Object.fromEntries(FACTORS.map(f => [f, r3(c[f])]))]));
  const groups = new Map();
  for (const c of claims) {
    const k = canonical(c.value);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const id = `arb_${sha256Hex(subject + canonical(claims.map(c => [c.id, c.value, scores[c.id]]))).slice(0, 12)}`;
  const base = { id, subject, scores, factors: factorBreakdown, weights: policy.weights, candidates: claims.map(({ id, agentId, value, evidence, metadata }) => ({ id, agentId, value, evidence, metadata })) };
  if (groups.size === 1) {
    const strongest = [...claims].sort((a, b) => scores[b.id] - scores[a.id])[0];
    return { ...base, status: "MERGED", value: strongest.value, winnerClaimId: strongest.id, supportingClaimIds: claims.map(c => c.id), margin: 0,
      rationale: `${claims.length} claims agree on the same canonical value; merged with the strongest evidence trace retained.` };
  }
  const ranked = [...claims].sort((a, b) => scores[b.id] - scores[a.id] || a.id.localeCompare(b.id));
  const [top, second] = ranked;
  const margin = r3(scores[top.id] - scores[second.id]);
  if (scores[top.id] >= policy.minimumWinnerScore && margin >= policy.resolveMargin) {
    return { ...base, status: "RESOLVED", value: top.value, winnerClaimId: top.id, supportingClaimIds: [top.id], margin,
      rationale: `Claim ${top.id} resolved the conflict with score ${scores[top.id].toFixed(3)}; margin over ${second.id} is ${margin.toFixed(3)}.` };
  }
  const why = `Top score ${scores[top.id].toFixed(3)} and margin ${margin.toFixed(3)} do not satisfy minimum ${policy.minimumWinnerScore.toFixed(3)} and margin ${policy.resolveMargin.toFixed(3)}.`;
  const authority = escalate ? escalate(claims, scores) : null;
  if (authority) {
    return { ...base, status: "ESCALATED", value: authority.value ?? null, winnerClaimId: null, supportingClaimIds: [], margin, authority: authority.authority,
      rationale: `${why} Conflict escalated to ${authority.authority}.` };
  }
  return { ...base, status: "UNRESOLVED_CONFLICT", value: null, winnerClaimId: null, supportingClaimIds: [], margin, rationale: why };
}

/* ------------------------------------------------------------------ */
/* 1. Shock contention on a Haas cell                                   */
/* ------------------------------------------------------------------ */

const PRIORITY_WEIGHT = { critical: 1, high: 0.7, normal: 0.4 };

/** Total lateness on one cell if `firstId` takes the contested slot before `secondId`. */
function sequenceLateness(slotStart, first, second, setup) {
  const aEnd = Math.max(slotStart, first.readyAt) + first.hours;
  const bEnd = Math.max(aEnd + setup, second.readyAt) + second.hours;
  return Math.max(0, aEnd - first.dueHour) + Math.max(0, bEnd - second.dueHour);
}

/**
 * Find cells where more than one active shock is competing for capacity and arbitrate the
 * next slot. Shocks (all from real state):
 *   - material:   certificate conflict → impacted jobs released at the plan's releaseHour
 *   - outage:     disruptions.machineOutageHours on the outage cell → its whole queue displaced
 *   - substitute: disruptions.substituteLotQuestioned → jobs counting on LOT-TI-ALT lose it
 */
export function arbitrateCellContention(ctx, { planId = null, policy = DEFAULT_POLICY } = {}) {
  const { factory, impact, plans } = ctx;
  const plan = plans.find(p => p.id === planId) || plans[0];
  if (!plan) return { planId: null, contestedCells: 0, decisions: [], shocks: [] };
  const outageHours = Number(plan.assumptions?.machineOutageHours ?? factory.disruptions?.machineOutageHours ?? 0) || 0;
  const outageCell = factory.outageMachineId || "HAAS-EC400";
  const substituteHeld = Boolean(factory.disruptions?.substituteLotQuestioned);
  const jobs = new Map(factory.jobs.map(j => [j.id, j]));
  const alloc = new Map(plan.allocations.map(a => [a.jobId, a]));
  const baseline = new Map(scheduleJobs(factory).map(s => [s.id, s]));
  const shocks = [
    impact.blocked ? { id: "material", label: `Certificate conflict on ${factory.incomingLotId}`, jobs: impact.jobIds.length } : null,
    outageHours > 0 ? { id: "outage", label: `${outageCell} outage ${outageHours}h`, jobs: factory.jobs.filter(j => j.machineId === outageCell).length } : null,
    substituteHeld ? { id: "substitute", label: "Substitute lot LOT-TI-ALT on hold", jobs: impact.jobIds.length } : null
  ].filter(Boolean);

  const decisions = [];
  for (const machine of factory.machines) {
    const cellJobs = factory.jobs.filter(j => j.machineId === machine.id);
    const demands = [];
    // Material shock demand: the earliest-due impacted job on this cell, ready when its material is.
    const impacted = cellJobs.filter(j => impact.jobIds.includes(j.id)).sort((a, b) => a.dueHour - b.dueHour || a.id.localeCompare(b.id));
    if (impacted.length && impact.blocked) {
      const j = impacted[0];
      const a = alloc.get(j.id);
      const readyAt = a?.releaseHour ?? 0;
      const material = a?.material || "unknown";
      const reliesOnSubstitute = material === (factory.substituteLotId || "LOT-TI-ALT");
      demands.push({ shock: substituteHeld && reliesOnSubstitute ? "substitute" : "material", job: j, readyAt, material,
        evidenceQuality: a?.conditional ? (String(material).includes("proposed") ? 0.45 : 0.15) : 0.95,
        stateConsistency: substituteHeld && reliesOnSubstitute ? 0.2 : a?.conditional ? 0.6 : 1 });
    }
    // Outage demand: the earliest-due NON-impacted job displaced by the outage on this cell.
    if (machine.id === outageCell && outageHours > 0) {
      const displaced = cellJobs.filter(j => !impact.jobIds.includes(j.id) && (baseline.get(j.id)?.start ?? 0) < outageHours)
        .sort((a, b) => a.dueHour - b.dueHour || a.id.localeCompare(b.id));
      if (displaced.length) demands.push({ shock: "outage", job: displaced[0], readyAt: 0, material: displaced[0].lotId || "in-stock", evidenceQuality: 0.95, stateConsistency: 1 });
    }
    if (demands.length < 2) continue;
    const slotStart = machine.id === outageCell ? outageHours : 0;
    const setup = machine.setupHours || 0;
    const horizon = Math.max(...cellJobs.map(j => j.dueHour), 1);
    const claims = demands.map((d, i) => {
      const other = demands[(i + 1) % demands.length];
      const lateIfFirst = sequenceLateness(slotStart, { ...d.job, readyAt: d.readyAt }, { ...other.job, readyAt: other.readyAt }, setup);
      const lateIfSecond = sequenceLateness(slotStart, { ...other.job, readyAt: other.readyAt }, { ...d.job, readyAt: d.readyAt }, setup);
      const worst = Math.max(lateIfFirst, lateIfSecond, 1);
      const slack = Math.max(0, d.job.dueHour - (slotStart + d.job.hours));
      return makeClaim({
        id: `${d.shock}:${d.job.id}`,
        agentId: `engine/${d.shock}-recovery`,
        value: { cell: machine.id, nextJob: d.job.id },
        evidence: [`job:${d.job.id}`, `cell:${machine.id}`],
        metadata: { shock: d.shock, priority: d.job.priority, dueHour: d.job.dueHour, readyAt: d.readyAt, material: d.material, lateHoursIfFirst: r3(lateIfFirst), lateHoursIfSecond: r3(lateIfSecond) },
        confidence: d.readyAt <= slotStart ? 1 : clip(1 - (d.readyAt - slotStart) / horizon),
        source_authority: 0.9, // both claims come from the deterministic engine
        evidence_quality: d.evidenceQuality,
        recency: 1,
        specialization: PRIORITY_WEIGHT[d.job.priority] ?? 0.4,
        verifier_score: clip(1 - lateIfFirst / worst * 0.9),
        reliability: clip(1 - slack / horizon),
        known_state_consistency: d.stateConsistency
      });
    });
    const bothCritical = demands.filter(d => d.job.priority === "critical").length >= 2;
    const decision = resolveClaims(claims, {
      policy, subject: `cell:${machine.id}|plan:${plan.id}`,
      escalate: bothCritical ? () => ({ authority: "human operator (two critical jobs contest the slot)", value: null }) : null
    });
    decisions.push({ kind: "shock-contention", cell: machine.id, cellLabel: machine.label, planId: plan.id, slotStartHour: slotStart, shocksInvolved: [...new Set(demands.map(d => d.shock))], ...decision });
  }
  return { planId: plan.id, contestedCells: decisions.length, decisions, shocks };
}

/* ------------------------------------------------------------------ */
/* 2. AI claim vs engine evidence                                       */
/* ------------------------------------------------------------------ */

const stripTags = s => String(s).replace(/\[evidence:[^\]]+\]/g, " ");
const AI_NUMBER_REASONS = new Set(["NUMBER_NOT_IN_EVIDENCE", "ENTITY_NOT_IN_EVIDENCE", "UNSUPPORTED_ASSERTION", "UNKNOWN_EVIDENCE_ID", "UNCITED"]);

/**
 * For every brief sentence, arbitrate the model's claim against the engine's evidence for the
 * same citation. Agreeing sentences MERGE; sentences the claim checker blocked RESOLVE to the
 * engine value (or to "not in evidence"), with the full weighted breakdown.
 */
export function arbitrateAiVsEngine({ allowed = [], blocked = [], registry, modelLabel = "muse-spark" }) {
  const decisions = [];
  const engineClaim = (sid, ids, value) => makeClaim({
    id: `engine:${sid}`, agentId: "engine/deterministic", value, evidence: ids,
    confidence: 1, source_authority: 1, evidence_quality: ids.length ? 1 : 0.6, recency: 1, specialization: 1, verifier_score: 1, reliability: 1, known_state_consistency: 1
  });
  const aiClaim = (sid, ids, value, { verified, inRegistry }) => makeClaim({
    id: `ai:${sid}`, agentId: `model/${modelLabel}`, value, evidence: ids,
    confidence: 0.7, source_authority: 0.5, evidence_quality: inRegistry ? 0.8 : 0.1, recency: 1, specialization: 0.5,
    verifier_score: verified ? 1 : 0, reliability: 0.6, known_state_consistency: verified ? 1 : 0
  });
  const evidenceValues = ids => [...new Set(ids.flatMap(id => registry.get(id)?.values || []))].sort((a, b) => a - b);
  allowed.forEach((s, i) => {
    const ids = s.evidenceIds || [];
    const nums = [...new Set(extractNumbers(stripTags(s.sentence)).map(n => n.value))].sort((a, b) => a - b);
    const value = { evidence: ids, numbers: nums };
    const d = resolveClaims([aiClaim(`s${i}`, ids, value, { verified: true, inRegistry: true }), engineClaim(`s${i}`, ids, value)], { subject: `sentence:${s.sentence}` });
    decisions.push({ kind: "ai-vs-engine", sentence: s.sentence.slice(0, 200), checkReason: null, ...d });
  });
  blocked.filter(b => AI_NUMBER_REASONS.has(b.reason)).forEach((b, i) => {
    const ids = b.evidenceIds || [];
    const inRegistry = ids.length > 0 && ids.every(id => registry.has(id));
    const aiNums = [...new Set(extractNumbers(stripTags(b.sentence)).map(n => n.value))].sort((x, y) => x - y);
    const aiValue = { evidence: ids, numbers: aiNums, assertion: b.reason === "UNSUPPORTED_ASSERTION" ? "asserted" : undefined };
    const engineValue = inRegistry
      ? { evidence: ids, numbers: evidenceValues(ids).slice(0, 12), assertion: b.reason === "UNSUPPORTED_ASSERTION" ? "not-in-evidence" : undefined }
      : { evidence: ids, numbers: [], status: "NO_ENGINE_FACT" };
    const d = resolveClaims([aiClaim(`b${i}`, ids, aiValue, { verified: false, inRegistry }), engineClaim(`b${i}`, ids, engineValue)], { subject: `blocked:${b.sentence}` });
    decisions.push({ kind: "ai-vs-engine", sentence: b.sentence.slice(0, 200), checkReason: b.reason, ...d });
  });
  const tally = decisions.reduce((t, d) => ({ ...t, [d.status]: (t[d.status] || 0) + 1 }), {});
  return { decisions, tally };
}
