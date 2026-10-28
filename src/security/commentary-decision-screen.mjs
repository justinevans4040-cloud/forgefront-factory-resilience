/**
 * Advisory commentary must not assert operational decisions (resume/release/ship/clear/approve/hold-lift).
 * Uses the same normalization variants as phrase-screen plus an operational-verb grammar (modal + resume/restart, etc.).
 */
import { normalizeBriefText } from "../claim-checker.mjs";
import { detectClaimPhrases } from "./phrase-screen.mjs";
import { screeningVariants } from "./text-normalize.mjs";
import { screenModelOutput } from "../output-screen.mjs";

export const COMMENTARY_WITHHELD_NOTICE =
  "withheld: commentary asserted a decision; see DECISION panel";

const MODALS = new Set(["can", "may", "should", "will", "shall", "must", "could", "would"]);
const OPERATIONAL_VERBS = [
  "resume", "resumes", "resumed", "resuming",
  "restart", "restarts", "restarted", "restarting",
  "reopen", "reopens", "reopened", "reopening",
  "recommence", "recommences", "recommenced", "recommencing",
  "continue", "continues", "continued", "continuing"
];
const OPERATIONAL_VERB_SET = new Set(OPERATIONAL_VERBS);
const OPERATIONAL_NOUNS = [
  "production", "manufacturing", "operations", "operation", "line", "lines", "floor", "shop", "plant",
  "output", "assembly", "machining", "cutting", "building", "build", "builds", "run", "runs", "schedule", "scheduling"
];
const OPERATIONAL_NOUN_SET = new Set(OPERATIONAL_NOUNS);

const NEGATORS = new Set(["not", "never", "cannot", "no", "without", "before", "until", "pending", "prior", "nor", "neither", "unless", "non", "un", "barring", "awaiting", "against", "forbid", "forbidden", "prohibited", "refuse", "refuses", "stop", "avoid", "dont"]);
const NOT_A_NEGATION_AFTER = new Set(["only", "just", "merely", "simply", "doubt", "question", "problem", "worries", "issue", "longer"]);
const SKIP_BACK = new Set(["be", "is", "are", "was", "were", "been", "being", "am", "yet", "to", "the", "a", "an", "any", "this", "that", "these", "those", "ever", "currently", "presently",
  "still", "should", "must", "may", "can", "could", "would", "will", "shall", "do", "does", "did", "has", "have", "had", "yet", "be", "fully", "physically", "immediately", "formally",
  "officially", "considered", "deemed", "treated", "as", "for", "of", "with", "any", "material", "lot", "parts", "physical", "operational", "final", "independent", "documented", "supplier", "further", "now", "at", "once", "again"]);

function deContract(s) {
  return s.replace(/\bcan t\b/g, "cannot").replace(/\bwon t\b/g, "will not").replace(/\b([a-z]+)n t\b/g, "$1 not").replace(/\bdont\b/g, "do not");
}

function negatedAt(tokens, startIdx) {
  for (let i = startIdx - 1, seen = 0; i >= 0 && seen < 8; i--, seen++) {
    const t = tokens[i];
    if (NEGATORS.has(t)) {
      const next = tokens[i + 1];
      if (next && NOT_A_NEGATION_AFTER.has(next)) return false;
      if (t === "no" && i + 1 !== startIdx) return false;
      return true;
    }
    if (SKIP_BACK.has(t) || MODALS.has(t) || OPERATIONAL_VERB_SET.has(t)) continue;
    return false;
  }
  return false;
}

function scanOperationalDecision(raw) {
  const s = deContract(raw);
  const tokens = s.split(" ").filter(Boolean);
  const hits = [];
  const push = (phrase, tIdx) => {
    if (!negatedAt(tokens, tIdx)) hits.push({ phrase, rule: "operational-verb", idx: tIdx });
  };
  for (let i = 0; i < tokens.length; i++) {
    const v = tokens[i];
    if (OPERATIONAL_VERB_SET.has(v)) {
      for (let j = i + 1; j <= Math.min(tokens.length - 1, i + 4); j++) {
        if (OPERATIONAL_NOUN_SET.has(tokens[j])) {
          push(tokens.slice(i, j + 1).join(" "), i);
          break;
        }
      }
      if (i > 0 && MODALS.has(tokens[i - 1])) push(`${tokens[i - 1]} ${v}`, i);
      if (i >= 2 && OPERATIONAL_NOUN_SET.has(tokens[i - 2]) && MODALS.has(tokens[i - 1])) {
        push(tokens.slice(i - 2, i + 1).join(" "), i);
      }
      if (v === "continue" && (tokens.includes("normal") || tokens.includes("usual"))) {
        const window = tokens.slice(Math.max(0, i - 4), Math.min(tokens.length, i + 4));
        if (window.some(t => OPERATIONAL_NOUN_SET.has(t))) push(tokens.slice(Math.max(0, i - 1), i + 2).join(" "), i);
      }
    }
    if (OPERATIONAL_NOUN_SET.has(v) && i + 2 < tokens.length && MODALS.has(tokens[i + 1]) && OPERATIONAL_VERB_SET.has(tokens[i + 2])) {
      push(tokens.slice(i, i + 3).join(" "), i + 2);
    }
  }
  const idioms = [
    /\bback\s+to\s+(?:full\s+)?production\b/,
    /\breturn\s+to\s+(?:normal|full)\s+(?:production|operations)\b/,
    /\bgo\s+back\s+online\b/,
    /\b(?:shop|plant|line)\s+is\s+clear(?:ed)?\s+to\s+(?:run|resume|restart)\b/
  ];
  for (const re of idioms) {
    if (re.test(s)) push(s.match(re)?.[0]?.trim() || "idiom", tokens.length);
  }
  return hits;
}

/**
 * True when a single commentary sentence asserts an operational decision (semantic grammar + phrase-screen classes).
 */
export function commentarySentenceAssertsDecision(sentence) {
  const body = normalizeBriefText(sentence);
  if (!body) return false;
  const phraseHits = detectClaimPhrases(body).filter(h => !h.negated && ["release", "compliance", "safety", "commitment"].includes(h.kind));
  if (phraseHits.length) return true;
  for (const v of screeningVariants(body)) {
    if (scanOperationalDecision(v).length) return true;
  }
  return false;
}

export function splitAdvisorySentences(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return [];
  return t.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

/**
 * Filter advisory commentary: withhold decision-asserting sentences; fail-closed safety screen per sentence.
 */
export function screenAdvisoryCommentary(text) {
  const sentences = splitAdvisorySentences(text);
  const kept = [];
  let withheldCount = 0;
  let safetyBlocked = false;
  for (const sentence of sentences) {
    const safety = screenModelOutput(sentence);
    if (!safety.allowed) {
      withheldCount++;
      safetyBlocked = true;
      continue;
    }
    if (commentarySentenceAssertsDecision(sentence)) {
      withheldCount++;
      continue;
    }
    kept.push((safety.sanitized || sentence).trim());
  }
  const allowedText = kept.join(" ").trim();
  return {
    allowedText,
    withheldCount,
    commentaryWithheld: withheldCount > 0,
    safetyBlocked,
    withheldNotice: COMMENTARY_WITHHELD_NOTICE
  };
}
