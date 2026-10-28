/**
 * Allowlist advisory items — server-rendered templates only (no free prose in UI/export).
 */
import { screenAdvisoryCommentary, COMMENTARY_WITHHELD_NOTICE } from "./security/commentary-decision-screen.mjs";

export const ADVISORY_TYPES = Object.freeze([
  "RISK_NOTE",
  "CONTEXT_NOTE",
  "DATA_GAP",
  "SUGGESTED_CHECK"
]);

export const MAX_ADVISORY_ITEMS = 8;
const TYPE_SET = new Set(ADVISORY_TYPES);
const EVIDENCE_ID = /^[a-z0-9][a-z0-9:._-]{0,63}$/i;
const FIELD_PARAM_RE = /^[a-z][a-z0-9_-]{0,31}$/i;

const RISK_TOPICS = new Set(["heat_trace", "supplier_chain", "capacity", "schedule_slip"]);
const CONTEXT_ASPECTS = new Set(["wsjf", "cpm", "evm", "littles_law", "scenario"]);
const CHECK_KINDS = new Set(["quarantine_review", "trace_pack", "master_record", "ncr_log"]);

function validateAdvisoryShape(row, registry, index) {
  const errors = [];
  const p = `advisory[${index}]`;
  if (!row || typeof row !== "object") {
    errors.push(`${p}:not_object`);
    return { errors };
  }
  const type = String(row.type || "");
  if (!TYPE_SET.has(type)) {
    errors.push(`${p}:disallowed_type:${type || "missing"}`);
    return { errors, type };
  }
  const evidenceIds = [];
  if (!Array.isArray(row.evidenceIds) || !row.evidenceIds.length) errors.push(`${p}:missing_evidence_ids`);
  else {
    for (const id of row.evidenceIds) {
      const s = String(id).trim();
      if (!EVIDENCE_ID.test(s)) errors.push(`${p}:invalid_evidence_id:${s}`);
      else if (!registry.has(s)) errors.push(`${p}:unknown_evidence_id:${s}`);
      else evidenceIds.push(s);
    }
  }
  const params = row.params && typeof row.params === "object" ? row.params : {};
  if (type === "RISK_NOTE") {
    const topic = String(params.topic || "");
    if (!RISK_TOPICS.has(topic)) errors.push(`${p}:invalid_topic`);
  }
  if (type === "CONTEXT_NOTE") {
    const aspect = String(params.aspect || "");
    if (!CONTEXT_ASPECTS.has(aspect)) errors.push(`${p}:invalid_aspect`);
  }
  if (type === "DATA_GAP") {
    const field = String(params.field || "");
    if (!FIELD_PARAM_RE.test(field)) errors.push(`${p}:invalid_field`);
    else if (!evidenceIds.includes(`field:${field}`)) errors.push(`${p}:evidence_must_include_field:${field}`);
  }
  if (type === "SUGGESTED_CHECK") {
    const check = String(params.check || "");
    if (!CHECK_KINDS.has(check)) errors.push(`${p}:invalid_check`);
  }
  return { errors, type, params, evidenceIds };
}

function renderAdvisoryItem(item) {
  const id = item.evidenceIds[0];
  const cite = extra => (item.evidenceIds.length > 1
    ? item.evidenceIds.map(e => `[evidence:${e}]`).join(" ")
    : `[evidence:${id}]`) + (extra ? ` ${extra}` : "");
  switch (item.type) {
    case "RISK_NOTE": {
      const topic = item.params.topic;
      const label = { heat_trace: "heat trace", supplier_chain: "supplier chain", capacity: "cell capacity", schedule_slip: "schedule slip" }[topic];
      return `${cite()} Risk context (${label}): review cited facts before changing hold posture — advisory only.`;
    }
    case "CONTEXT_NOTE": {
      const aspect = item.params.aspect;
      const label = { wsjf: "WSJF ranking", cpm: "critical path", evm: "earned value", littles_law: "Little's Law flow", scenario: "scenario state" }[aspect];
      return `${cite()} Context (${label}): use cited metrics to prioritize investigation — not an operator authorization.`;
    }
    case "DATA_GAP": {
      const field = item.params.field;
      return `${cite()} Data gap on ${field}: additional verification may be required; decision text above remains authoritative.`;
    }
    case "SUGGESTED_CHECK": {
      const check = item.params.check;
      const label = {
        quarantine_review: "quarantine discrepancy review",
        trace_pack: "heat trace packet",
        master_record: "master record reconciliation",
        ncr_log: "NCR log entry"
      }[check];
      return `${cite()} Suggested check (non-binding): ${label} — follow plant procedure; does not authorize material use.`;
    }
    default:
      return null;
  }
}

export function buildSampleStructuredAdvisory(payload) {
  const wsjf = (payload.pm?.wsjfRank || []).slice(0, 1);
  const heatConflict = (payload.summary?.findings || []).find(f => f.field === "heat" && f.status !== "MATCH");
  const items = [];
  if (wsjf.length) {
    items.push({
      type: "CONTEXT_NOTE",
      evidenceIds: [`pm:wsjf:${wsjf[0].jobId}`],
      params: { aspect: "wsjf" }
    });
  }
  if (heatConflict) {
    items.push({
      type: "RISK_NOTE",
      evidenceIds: [`field:heat`],
      params: { topic: "heat_trace" }
    });
    items.push({
      type: "SUGGESTED_CHECK",
      evidenceIds: [`field:heat`],
      params: { check: "quarantine_review" }
    });
  }
  items.push({
    type: "CONTEXT_NOTE",
    evidenceIds: [`scenario:${payload.scenarioId}`],
    params: { aspect: "scenario" }
  });
  return items.slice(0, MAX_ADVISORY_ITEMS);
}

/**
 * @returns {{
 *   advisoryText: string,
 *   advisoryItems: object[],
 *   advisoryDroppedCount: number,
 *   rawModelProse: string|null,
 *   rawModelScreened: object|null,
 *   commentaryBlocked: boolean,
 *   commentaryWithheld: boolean
 * }}
 */
export function processStructuredAdvisory(structured, registry) {
  let advisoryDroppedCount = 0;
  const rawParts = [];
  if (typeof structured.commentary === "string" && structured.commentary.trim()) {
    rawParts.push(structured.commentary.trim());
    advisoryDroppedCount++;
  }
  if (typeof structured.advisoryProse === "string" && structured.advisoryProse.trim()) {
    rawParts.push(structured.advisoryProse.trim());
    advisoryDroppedCount++;
  }
  const rawModelProse = rawParts.length ? rawParts.join("\n\n") : null;
  let rawModelScreened = null;
  let commentaryBlocked = false;
  let commentaryWithheld = false;
  if (rawModelProse) {
    rawModelScreened = screenAdvisoryCommentary(rawModelProse);
    commentaryWithheld = rawModelScreened.commentaryWithheld;
    commentaryBlocked = Boolean(rawModelProse && !rawModelScreened.allowedText);
  }

  const rows = Array.isArray(structured.advisory) ? structured.advisory : [];
  if (rows.length > MAX_ADVISORY_ITEMS) advisoryDroppedCount += rows.length - MAX_ADVISORY_ITEMS;
  const validated = [];
  for (let i = 0; i < Math.min(rows.length, MAX_ADVISORY_ITEMS); i++) {
    const v = validateAdvisoryShape(rows[i], registry, i);
    if (v.errors?.length) {
      advisoryDroppedCount++;
      continue;
    }
    const line = renderAdvisoryItem({ type: v.type, params: v.params, evidenceIds: v.evidenceIds });
    if (!line) {
      advisoryDroppedCount++;
      continue;
    }
    validated.push({ type: v.type, params: v.params, evidenceIds: v.evidenceIds, rendered: line });
  }

  const lines = validated.map(v => v.rendered);
  const advisoryText = lines.join(" ");
  const advisoryBlock = advisoryText
    ? `\n\n--- AI advisory (template-rendered, not a decision) ---\n${advisoryText}`
    : advisoryDroppedCount
      ? `\n\n--- AI advisory (template-rendered, not a decision) ---\n[${advisoryDroppedCount} unverified advisory item(s) dropped — see audit raw view if enabled]`
      : "";
  return {
    advisoryText,
    advisoryBlock,
    advisoryItems: validated,
    advisoryDroppedCount,
    rawModelProse,
    rawModelScreened,
    commentaryBlocked,
    commentaryWithheld,
    withheldNotice: COMMENTARY_WITHHELD_NOTICE
  };
}
