/**
 * Supplier-text injection quarantine (browser-safe).
 *
 * Runs on every adversarially-normalized variant (NFKC, confusable fold, leetspeak,
 * letter-spacing, punctuation). Matches synonym families, not a short literal list:
 *   ignore/disregard/forget/override + prior/previous/above + instructions/directives/rules
 *   role-play / "you are now" / "pretend you are"
 *   system-prompt delimiters and "new system prompt"
 *   approve/authorize/release material (legacy)
 *
 * When any threat fires the WHOLE supplier blob is replaced with a single quarantine
 * marker, so the original injection never reaches the model verbatim. Clean text
 * (certificate fields) is left alone.
 */
import { screeningVariants, hasObfuscation } from "./security/text-normalize.mjs";
import { scanInstructionIntake } from "./security/instruction-intake.mjs";

const FAMILY = [
  { id: "ignore-prior", re: /\b(?:ignore|disregard|forget|override|discard|skip|bypass|cancel|nullify|void|dismiss|abandon|drop|set\s+aside)\b.{0,40}\b(?:all\s+)?(?:previous|prior|above|earlier|preceding|former|old|existing|original|everything\s+you\s+were\s+told)\b.{0,40}\b(?:instructions?|directives?|rules?|guidance|prompts?|orders?|policies|policy|commands?|constraints?|context)?/ },
  { id: "ignore-attention", re: /\bpay\s+no\s+attention\b.{0,40}\b(?:earlier|previous|prior|above)\b.{0,30}\b(?:guidance|instructions?|rules?)\b/ },
  { id: "ignore-overlook", re: /\b(?:kindly\s+|please\s+)?overlook\b.{0,40}\b(?:prior|previous|earlier|above)\b.{0,40}\b(?:notes?|guidance|instructions?|rules?|hold|release)\b/ },
  { id: "ignore-do-not-follow", re: /\bdo\s+not\s+follow\b.{0,40}\bwhat\s+was\s+said\s+before\b/ },
  { id: "ignore-spaced", re: /\b(?:ignore|disregard|forget|override)\b(?:\s+\w+){0,6}\b(?:instructions?|directives?|rules?|guidance|prompts?)\b/ },
  { id: "ignore-dotted", re: /\bi\s*\.\s*g\s*\.\s*n\s*\.\s*o\s*\.\s*r\s*\.\s*e\b.{0,30}\b(?:rules?|instructions?|above)\b/ },
  { id: "note-to-ai", re: /\bnote\s+to\s+(?:the\s+)?(?:ai|assistant|model)\b.{0,80}\b(?:pre[\s-]?cleared|approved|authorized|release)\b/i },
  { id: "ignore-system-said", re: /\bdisregard\s+what\s+(?:the\s+)?system\s+said\b/ },
  { id: "ignore-fr-de", re: /\b(?:ignor(?:e|er)|oublie(?:r|z)|ne\s+pas\s+tenir\s+compte)\b.{0,40}\b(?:previous|prior|above|earlier|instructions?|directives?|rules?|guidance)\b|\b(?:beachte|ignoriere)\b.{0,40}\b(?:nicht|keine)\b.{0,20}\b(?:vorherige|frühere|obige)\b.{0,30}\b(?:anweisungen|regeln)\b/i },
  { id: "system-override", re: /(?:^|\s)system\s*:\s|\bsystem\s+prompt\b|\bnew\s+system\s+prompt\b|\bupdated?\s+system\s+prompt\b|\bim_start\b|\bim_end\b|\binst\b|\bend\s*\]\s*>>|\b<<\s*sys\b|\b\[system\]\b|\bassistant\s*:\s*sure\b/ },
  { id: "role-jailbreak", re: /\b(?:you\s+are\s+now|you'?re\s+now|pretend\s+(?:you\s+are|to\s+be)|act\s+as\s+(?:if\s+you(?:'?re|\s+are)\s+)?|role[\s-]?play\s+as|from\s+now\s+on\s+you\s+(?:are|will)|enter\s+(?:developer|DAN|jailbreak)\s+mode|ignore\s+your\s+(?:programming|training|guidelines|safety))\b/ },
  { id: "approve-release", re: /\b(?:approve|authorize|authorise|release)\b.{0,20}\b(?:material|lot|shipment|production|parts?|heat|bar)\b|\brelease\s+material\b/ },
  { id: "hidden-json-cmd", re: /\{\s*"action"\s*:\s*"(?:release|approve|authorize)"|\boutput\s+(?:only\s+)?(?:release|approve|authorized)\b/ },
  { id: "developer-mode", re: /\b(?:developer\s+mode|sudo\s+mode|god\s+mode|jailbreak|dan\s+mode|do\s+anything\s+now)\b/ }
];

const QUARANTINE_MARKER = "[QUARANTINED_SUPPLIER_TEXT]";

export function scanSupplierText(text) {
  const raw = String(text || "");
  const threats = [];
  const variants = screeningVariants(raw);
  for (const rule of FAMILY) {
    if (variants.some(v => rule.re.test(v)) || rule.re.test(raw)) {
      threats.push({ id: rule.id, severity: "HIGH" });
    }
  }
  const structural = scanInstructionIntake(raw);
  for (const t of structural.threats) {
    if (!threats.some(x => x.id === t.id)) threats.push(t);
  }
  if (hasObfuscation(raw) && threats.length) {
    threats.push({ id: "obfuscation", severity: "MEDIUM" });
  }
  // Fail closed: any threat → replace the WHOLE blob. Certificate fields will be
  // re-entered by the operator or recovered from a clean document; never let the
  // injection ride along next to them.
  const sanitized = threats.length ? QUARANTINE_MARKER : raw.replace(/\u0000/g, "");
  return {
    threats,
    sanitized,
    quarantined: threats.length > 0,
    policy: "supplier-text-never-executes-as-instruction",
    reachedModelVerbatim: false
  };
}
