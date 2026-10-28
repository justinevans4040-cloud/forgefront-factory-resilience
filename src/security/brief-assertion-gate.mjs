/**
 * Round 12 — deny-by-default regulated assertions (browser-safe).
 *
 * Every sentence is structurally classified. Assertions about acceptability, safety,
 * compliance/conformance, release/ship, or operator directives on parts/machines/certs
 * require a cited intake field with status MATCH (and certificate-level claims need all
 * findings MATCH). Phrase lists are a secondary signal only.
 */
import { canonicalText, screeningVariants } from "./text-normalize.mjs";
import { detectClaimPhrases } from "./phrase-screen.mjs";

const IMPERATIVE_START = /^(?:please\s+)?(?:start|run|cut|machine|mill|turn|proceed|continue|begin|operate|activate|engage|spin|load|unload|ship|release|approve|use|install|dispatch|send|commencez|coupez|starten|avvia|inicie|启动)\b/i;
const OPERATOR_CUE = /\b(?:go\s+ahead|you\s+(?:should|must|need\s+to|can)|operator\s+(?:should|must)|kindly|please)\b.{0,40}\b(?:start|run|cut|machine|proceed|use|ship|release|approve|load|spin|engage)\b/;
const MACHINE_WORK = /\b(?:spindle|chuck|tool(?:ing)?|program|cnc|mill|lathe|machine|bar|bars|billet|stock|material|parts?|lot|heat|certificate|cert|documentation|paperwork|broche|mandrin|stangen|barras|husillo|mandrino|spindel)\b/;
const DIRECTIVE_VERB = /\b(?:start|run|cut|machine|mill|proceed|spin|engage|load|ship|release|approve|use|install|dispatch|send|coupez|couper|commencez|starten|schneiden|avvia|taglia|inicie|corte|起動|切断|启动)\b/;

const CERT_WORD = /\b(?:certificate|cert|zertifikat|certificat|certificado)\b|証明書|证书/i;
const CERT_EVAL = /\b(?:certificat|certificado|certificato)\b.{0,40}\b(?:acceptable|bien|pratique|prácticos|pratica)\b|\b(?:acceptable|bien)\b.{0,40}\b(?:certificat|certificado|certificato)\b/i;
const ACCEPTABILITY = /\b(?:is|are|was|were|seems?|looks?|sounds?)\s+(?:fine|ok|okay|acceptable|good|sufficient|adequate|cleared|safe|compliant|conform(?:ant|ing)?)\b|\b(?:fine|ok|okay|acceptable|good)\s+for\s+(?:all\s+)?practical\s+purposes\b|\b(?:no\s+concern|nothing\s+to\s+worry|not\s+a\s+problem|good\s+enough)\b|\b(?:in\s+ordnung|praktisch\s+in\s+ordnung|va\s+bene|est\s+bien)\b/i;
const DISMISSIVE_DOCS = /\b(?:documentation|paperwork|records?|cert(?:ificate)?\s+paper|traceability)\s+(?:is|are|was|were)?\s*(?:cosmetic|optional|irrelevant|unnecessary|for\s+show|symbolic|bureaucratic)\b/i;
const CONFORMANCE = /\bconform(?:s|ance|ant|ing)?\b|\bwithin\s+(?:spec|tolerance)\b|\bmeets?\s+(?:spec|requirements?|standard)\b/i;

function variantBodies(text) {
  const raw = String(text || "");
  const set = new Set([raw.normalize("NFKC"), canonicalText(raw), ...screeningVariants(raw)]);
  return [...set];
}

/** Structural regulated-assertion classes (not a synonym patch list). */
export function classifyRegulatedAssertions(body) {
  const hits = [];
  for (const v of variantBodies(body)) {
    const prose = v.replace(/\[evidence:[^\]]+\]/g, " ");
    if (IMPERATIVE_START.test(prose.trim()) && (MACHINE_WORK.test(prose) || DIRECTIVE_VERB.test(prose))) {
      hits.push({ kind: "operator_directive", structural: "imperative_machine_work" });
    } else if (OPERATOR_CUE.test(prose) && MACHINE_WORK.test(prose)) {
      hits.push({ kind: "operator_directive", structural: "operator_cue" });
    } else     if (/\b(?:start|run)\s+the\s+(?:spindle|machine|program|cnc)\b/.test(prose) || /\bcut\s+the\s+(?:bars?|stock|material|parts?)\b/.test(prose)) {
      hits.push({ kind: "operator_directive", structural: "machine_imperative" });
    }
    if (/[起動切断启动切割]/.test(prose) && /[棒材バースピンドル主轴]/.test(prose)) {
      hits.push({ kind: "operator_directive", structural: "cjk_machine_imperative" });
    }
    if (ACCEPTABILITY.test(prose) || DISMISSIVE_DOCS.test(prose) || CERT_EVAL.test(prose) || (CERT_WORD.test(prose) && ACCEPTABILITY.test(prose))) {
      hits.push({ kind: "acceptability", structural: "evaluative_acceptability" });
    }
    if (CERT_WORD.test(prose) && /実用上|praktisch|prácticos|pratica|实际|問題ない|没问题/i.test(prose)) {
      hits.push({ kind: "acceptability", structural: "certificate_practical_eval" });
    }
    if (/证书/.test(prose) && /没问题|可以|良好/.test(prose)) {
      hits.push({ kind: "acceptability", structural: "zh_certificate_eval" });
    }
    if (CONFORMANCE.test(prose)) {
      hits.push({ kind: "conformance", structural: "conformance_language" });
    }
    if (/\bcertificate\b/i.test(prose) && ACCEPTABILITY.test(prose)) {
      hits.push({ kind: "compliance", structural: "certificate_evaluative" });
    }
    for (const hit of detectClaimPhrases(prose).filter(h => !h.negated)) {
      if (hit.kind === "release" || hit.kind === "safety") hits.push({ kind: hit.kind, structural: `phrase_screen:${hit.rule}` });
      if (hit.kind === "compliance") hits.push({ kind: "compliance", structural: `phrase_screen:${hit.rule}` });
      if (hit.kind === "commitment") hits.push({ kind: "commitment", structural: `phrase_screen:${hit.rule}` });
    }
  }
  const seen = new Set();
  return hits.filter(h => {
    const k = `${h.kind}|${h.structural}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function citedMatchFields(cited) {
  return cited.filter(e => e.facts?.kind === "field" && e.facts?.status === "MATCH");
}

/**
 * Returns null when grounding satisfies the regulated assertions, else gap code(s).
 */
export function regulatedAssertionGaps(body, cited, payload) {
  const classes = classifyRegulatedAssertions(body);
  if (!classes.length) return null;
  const gaps = [];
  const matchFields = citedMatchFields(cited);
  const findings = payload?.summary?.findings || [];
  const certMention = /\b(?:certificate|cert)\b/i.test(body);
  const certificateLevel = certMention || classes.some(c => c.kind === "compliance" && c.structural === "certificate_evaluative");

  for (const cl of classes) {
    if (cl.kind === "operator_directive" || cl.kind === "release" || cl.kind === "safety" || cl.kind === "commitment") {
      gaps.push({ kind: cl.kind, gap: "regulated_assertion_not_grounded_in_intake" });
      continue;
    }
    if (!matchFields.length) {
      gaps.push({ kind: cl.kind, gap: "regulated_assertion_needs_MATCH_field_citation" });
      continue;
    }
    if ((cl.kind === "acceptability" || cl.kind === "compliance" || cl.kind === "conformance")
      && findings.length && !findings.every(f => f.status === "MATCH")) {
      gaps.push({ kind: cl.kind, gap: "regulated_acceptability_needs_all_findings_MATCH" });
    }
  }
  return gaps.length ? gaps : null;
}

export function evaluateAssertionGate(body, cited, payload) {
  const gaps = regulatedAssertionGaps(body, cited, payload);
  return { allowed: !gaps, gaps: gaps || [], classes: classifyRegulatedAssertions(body) };
}

const SCREEN_KINDS = new Set(["operator_directive", "release", "safety"]);

/** Whole-model screen: hard-block operator/machine directives and release/safety only; acceptability/compliance go to claim checker. */
export function screenRegulatedAssertions(text) {
  const classes = classifyRegulatedAssertions(text).filter(c => SCREEN_KINDS.has(c.kind));
  if (!classes.length) return { allowed: true, violations: [], classes: [] };
  const kinds = [...new Set(classes.map(c => c.kind))];
  const violations = kinds.map(k => `unbound_regulated_${k}`);
  return { allowed: false, violations, classes, gaps: kinds.map(k => ({ kind: k, gap: "regulated_assertion_requires_sentence_level_grounding" })) };
}
