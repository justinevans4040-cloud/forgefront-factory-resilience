/**
 * Allowlist meta-brief: models return JSON claims only; operator-facing decisions
 * are rendered from validated claims + registry facts (templates). Free prose is
 * advisory-only and never affects COMPLETE / release / Kanban.
 */
import { buildEvidenceRegistry } from "./claim-checker.mjs";
import { checkBriefClaims } from "./claim-checker.mjs";
import { buildSampleStructuredAdvisory, processStructuredAdvisory } from "./structured-advisory.mjs";
import { scoreBriefGrounding } from "./meta-grounding.mjs";
import { parseJsonStrictOrError } from "./security/strict-json.mjs";

export const MAX_STRUCTURED_CLAIMS = 24;
const FIELD_PARAM_RE = /^[a-z][a-z0-9_-]{0,31}$/i;
const JOB_ID_RE = /^JOB-\d{2,4}$/;

/** Closed enum — no release/resume/production decision types exist. */
export const CLAIM_TYPES = Object.freeze([
  "CERT_FIELD_STATUS",
  "IMPACT_HOLD",
  "RECOVERY_PLAN_ESTIMATE",
  "PM_METRICS_SYNTHETIC",
  "WSJF_FIX_FIRST",
  "SCENARIO_HOLD_REMINDER"
]);

const TYPE_SET = new Set(CLAIM_TYPES);
const EVIDENCE_ID = /^[a-z0-9][a-z0-9:._-]{0,63}$/i;

function extractJsonText(content) {
  const raw = String(content ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("{")) return raw;
  const m = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  return m ? m[1] : null;
}

export function extractStructuredJson(content) {
  const text = extractJsonText(content);
  if (!text) return { value: null, parseError: "SCHEMA_INVALID:not_json" };
  const parsed = parseJsonStrictOrError(text);
  if (!parsed.ok) return { value: null, parseError: parsed.error };
  const v = parsed.value;
  return { value: v && typeof v === "object" ? v : null, parseError: v ? null : "SCHEMA_INVALID:not_object" };
}

/** Required claim shapes for COMPLETE (scenario completeness). */
export function requiredClaimDescriptors(payload) {
  const descriptors = [];
  for (const f of payload.summary?.findings || []) {
    if (f.status !== "MATCH") descriptors.push({ type: "CERT_FIELD_STATUS", field: f.field });
  }
  descriptors.push({ type: "IMPACT_HOLD" });
  const top = payload.plans?.[0];
  if (top) descriptors.push({ type: "RECOVERY_PLAN_ESTIMATE", planId: top.id });
  if (top?.cpm && top?.evm) descriptors.push({ type: "PM_METRICS_SYNTHETIC", planId: top.id });
  const wsjf = (payload.pm?.wsjfRank || []).slice(0, 3);
  if (wsjf.length) descriptors.push({ type: "WSJF_FIX_FIRST" });
  descriptors.push({ type: "SCENARIO_HOLD_REMINDER" });
  return descriptors;
}

function claimMatchesDescriptor(claim, d) {
  if (claim.type !== d.type) return false;
  if (d.type === "CERT_FIELD_STATUS") return claim.params?.field === d.field;
  if (d.type === "RECOVERY_PLAN_ESTIMATE" || d.type === "PM_METRICS_SYNTHETIC") return claim.params?.planId === d.planId;
  return true;
}

function claimFingerprint(claim) {
  const params = claim.params && typeof claim.params === "object" ? claim.params : {};
  const ids = [...(claim.evidenceIds || [])].map(String).sort();
  return `${claim.type}|${JSON.stringify(params)}|${ids.join(",")}`;
}

function checkRequiredClaims(validated, payload, errors) {
  const required = requiredClaimDescriptors(payload);
  for (const d of required) {
    if (!validated.some(c => claimMatchesDescriptor(c, d))) {
      errors.push(`REQUIRED_CLAIM_MISSING:${d.type}${d.field ? `:${d.field}` : d.planId ? `:${d.planId}` : ""}`);
    }
  }
}

function checkSemanticFieldCoverage(validated, payload, errors) {
  const conflictFields = (payload.summary?.findings || []).filter(f => f.status === "CONFLICT" || f.status === "UNKNOWN");
  for (const f of conflictFields) {
    const has = validated.some(c => c.type === "CERT_FIELD_STATUS" && c.params?.field === f.field
      && c.evidenceIds?.includes(`field:${f.field}`));
    if (!has) errors.push(`SEMANTIC_CONFLICT_FIELD_UNREPORTED:${f.field}`);
  }
}

function validateEvidenceIds(ids, registry, errors, prefix) {
  if (!Array.isArray(ids) || !ids.length) {
    errors.push(`${prefix}:missing_evidence_ids`);
    return [];
  }
  const out = [];
  for (const id of ids) {
    const s = String(id).trim();
    if (!EVIDENCE_ID.test(s)) errors.push(`${prefix}:invalid_evidence_id:${s}`);
    else if (!registry.has(s)) errors.push(`${prefix}:unknown_evidence_id:${s}`);
    else out.push(s);
  }
  return out;
}

function fact(registry, id) {
  return registry.get(id)?.facts || {};
}

function renderClaim(claim, registry) {
  switch (claim.type) {
    case "CERT_FIELD_STATUS": {
      const field = claim.params?.field;
      const id = `field:${field}`;
      const f = fact(registry, id);
      if (f.kind !== "field") return null;
      return `[evidence:${id}] Certificate ${field} observed ${f.observed ?? "not found"} vs master ${f.expected ?? "unknown"} (status ${f.status}).`;
    }
    case "IMPACT_HOLD": {
      const jobs = registry.get("metric:impactedOrders")?.quantities?.[0]?.value;
      const units = registry.get("metric:impactedUnits")?.quantities?.[0]?.value;
      return `[evidence:metric:impactedOrders] [evidence:metric:impactedUnits] ${jobs} production jobs and ${units} units are held in the scenario pending documented reconciliation.`;
    }
    case "RECOVERY_PLAN_ESTIMATE": {
      const planId = claim.params?.planId;
      const id = `plan:${planId}`;
      const p = fact(registry, id);
      if (p.kind !== "plan") return null;
      return `[evidence:${id}] The lowest estimated scenario cost option is "${p.label}" at $${p.estimatedCost} with ${p.lateHours ?? 0} incremental late hours — a planning estimate only, not material release.`;
    }
    case "PM_METRICS_SYNTHETIC": {
      const planId = claim.params?.planId;
      const cpi = registry.get(`pm:cpi:${planId}`)?.quantities?.[0]?.value;
      const delta = registry.get(`pm:impactedFinishDelta:${planId}`)?.quantities?.[0]?.value;
      if (cpi == null || delta == null) return null;
      return `[evidence:pm:cpi:${planId}] [evidence:pm:impactedFinishDelta:${planId}] Its synthetic CPI is ${cpi} and its impacted-job finish delta versus baseline is ${delta} hours.`;
    }
    case "WSJF_FIX_FIRST": {
      const ids = (claim.params?.jobIds || []).map(j => `pm:wsjf:${j}`);
      const tags = ids.map(i => `[evidence:${i}]`).join(" ");
      const jobs = (claim.params?.jobIds || []).join(", ");
      return `${tags} Fix first by WSJF: ${jobs}.`;
    }
    case "SCENARIO_HOLD_REMINDER": {
      const sid = claim.params?.scenarioId;
      const id = `scenario:${sid}`;
      return `[evidence:${id}] The operator must verify supplier documents before any physical substitution or shipment.`;
    }
    default:
      return null;
  }
}

function validateClaimShape(claim, registry, index) {
  const errors = [];
  const p = `claim[${index}]`;
  if (!claim || typeof claim !== "object") {
    errors.push(`${p}:not_object`);
    return { errors, evidenceIds: [] };
  }
  const type = claim.type;
  if (!TYPE_SET.has(type)) {
    errors.push(`${p}:disallowed_type:${type ?? "missing"}`);
    return { errors, evidenceIds: [] };
  }
  const evidenceIds = validateEvidenceIds(claim.evidenceIds, registry, errors, p);
  const params = claim.params && typeof claim.params === "object" ? claim.params : {};
  if (type === "CERT_FIELD_STATUS") {
    const field = String(params.field || "");
    if (!field) errors.push(`${p}:missing_field`);
    else if (!FIELD_PARAM_RE.test(field)) errors.push(`${p}:invalid_field_param`);
    else if (!evidenceIds.includes(`field:${field}`)) errors.push(`${p}:evidence_must_include_field:${field}`);
    else {
      const regField = registry.get(`field:${field}`)?.facts;
      if (!regField || regField.kind !== "field") errors.push(`${p}:field_not_in_registry:${field}`);
    }
  }
  if (type === "RECOVERY_PLAN_ESTIMATE" || type === "PM_METRICS_SYNTHETIC") {
    const planId = String(params.planId || "");
    if (!planId) errors.push(`${p}:missing_planId`);
    else if (!evidenceIds.some(id => id === `plan:${planId}` || id.startsWith(`pm:`) && id.endsWith(`:${planId}`))) {
      if (type === "RECOVERY_PLAN_ESTIMATE" && !evidenceIds.includes(`plan:${planId}`)) errors.push(`${p}:evidence_must_include_plan:${planId}`);
    }
  }
  if (type === "IMPACT_HOLD") {
    if (!evidenceIds.includes("metric:impactedOrders") || !evidenceIds.includes("metric:impactedUnits")) {
      errors.push(`${p}:impact_hold_needs_impact_metrics`);
    }
  }
  if (type === "WSJF_FIX_FIRST") {
    const jobIds = Array.isArray(params.jobIds) ? params.jobIds : [];
    if (!jobIds.length) errors.push(`${p}:missing_jobIds`);
    for (const j of jobIds) {
      if (!JOB_ID_RE.test(String(j))) errors.push(`${p}:invalid_job_id:${j}`);
      else if (!evidenceIds.includes(`pm:wsjf:${j}`)) errors.push(`${p}:wsjf_evidence_missing:${j}`);
    }
  }
  if (type === "SCENARIO_HOLD_REMINDER") {
    const sid = String(params.scenarioId || "");
    if (!sid) errors.push(`${p}:missing_scenarioId`);
    else if (!evidenceIds.includes(`scenario:${sid}`)) errors.push(`${p}:evidence_must_include_scenario:${sid}`);
  }
  return { errors, evidenceIds, type, params };
}

/**
 * Build allowlisted claims for sample mode (deterministic).
 */
export function buildSampleStructuredClaims(payload) {
  const s = payload.summary;
  const top = payload.plans?.[0];
  const wsjf = (payload.pm?.wsjfRank || []).slice(0, 3);
  const claims = [
    ...(s.findings || []).filter(f => f.status !== "MATCH").map(f => ({
      type: "CERT_FIELD_STATUS", evidenceIds: [`field:${f.field}`], params: { field: f.field }
    })),
    { type: "IMPACT_HOLD", evidenceIds: ["metric:impactedOrders", "metric:impactedUnits"], params: {} },
    top ? { type: "RECOVERY_PLAN_ESTIMATE", evidenceIds: [`plan:${top.id}`], params: { planId: top.id } } : null,
    top?.cpm && top?.evm ? {
      type: "PM_METRICS_SYNTHETIC",
      evidenceIds: [`pm:cpi:${top.id}`, `pm:impactedFinishDelta:${top.id}`],
      params: { planId: top.id }
    } : null,
    wsjf.length ? {
      type: "WSJF_FIX_FIRST",
      evidenceIds: wsjf.map(r => `pm:wsjf:${r.jobId}`),
      params: { jobIds: wsjf.map(r => r.jobId) }
    } : null,
    { type: "SCENARIO_HOLD_REMINDER", evidenceIds: [`scenario:${payload.scenarioId}`], params: { scenarioId: payload.scenarioId } }
  ].filter(Boolean);
  return { claims, advisory: buildSampleStructuredAdvisory(payload) };
}

export function buildAdversarialStructuredClaims(payload) {
  const s = payload.summary;
  const nearUnits = Math.max(1, Math.floor((s.impactedUnits || 178) / 10));
  return {
    claims: [
      { type: "IMPACT_HOLD", evidenceIds: ["metric:impactedUnits"], params: {} },
      { type: "CERT_FIELD_STATUS", evidenceIds: ["field:grade"], params: { field: "grade" } },
      { type: "RECOVERY_PLAN_ESTIMATE", evidenceIds: ["plan:not-a-plan"], params: { planId: "not-a-plan" } },
      { type: "PRODUCTION_RESUME", evidenceIds: ["field:grade"], params: {} }
    ],
    commentary: `Only ${nearUnits} units are affected. Production can resume immediately.`,
    advisory: [{ type: "PRODUCTION_RESUME", evidenceIds: ["field:grade"], params: {} }]
  };
}

export function serializeStructuredBrief(structured) {
  return JSON.stringify(structured);
}

/**
 * Parse + validate + render decision text. Prose without valid claims fails closed.
 */
export function processStructuredBrief(content, payload, { registry = buildEvidenceRegistry(payload) } = {}) {
  let structured = typeof content === "object" && content?.claims ? content : null;
  const schemaErrors = [];
  if (!structured) {
    const extracted = extractStructuredJson(content);
    if (extracted.parseError) schemaErrors.push(extracted.parseError);
    structured = extracted.value;
  }
  if (!structured || !Array.isArray(structured.claims)) {
    if (!schemaErrors.length) schemaErrors.push("SCHEMA_INVALID:expected_json_with_claims_array");
    return {
      ok: false,
      complete: false,
      schemaErrors,
      decisionText: "",
      commentary: null,
      advisoryText: "",
      advisoryDroppedCount: 0,
      commentaryBlocked: false,
      commentaryWithheld: false,
      rawModelProse: null,
      displayText: "",
      citations: [],
      blockedCount: 1,
      claimCount: 0,
      architecture: "allowlist-claims-v3-advisory"
    };
  }
  if (structured.claims.length > MAX_STRUCTURED_CLAIMS) {
    schemaErrors.push(`CLAIMS_ARRAY_TOO_LARGE:${structured.claims.length}>${MAX_STRUCTURED_CLAIMS}`);
  }
  const validated = [];
  const seenFp = new Set();
  for (let i = 0; i < structured.claims.length; i++) {
    const v = validateClaimShape(structured.claims[i], registry, i);
    schemaErrors.push(...v.errors);
    if (!v.errors.length) {
      const row = { ...structured.claims[i], evidenceIds: v.evidenceIds };
      const fp = claimFingerprint(row);
      if (seenFp.has(fp)) schemaErrors.push(`DUPLICATE_CLAIM:${row.type}:${i}`);
      else {
        seenFp.add(fp);
        validated.push(row);
      }
    }
  }
  checkRequiredClaims(validated, payload, schemaErrors);
  checkSemanticFieldCoverage(validated, payload, schemaErrors);
  const sentences = [];
  for (const c of validated) {
    const line = renderClaim(c, registry);
    if (!line) schemaErrors.push(`render_failed:${c.type}`);
    else sentences.push(line);
  }
  const decisionText = sentences.join(" ");
  const claimsCheck = decisionText ? checkBriefClaims(decisionText, payload, { registry }) : { blockedCount: 1, citations: [], allowedText: "" };
  const advisoryOut = processStructuredAdvisory(structured, registry);
  const commentary = advisoryOut.advisoryText || null;
  const commentaryBlocked = advisoryOut.commentaryBlocked;
  const commentaryWithheld = advisoryOut.commentaryWithheld;
  const displayText = (decisionText + advisoryOut.advisoryBlock).trim();
  const grounding = scoreBriefGrounding(decisionText, payload);
  const ok = schemaErrors.length === 0 && claimsCheck.blockedCount === 0 && grounding.acceptable && validated.length > 0;
  return {
    ok,
    complete: ok,
    schemaErrors,
    decisionText,
    commentary: commentary || null,
    advisoryText: advisoryOut.advisoryText,
    advisoryItems: advisoryOut.advisoryItems,
    advisoryDroppedCount: advisoryOut.advisoryDroppedCount,
    rawModelProse: advisoryOut.rawModelProse,
    rawModelScreened: advisoryOut.rawModelScreened,
    commentaryBlocked,
    commentaryWithheld,
    displayText,
    citations: claimsCheck.citations || [],
    blockedCount: schemaErrors.length + claimsCheck.blockedCount,
    claimCount: validated.length,
    claims: validated,
    grounding,
    architecture: "allowlist-claims-v3-advisory"
  };
}
