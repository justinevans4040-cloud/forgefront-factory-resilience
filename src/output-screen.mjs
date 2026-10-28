/**
 * Model-output screen (browser-safe). Blocks the WHOLE model response when it tries to
 * approve / release / ship material or asserts compliance or safety.
 *
 * Detection is the structured grammar in security/phrase-screen.mjs, which already
 * runs on adversarially-normalized variants (NFKC, confusables, leetspeak, spacing)
 * and respects negation ("do not release", "never approve", "not material release").
 * Legacy literal regexes are NOT applied as absolute blocks — they bypassed negation
 * (R7-SL-03 residual: "Do not release the material" was wrongly blocked).
 */
import { normalizeBriefText } from "./claim-checker.mjs";
import { detectClaimPhrases } from "./security/phrase-screen.mjs";
import { screenRegulatedAssertions } from "./security/brief-assertion-gate.mjs";

const VIOLATION_FOR = {
  release: "model_attempted_approval_or_release",
  compliance: "model_attempted_compliance_claim",
  safety: "model_attempted_safety_claim"
};

export function screenModelOutput(text) {
  const body = normalizeBriefText(text);
  const regulated = screenRegulatedAssertions(body);
  if (!regulated.allowed) {
    return {
      allowed: false,
      violations: regulated.violations,
      matches: regulated.classes.map(c => ({ kind: c.kind, rule: "brief-assertion-gate", phrase: c.structural })),
      sanitized: ""
    };
  }
  const matches = detectClaimPhrases(body).filter(h => !h.negated && VIOLATION_FOR[h.kind]);
  const violations = [...new Set(matches.map(h => VIOLATION_FOR[h.kind]))];
  return {
    allowed: violations.length === 0,
    violations,
    matches: matches.map(h => ({ kind: h.kind, rule: h.rule, phrase: h.phrase })),
    sanitized: violations.length ? "" : body
  };
}
