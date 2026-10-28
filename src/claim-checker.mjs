/**
 * Evidence claim checker for model briefs (browser-safe; no node:* imports).
 *
 * Every sentence must carry at least one [evidence:<id>] tag that exists in the
 * server-built registry, and then:
 *  - NUMBERS: every numeral (1,234 / 4735 / 0.87 / 70h / 12%) and every spelled-out
 *    number ("seventy", "one hundred seventy-eight") must equal a value inside the
 *    cited evidence — whole-token numeric equality, never substring matching. When
 *    BOTH the claim and a cited quantity carry a unit (units / jobs / hours / usd /
 *    cells / pct), the units must also agree (178 units ≠ 178 jobs; $84 ≠ 84 units).
 *  - ENTITIES: job / lot / order / machine identifiers must exist in the registry.
 *  - ASSERTIONS: release / ship / approve, compliance, safety, commitment, field
 *    agreement, schedule and resolution claims are classified on the adversarially-
 *    normalized sentence (NFKC + confusable + leet + spacing). Each class is accepted
 *    only when the CITED registry entries' STRUCTURED facts support it — free text
 *    (including supplier quotes) never "supports" a claim by itself. Unsupported
 *    claims get UNSUPPORTED_ASSERTION and the sentence is removed.
 *
 * Sentences that fail are removed from the brief and reported with reasons.
 */
import { sha256Hex } from "./sha256.mjs";
import { detectClaimPhrases } from "./security/phrase-screen.mjs";
import { canonicalText } from "./security/text-normalize.mjs";
import { evaluateAssertionGate } from "./security/brief-assertion-gate.mjs";

const NUM_RE = /(?<![A-Za-z0-9_\-.])\$?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?:[eE][+-]?\d+)?(?=(?:h|hrs?|%|x)?(?![A-Za-z0-9_\-])(?!\.\d))/g;

const ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, thousand: 1000, million: 1_000_000 };
const ARTICLE_SCALES = { dozen: 12, score: 20 };
const isNumberWord = w => w in ONES || w in TENS || w in SCALES;

const UNIT_WORDS = {
  units: "units", unit: "units", parts: "units", part: "units", pieces: "units", piece: "units", pcs: "units", pc: "units", bars: "units",
  jobs: "jobs", job: "jobs", orders: "jobs", order: "jobs",
  hours: "hours", hour: "hours", hrs: "hours", hr: "hours", h: "hours",
  days: "days", day: "days",
  cells: "cells", cell: "cells", machines: "cells", machine: "cells",
  percent: "pct", "%": "pct", pct: "pct",
  usd: "usd", dollars: "usd", dollar: "usd"
};
const UNIT_STOP = new Set(["and", "or", "with", "at", "for", "of", "in", "per", "vs", "versus", "to", "from", "by", "than", "is", "are", "was", "were", "the", "a", "an"]);

/** Unit of the number at [start,end) in text: "$" prefix, h/%/hrs suffix, or a unit word within 2 following words. */
function unitAround(text, start, end, dollar) {
  if (dollar || /\$\s*$/.test(text.slice(Math.max(0, start - 2), start))) return "usd";
  const after = text.slice(end);
  const suffix = after.match(/^(h|hrs?|%)(?![A-Za-z0-9])/i);
  if (suffix) return UNIT_WORDS[suffix[1].toLowerCase()] || null;
  const ofThe = after.match(/^[\s-]*of\s+the\s+([a-z%]+)/i);
  if (ofThe) return UNIT_WORDS[ofThe[1].toLowerCase()] || null;
  const words = after.slice(0, 60).toLowerCase().match(/^[\s-]*((?:[a-z%]+[\s-]+){0,2}?)([a-z%]+)/);
  if (!words) return null;
  const between = words[1].trim().split(/[\s-]+/).filter(Boolean);
  if (between.some(w => UNIT_STOP.has(w) || w in UNIT_WORDS)) return null;
  if (/^[\s-]*\d/.test(after)) return null;
  return UNIT_WORDS[words[2]] || null;
}

/** Numeric values written with digits. Identifiers like JOB-007, Ti-6Al-4V, AMS4911 are skipped. */
/** Fold Arabic-Indic / Devanagari digits to ASCII before numeric extraction. */
export function foldUnicodeDigits(text) {
  const map = { "\u0660": "0", "\u0661": "1", "\u0662": "2", "\u0663": "3", "\u0664": "4", "\u0665": "5", "\u0666": "6", "\u0667": "7", "\u0668": "8", "\u0669": "9",
    "\u06F0": "0", "\u06F1": "1", "\u06F2": "2", "\u06F3": "3", "\u06F4": "4", "\u06F5": "5", "\u06F6": "6", "\u06F7": "7", "\u06F8": "8", "\u06F9": "9" };
  let s = String(text).normalize("NFKC");
  s = s.replace(/[\u0966-\u096F]/g, ch => String(ch.charCodeAt(0) - 0x0966));
  s = s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, ch => map[ch] || ch);
  return s;
}

export function extractNumerals(text) {
  const out = [];
  const src = foldUnicodeDigits(text);
  for (const m of src.matchAll(NUM_RE)) {
    let raw = m[1].replace(/,/g, "") + (m[2] || "");
    const sci = m[0].match(/[eE][+-]?\d+$/);
    if (sci) raw = m[0].replace(/^\$/, "").replace(/,/g, "");
    const end = m.index + m[0].length;
    out.push({
      raw: m[0], value: Number(raw), decimals: m[2] ? m[2].length - 1 : 0,
      index: m.index, end, unit: unitAround(src, m.index, end, m[0].startsWith("$"))
    });
  }
  return out;
}

/** Spelled-out numbers ("seventy", "one hundred seventy-eight", "twelve thousand"). */
export function extractSpelledNumbers(text) {
  const normalized = foldUnicodeDigits(text);
  const words = [...String(normalized).toLowerCase().matchAll(/[a-z]+/g)].map(m => ({ w: m[0], i: m.index, end: m.index + m[0].length }));
  const out = [];
  let i = 0;
  while (i < words.length) {
    if (words[i].w === "half") {
      const start = words[i].i, end = words[i].end;
      out.push({ raw: "half", value: 0.5, decimals: 1, spelled: true, index: start, end, unit: unitAround(normalized, start, end, false) });
      i++; continue;
    }
    if (words[i].w === "a" && words[i + 1] && (words[i + 1].w in SCALES || words[i + 1].w in ARTICLE_SCALES)) {
      const scale = words[i + 1].w;
      const val = scale in ARTICLE_SCALES ? ARTICLE_SCALES[scale] : 100;
      const start = words[i].i, end = words[i + 1].end;
      out.push({ raw: `a ${scale}`, value: val, decimals: 0, spelled: true, index: start, end, unit: unitAround(normalized, start, end, false) });
      i += 2; continue;
    }
    if (!isNumberWord(words[i].w) || words[i].w in SCALES) { i++; continue; }
    const run = [words[i]];
    let j = i + 1;
    while (j < words.length) {
      const gap = String(normalized).slice(run[run.length - 1].end, words[j].i);
      if (!/^[\s-]*$/.test(gap)) break;
      if (isNumberWord(words[j].w)) { run.push(words[j]); j++; continue; }
      if (words[j].w === "and" && j + 1 < words.length && isNumberWord(words[j + 1].w)) { j++; continue; }
      break;
    }
    i = j;
    // A lone "one" is almost always a pronoun ("the cheaper one"), not a quantity.
    if (run.length === 1 && run[0].w === "one") continue;
    let total = 0, current = 0;
    for (const { w } of run) {
      if (w in ONES) current += ONES[w];
      else if (w in TENS) current += TENS[w];
      else if (w === "hundred") current = (current || 1) * 100;
      else { total += (current || 1) * SCALES[w]; current = 0; }
    }
    const start = run[0].i, end = run[run.length - 1].end;
    out.push({ raw: run.map(r => r.w).join(" "), value: total + current, decimals: 0, spelled: true, index: start, end, unit: unitAround(normalized, start, end, false) });
  }
  return out;
}

export function extractNumbers(text) {
  return [...extractNumerals(text), ...extractSpelledNumbers(text)];
}

const ENTITY_RE = /\b(?:JOB-\d{2,4}|LOT-[A-Z0-9-]+|SO-\d+|PO-[A-Z0-9-]+|HAAS-[A-Z0-9]+|H-\d+)\b/gi;

function qtyMatch(n, quantities) {
  return quantities.some(q => {
    const valueOk = q.value === n.value
      || (n.decimals > 0 && +q.value.toFixed(n.decimals) === n.value)
      || (n.decimals > 0 && Number.isFinite(n.value) && Math.abs(q.value - n.value) < 10 ** -n.decimals);
    if (!valueOk) return false;
    // When the claim declares a unit, cited evidence must use the same unit (blocks "7 units" grounded on 7 jobs).
    if (n.unit && q.unit !== n.unit) return false;
    return true;
  });
}

function entry(text, extra = {}) {
  const quantities = (extra.quantities || []).map(q => ({ value: Number(q.value), unit: q.unit || null, origin: q.origin || null }));
  // Free-text numbers are still extracted for hashRegistry / display, but grounding NEVER uses them —
  // only the structured `quantities` and `facts` do. That closes the "supplier plants assertion words
  // into a quoted line, then cites that line" attack.
  return { text, values: quantities.map(q => q.value), quantities, facts: extra.facts || {}, ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "quantities" && k !== "facts")) };
}

const q = (value, unit, origin) => ({ value, unit, origin });

/** Registry is built from a server-computed payload (see src/brief-context.mjs). */
export function buildEvidenceRegistry(payload) {
  const registry = new Map();
  registry.set(`scenario:${payload.scenarioId}`, entry(`Scenario ${payload.scenarioId} synthetic demonstration`, {
    facts: { kind: "scenario", scenarioId: payload.scenarioId, synthetic: true }
  }));
  for (const f of payload.summary?.findings || []) {
    const quote = f.evidence?.quote || `${f.field}`;
    const status = f.status || (f.observed == null ? "UNKNOWN" : f.observed === f.expected ? "MATCH" : "CONFLICT");
    registry.set(`field:${f.field}`, entry(`${quote} expected ${f.expected} observed ${f.observed ?? "not found"} status ${status}`, {
      line: f.evidence?.line,
      facts: {
        kind: "field", field: f.field, expected: f.expected, observed: f.observed ?? null,
        status, agrees: status === "MATCH", disagrees: status === "CONFLICT" || status === "UNKNOWN"
      }
    }));
    if (f.evidence?.line) registry.set(`cert-line:${f.evidence.line}`, entry(quote, {
      facts: { kind: "cert-line", field: f.field, line: f.evidence.line, quote }
    }));
  }
  const s = payload.summary || {};
  if (s.impactedOrders != null) registry.set("metric:impactedOrders", entry(`${s.impactedOrders} impacted jobs orders`, {
    quantities: [q(s.impactedOrders, "jobs", "impactedOrders")],
    facts: { kind: "metric", metric: "impactedOrders", held: true }
  }));
  if (s.impactedUnits != null) registry.set("metric:impactedUnits", entry(`${s.impactedUnits} impacted units`, {
    quantities: [q(s.impactedUnits, "units", "impactedUnits")],
    facts: { kind: "metric", metric: "impactedUnits", held: true }
  }));
  if (s.indicativeOrderValue != null) registry.set("metric:exposure", entry(`illustrative order exposure ${s.indicativeOrderValue} USD not realized loss`, {
    quantities: [q(s.indicativeOrderValue, "usd", "indicativeOrderValue")],
    facts: { kind: "metric", metric: "exposure", illustrative: true }
  }));
  if (s.affectedMachines) registry.set("metric:affectedCells", entry(`${s.affectedMachines.length} of ${s.totalMachines ?? 4} production cells: ${s.affectedMachines.join(", ")}`, {
    quantities: [q(s.affectedMachines.length, "cells", "affectedCells"), q(s.totalMachines ?? 4, "cells", "totalMachines")],
    facts: { kind: "metric", metric: "affectedCells" }
  }));
  if (s.totalOrders != null) registry.set("metric:totalOrders", entry(`${s.totalOrders} active production orders`, {
    quantities: [q(s.totalOrders, "jobs", "totalOrders")],
    facts: { kind: "metric", metric: "totalOrders" }
  }));
  for (const j of s.jobs || []) {
    registry.set(`job:${j.id}`, entry(`${j.id} order ${j.order} ${j.units} units priority ${j.priority} cell ${j.machineId} due hour ${j.dueHour}`, {
      quantities: [q(j.units, "units", "units"), q(j.dueHour, "hours", "dueHour")],
      facts: { kind: "job", jobId: j.id, order: j.order, machineId: j.machineId, priority: j.priority, held: true }
    }));
  }
  for (const p of payload.plans || []) {
    const quantities = [
      q(p.estimatedCost, "usd", "estimatedCost"),
      ...(p.lateHours != null ? [q(p.lateHours, "hours", "lateHours")] : []),
      ...(p.substitutedQualifiedUnits != null ? [q(p.substitutedQualifiedUnits, "units", "qualifiedUnits")] : []),
      ...(p.stockUsed != null && p.substitutedQualifiedUnits == null ? [q(p.stockUsed, "units", "stockUsed")] : []),
      ...(p.conditionalJobs != null ? [q(p.conditionalJobs, "jobs", "conditionalJobs")] : []),
      ...(p.lateJobsShopWide != null ? [q(p.lateJobsShopWide, "jobs", "lateJobsShopWide")] : [])
    ];
    registry.set(`plan:${p.id}`, entry(`${p.label} estimated cost ${p.estimatedCost} incremental late hours ${p.lateHours ?? ""} qualified units ${p.substitutedQualifiedUnits ?? p.stockUsed ?? ""} conditional jobs ${p.conditionalJobs ?? ""} late jobs shop-wide ${p.lateJobsShopWide ?? ""}`, {
      quantities,
      facts: {
        kind: "plan", planId: p.id, label: p.label, estimatedCost: p.estimatedCost,
        lateHours: p.lateHours ?? null, lateJobsShopWide: p.lateJobsShopWide ?? null,
        onTime: p.lateHours === 0 && (p.lateJobsShopWide === 0 || p.lateJobsShopWide == null),
        planningEstimate: true
      }
    }));
    if (p.cpm?.finishDeltaHours != null) registry.set(`pm:finishDelta:${p.id}`, entry(`CPM finish delta ${p.cpm.finishDeltaHours} hours`, {
      quantities: [q(p.cpm.finishDeltaHours, "hours", "finishDeltaHours")],
      facts: { kind: "pm", metric: "finishDelta", planId: p.id, synthetic: true }
    }));
    if (p.cpm?.impactedFinishDeltaHours != null) registry.set(`pm:impactedFinishDelta:${p.id}`, entry(`impacted-job finish delta ${p.cpm.impactedFinishDeltaHours} hours`, {
      quantities: [q(p.cpm.impactedFinishDeltaHours, "hours", "impactedFinishDeltaHours")],
      facts: { kind: "pm", metric: "impactedFinishDelta", planId: p.id, synthetic: true }
    }));
    if (p.evm?.costPerformanceIndex != null) registry.set(`pm:cpi:${p.id}`, entry(`synthetic CPI ${p.evm.costPerformanceIndex}`, {
      quantities: [q(p.evm.costPerformanceIndex, null, "cpi")],
      facts: { kind: "pm", metric: "cpi", planId: p.id, synthetic: true }
    }));
    if (p.evm?.schedulePerformanceIndex != null) registry.set(`pm:spi:${p.id}`, entry(`synthetic SPI ${p.evm.schedulePerformanceIndex}`, {
      quantities: [q(p.evm.schedulePerformanceIndex, null, "spi")],
      facts: { kind: "pm", metric: "spi", planId: p.id, synthetic: true }
    }));
    if (p.evm?.estimateAtCompletion != null) registry.set(`pm:eac:${p.id}`, entry(`synthetic EAC ${p.evm.estimateAtCompletion}`, {
      quantities: [q(p.evm.estimateAtCompletion, "usd", "eac")],
      facts: { kind: "pm", metric: "eac", planId: p.id, synthetic: true }
    }));
  }
  for (const row of payload.pm?.wsjfRank || []) {
    registry.set(`pm:wsjf:${row.jobId}`, entry(`WSJF ${row.wsjfScore} for ${row.jobId} ${row.order}`, {
      quantities: [q(row.wsjfScore, null, "wsjf")],
      facts: { kind: "pm", metric: "wsjf", jobId: row.jobId, synthetic: true }
    }));
  }
  for (const c of payload.pm?.cells || []) {
    registry.set(`cell:${c.machineId}`, entry(`${c.machineId} jobs ${c.wipJobs} throughput ${c.throughputJobsPerHour} jobs per hour average time in system ${c.averageTimeInSystemHours} hours average jobs in system ${c.averageItemsInSystem} utilization ${c.utilizationPct}%`, {
      quantities: [
        q(c.wipJobs, "jobs", "wipJobs"), q(c.throughputJobsPerHour, null, "throughput"),
        q(c.averageTimeInSystemHours, "hours", "averageTimeInSystemHours"),
        q(c.averageItemsInSystem, "jobs", "averageItemsInSystem"),
        q(c.utilizationPct, "pct", "utilizationPct")
      ],
      facts: { kind: "cell", machineId: c.machineId }
    }));
  }
  return registry;
}

const EVIDENCE_ID = /^[a-z0-9][a-z0-9:._-]{0,63}$/i;

export function normalizeBriefText(text) {
  return String(text || "").normalize("NFKC");
}

function splitSentences(text) {
  return normalizeBriefText(text)
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function parseEvidenceTags(sentence) {
  return [...sentence.matchAll(/\[evidence:([^\]]+)\]/g)].map(m => m[1].trim()).filter(id => EVIDENCE_ID.test(id));
}

function knownEntities(registry) {
  const set = new Set();
  for (const { text } of registry.values()) for (const m of text.matchAll(ENTITY_RE)) set.add(m[0].toUpperCase());
  return set;
}

/* ---------------- qualitative grounding ---------------- */

const FIELD_AGREE = /\b(match(?:es|ed)?|matches|agree(?:s|d)?|consistent|identical|same as|equal(?:s|ed)?|align(?:s|ed)?)\b/i;
const FIELD_DISAGREE = /\b(does not match|do not match|doesn't match|don't match|mismatch(?:ed|es)?|conflict(?:s|ed|ing)?|disagree(?:s|d)?|differ(?:s|ed|ent)?|discrepan(?:cy|cies)|not found|missing|unknown)\b/i;
const SCHEDULE = /\b(on[\s-]?time|late|delay(?:ed|s)?|behind schedule|ahead of schedule|finish(?:es|ed)? (?:early|late|on time))\b/i;
const RESOLUTION = /\b(resolv(?:ed|es|e)|(?:issue|incident|conflict|discrepancy|nonconformance|hold) (?:is |was |has been |have been )?(?:fix(?:ed)?|clear(?:ed)?|closed)|clear(?:ed|s)? (?:up|the) (?:issue|incident|conflict)|(?:incident|issue|conflict) (?:is |was )?closed|remediat(?:ed|es|e)|correct(?:ed|s)? (?:the )?(?:issue|incident|conflict|discrepancy))\b/i;

/**
 * Decide whether the cited structured facts support an affirmative qualitative claim.
 * Returns null when the claim is supported, otherwise a short reason string.
 */
const QUALITATIVE_REASSURANCE = /\b(harmless|clerical\s+typo|can\s+be\s+ignored|good\s+order|spotless\s+record|checks\s+out|in\s+good\s+standing|no\s+concern|nothing\s+to\s+worry)\b/i;
const HEAT_REASSURANCE = /\bheat\s+is\s+(?:fine|ok|okay|acceptable|good|cleared)\b/i;
const MACHINING_RELEASE = /\b(proceed\s+with\s+cutting|go\s+ahead\s+and\s+machine|machine\s+the\s+(?:bars?|lot|material|parts?)|run\s+the\s+program\s+on)\b/i;

function supportGap(kind, facts, body, payload) {
  if (kind === "release") return "release_or_ship_never_supported";
  if (kind === "safety") return "safety_never_supported";
  if (kind === "commitment") return "commitment_never_supported";
  if (kind === "compliance") {
    const certificateLevel = /\bcertificate\b/i.test(body) || /\bfully\s+compliant\b/i.test(body);
    const findings = payload?.summary?.findings || [];
    if (certificateLevel) {
      if (findings.length && findings.every(f => f.status === "MATCH")) return null;
      return "certificate_compliance_needs_all_fields_MATCH";
    }
    if (facts.some(f => f.kind === "field" && f.agrees)) return null;
    return "compliance_needs_MATCH_field";
  }
  return "unsupported";
}

function proseForGrounding(body) {
  // Drop identifiers so "AEROSPACE-40-LOT-CONFLICT" cannot trip the word "conflict".
  return String(body).replace(/\b(?:JOB|LOT|SO|PO|HAAS|AMS|H)-[A-Z0-9-]+\b/gi, " ")
    .replace(/\b[A-Z]{3,}(?:-[A-Z0-9]+){2,}\b/g, " ");
}

function findUnsupportedAssertions(body, cited, payload) {
  const facts = cited.map(e => e.facts || {}).filter(f => f && f.kind);
  const unsupported = [];
  const prose = proseForGrounding(body);
  if (QUALITATIVE_REASSURANCE.test(prose)) {
    unsupported.push({ phrase: "qualitative-reassurance", kind: "reassurance", gap: "qualitative_reassurance_never_supported" });
  }
  if (HEAT_REASSURANCE.test(prose)) {
    unsupported.push({ phrase: "heat-reassurance", kind: "reassurance", gap: "heat_reassurance_never_supported" });
  }
  if (MACHINING_RELEASE.test(prose)) {
    unsupported.push({ phrase: "machining-imperative", kind: "release", gap: "machining_imperative_never_supported" });
  }
  // Structured phrase-screen hits (release / compliance / safety / commitment).
  for (const hit of detectClaimPhrases(body).filter(h => !h.negated)) {
    const gap = supportGap(hit.kind, facts, body, payload);
    if (gap) unsupported.push({ phrase: hit.phrase, kind: hit.kind, gap });
  }
  // Field agreement / disagreement — must cite a matching field finding.
  if (FIELD_AGREE.test(prose) && !FIELD_DISAGREE.test(prose)) {
    if (!facts.some(f => f.kind === "field" && f.agrees)) unsupported.push({ phrase: "field-agreement", kind: "agreement", gap: "agreement_needs_MATCH_field" });
  }
  if (FIELD_DISAGREE.test(prose)) {
    // Disagreement / conflict / missing is fine when a CONFLICT or UNKNOWN finding is cited, OR when the
    // sentence is clearly about a hold / pending state backed by a held metric.
    const ok = facts.some(f => f.kind === "field" && (f.disagrees || f.status === "UNKNOWN" || f.status === "CONFLICT"))
      || facts.some(f => f.kind === "metric" && f.held);
    if (!ok) unsupported.push({ phrase: "field-disagreement", kind: "disagreement", gap: "disagreement_needs_CONFLICT_field" });
  }
  // Schedule claims — need a plan with lateHours / lateJobs that agree with the claim.
  if (SCHEDULE.test(prose)) {
    const late = /late|delay|behind/.test(canonicalText(prose));
    const onTime = /on[\s-]?time|ahead/.test(canonicalText(prose));
    if (onTime && !facts.some(f => f.kind === "plan" && f.onTime === true)) unsupported.push({ phrase: "on-time", kind: "schedule", gap: "on_time_needs_zero_late_plan" });
    if (late && !facts.some(f => f.kind === "plan" && ((f.lateHours ?? 0) > 0 || (f.lateJobsShopWide ?? 0) > 0))) unsupported.push({ phrase: "late", kind: "schedule", gap: "late_needs_positive_late_plan" });
  }
  // Resolution claims — never supported by this demo's evidence (the incident is the hold).
  if (RESOLUTION.test(prose) && !/pending|before|until|held|hold/.test(canonicalText(prose))) {
    unsupported.push({ phrase: "resolved", kind: "resolution", gap: "resolution_never_supported" });
  }
  return unsupported;
}

export function checkSentence(sentence, registry, entities = knownEntities(registry), payload = null) {
  const tags = parseEvidenceTags(sentence);
  if (!tags.length) return { allowed: false, reason: "UNCITED" };
  const unknown = tags.filter(id => !registry.has(id));
  if (unknown.length) return { allowed: false, reason: "UNKNOWN_EVIDENCE_ID", detail: unknown };
  const body = sentence.replace(/\[evidence:[^\]]+\]/g, " ");
  const cited = tags.map(id => registry.get(id));
  const citedQuantities = cited.flatMap(e => e.quantities || []);
  const badNumbers = extractNumbers(body).filter(n => !qtyMatch(n, citedQuantities)).map(n => n.unit ? `${n.raw} (${n.unit})` : n.raw);
  if (badNumbers.length) return { allowed: false, reason: "NUMBER_NOT_IN_EVIDENCE", detail: badNumbers };
  const badEntities = [...body.matchAll(ENTITY_RE)].map(m => m[0].toUpperCase()).filter(e => !entities.has(e));
  if (badEntities.length) return { allowed: false, reason: "ENTITY_NOT_IN_EVIDENCE", detail: badEntities };
  const assertions = findUnsupportedAssertions(body, cited, payload);
  if (assertions.length) return { allowed: false, reason: "UNSUPPORTED_ASSERTION", detail: assertions.map(a => a.phrase) };
  const gate = evaluateAssertionGate(body, cited, payload);
  if (!gate.allowed) return { allowed: false, reason: "UNBOUND_REGULATED_ASSERTION", detail: gate.gaps, assertionGate: gate };
  return { allowed: true, reason: null, tags, assertionGate: gate };
}

export function checkBriefClaims(text, payload, { registry = buildEvidenceRegistry(payload) } = {}) {
  const entities = knownEntities(registry);
  const sentences = splitSentences(text);
  const results = sentences.map(sentence => {
    const r = checkSentence(sentence, registry, entities, payload);
    return { sentence, cited: r.reason !== "UNCITED", allowed: r.allowed, reason: r.reason, detail: r.detail || null, tags: r.tags || [], evidenceIds: parseEvidenceTags(sentence) };
  });
  const blocked = results.filter(r => !r.allowed);
  return {
    blockedCount: blocked.length,
    totalSentences: sentences.length,
    allowedText: results.filter(r => r.allowed).map(r => r.sentence).join(" "),
    blocked,
    results,
    citations: [...new Set(results.filter(r => r.allowed).flatMap(r => r.tags))],
    registrySize: registry.size
  };
}

export function hashRegistry(registry) {
  // Hash structured facts + quantities (not free text) so registry identity is independent of quote wording.
  const payload = [...registry.entries()].map(([k, v]) => [k, { facts: v.facts || {}, quantities: v.quantities || [] }]).sort((a, b) => a[0].localeCompare(b[0]));
  return sha256Hex(JSON.stringify(payload));
}
