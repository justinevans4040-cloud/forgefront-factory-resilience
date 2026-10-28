/**
 * Structural supplier-text instruction override detection (browser-safe).
 * Flags instruction-shaped text that dismisses or overrides prior / given / system rules,
 * without relying on a growing synonym patch list.
 */
import { screeningVariants, canonicalText } from "./text-normalize.mjs";

const OVERRIDE_VERB = /\b(?:skip(?:\s+over)?|hop\s+over|walk\s+past|ignore|disregard|forget|override|bypass|dismiss|abandon|nullify|void|cancel|drop|set\s+aside|overlook|discard|pay\s+no\s+attention|do\s+not\s+follow|stop\s+following|break|violate|ignor(?:e|er|ez)|oublie(?:r|z)|überspring(?:en|e)?|salta(?:r|re)?|omita(?:r)?|飛ば|跳过)\b/i;
const RULE_NOUN = /\b(?:rules?|instructions?|guidance|directives?|policies|policy|constraints?|prompts?|orders?|commands?|context|r[eè]gles?|regeln|anweisungen|regole|reglas|规则|規則)\b/i;
const PRIOR_REF = /\b(?:prior|previous|earlier|before|given|preceding|former|original|old|existing|system|what\s+was\s+said|you\s+were\s+(?:given|told)|given\s+(?:to\s+you|before)|from\s+before|avant|vorher|antes|prima|donn[eé]es?|dati|datos|以前|与えられた|与え|antes\s+de)\b/i;
const ROLE_DELIM = /(?:^|\s)system\s*:\s|\bsystem\s+prompt\b|\bim_start\b|\b\[system\]\b|\b<<\s*sys\b/;

function structuralInstructionOverride(variant) {
  const raw = String(variant ?? "").normalize("NFKC");
  const v = canonicalText(variant);
  if (/規則|规则/.test(raw) && /以前|之前|与えられた|给你/.test(raw) && /飛ば|跳过/.test(raw)) {
    return { id: "cjk-override-given-rules", severity: "HIGH" };
  }
  if (/regeln/i.test(raw) && /vorher|früher/i.test(raw) && /überspring/i.test(raw)) {
    return { id: "de-override-prior-rules", severity: "HIGH" };
  }
  if (/regole/i.test(raw) && /(?:date|state|erano|dati)/i.test(raw) && /salta/i.test(raw)) {
    return { id: "it-override-given-rules", severity: "HIGH" };
  }
  if (ROLE_DELIM.test(v)) return { id: "system-delimiter", severity: "HIGH" };
  const hasRule = RULE_NOUN.test(v);
  const hasPrior = PRIOR_REF.test(v);
  if (hasRule && hasPrior && OVERRIDE_VERB.test(v)) {
    return { id: "override-prior-rules", severity: "HIGH" };
  }
  if (hasRule && /\b(?:not\s+binding|non[\s-]?binding|do\s+not\s+apply|does\s+not\s+apply)\b/i.test(v) && hasPrior) {
    return { id: "rules-not-binding", severity: "HIGH" };
  }
  if (/\byou\s+were\s+(?:given|told)\b/.test(v) && hasRule && OVERRIDE_VERB.test(v)) {
    return { id: "override-given-rules", severity: "HIGH" };
  }
  if (/\b(?:rules?|instructions?)\s+you\s+were\s+given\b/.test(v) && OVERRIDE_VERB.test(v)) {
    return { id: "override-given-rules-reordered", severity: "HIGH" };
  }
  if (hasRule && /\b(?:skip\s+over|skip)\b/.test(v) && /\b(?:given|before|prior|earlier)\b/.test(v)) {
    return { id: "skip-over-given-rules", severity: "HIGH" };
  }
  if (RULE_NOUN.test(v) && PRIOR_REF.test(v) && /飛ば|跳过/.test(v)) {
    return { id: "cjk-skip-given-rules", severity: "HIGH" };
  }
  return null;
}

export function scanInstructionIntake(text) {
  const raw = String(text || "");
  const threats = [];
  const variants = [raw, raw.normalize("NFKC"), ...screeningVariants(raw)];
  for (const v of variants) {
    const hit = structuralInstructionOverride(v);
    if (hit && !threats.some(t => t.id === hit.id)) threats.push(hit);
  }
  return { threats, detected: threats.length > 0 };
}
