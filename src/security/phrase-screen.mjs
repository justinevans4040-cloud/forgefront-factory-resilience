/**
 * Structured release / compliance / safety / commitment phrase detection
 * (browser-safe; no node:* imports).
 *
 * Runs on every canonical variant from text-normalize.mjs and matches a small grammar
 * instead of literal strings:
 *
 *   ACTION  :=  VERB  (filler){0,3}  OBJECT          "release this material", "ship the 178 parts"
 *   STATE   :=  OBJECT (aux|adverb){0,4} STATE_WORD  "material is cleared", "the lot has been released"
 *   FIXED   :=  curated multi-word idioms            "good to go", "approved for use", "safe to fly"
 *
 * A match is NEGATED only when the nearest non-auxiliary token before it is a real
 * negator ("do not release", "never ship", "before any shipment"). "No doubt, release…",
 * "not only release…" are NOT negations.
 */
import { screeningVariants } from "./text-normalize.mjs";

const inflect = (base, { s, ed, ing } = {}) => {
  const out = [base, s || `${base}s`];
  if (ed !== false) out.push(ed || (base.endsWith("e") ? `${base}d` : `${base}ed`));
  if (ing !== false) out.push(ing || (base.endsWith("e") ? `${base.slice(0, -1)}ing` : `${base}ing`));
  return out;
};

export const RELEASE_VERBS = [
  ...inflect("release"), ...inflect("approve"), ...inflect("authorize"), ...inflect("authorise"),
  ...inflect("clear"), ...inflect("ship", { ed: "shipped", ing: "shipping" }), ...inflect("dispatch", { s: "dispatches" }),
  ...inflect("deliver"), ...inflect("send", { ed: "sent" }), ...inflect("issue"), ...inflect("accept"),
  ...inflect("pass", { s: "passes" }), ...inflect("use"), ...inflect("install"), ...inflect("load"),
  ...inflect("unhold"), ...inflect("unquarantine"), ...inflect("unblock"), ...inflect("unlock"), ...inflect("greenlight", { ed: "greenlit" }),
  ...inflect("okay"), "ok", "oks", "okd", "okayed", ...inflect("sign", { ed: "signed" }), ...inflect("move"), ...inflect("put", { ed: "put", ing: "putting" }),
  ...inflect("disposition"), ...inflect("lift"), ...inflect("remove"), ...inflect("proceed"), ...inflect("expedite")
];

export const RELEASE_OBJECTS = [
  "material", "materials", "lot", "lots", "part", "parts", "batch", "batches", "order", "orders", "production", "shipment", "shipments",
  "heat", "heats", "bar", "bars", "stock", "titanium", "component", "components", "product", "products", "goods", "item", "items",
  "job", "jobs", "work", "hold", "holds", "unit", "units", "piece", "pieces", "inventory", "delivery", "deliveries", "everything",
  "it", "them", "forgings", "billet", "billets", "plate", "plates", "floor", "customer", "customers"
];

// Objects that only count when they come right after the verb (pronouns are too generic further away).
const NEAR_ONLY_OBJECTS = new Set(["it", "them", "everything", "floor", "customer", "customers", "work"]);
// Verbs that are only release-like with specific objects (use/move/put/lift/remove/proceed/expedite/load/install/send/issue/accept/pass/sign).
const WEAK_VERBS = new Set(["use", "uses", "used", "using", "move", "moves", "moved", "moving", "put", "puts", "putting", "lift", "lifts", "lifted", "lifting",
  "remove", "removes", "removed", "removing", "proceed", "proceeds", "proceeded", "proceeding", "expedite", "expedites", "expedited", "expediting",
  "load", "loads", "loaded", "loading", "install", "installs", "installed", "installing", "send", "sends", "sent", "sending", "issue", "issues", "issued", "issuing",
  "accept", "accepts", "accepted", "accepting", "pass", "passes", "passed", "passing", "sign", "signs", "signed", "signing", "deliver", "delivers", "delivered", "delivering",
  "disposition", "dispositions", "dispositioned", "dispositioning"]);
const WEAK_VERB_OBJECTS = {
  use: ["material", "materials", "lot", "lots", "heat", "heats", "bar", "bars", "titanium", "stock", "billet", "billets", "plate", "plates", "forgings", "it", "them", "parts", "part"],
  move: ["production", "floor", "shipment", "customer", "customers"],
  put: ["production", "floor", "service", "use"],
  lift: ["hold", "holds", "quarantine"], remove: ["hold", "holds", "quarantine"],
  proceed: ["shipment", "production", "release", "delivery", "use"],
  expedite: ["shipment", "release", "delivery"],
  load: ["material", "materials", "lot", "lots", "bar", "bars", "titanium", "billet", "billets", "it", "them"],
  install: ["material", "lot", "parts", "part", "it", "them", "components", "component"],
  send: ["material", "materials", "lot", "lots", "parts", "part", "shipment", "it", "them", "floor", "customer", "customers", "production", "goods"],
  issue: ["material", "materials", "lot", "lots", "stock", "bar", "bars", "titanium", "floor", "production"],
  accept: ["material", "materials", "lot", "lots", "heat", "heats", "bar", "bars", "titanium", "parts", "part", "certificate", "cert", "shipment", "it", "them"],
  pass: ["material", "materials", "lot", "lots", "heat", "parts", "part", "inspection", "qa", "it", "them"],
  sign: ["off"],
  deliver: ["material", "materials", "lot", "lots", "parts", "part", "shipment", "order", "orders", "goods", "it", "them", "customer", "customers"],
  disposition: ["material", "lot", "lots", "parts", "use", "it", "them"]
};
const weakBase = v => Object.keys(WEAK_VERB_OBJECTS).find(b => v === b || v.startsWith(b === "put" ? "put" : b.replace(/e$/, ""))) || null;

const STATE_WORDS = ["released", "approved", "authorized", "authorised", "cleared", "shipped", "dispatched", "accepted", "unheld", "greenlit", "okayed", "okd", "dispositioned"];
const OBJECT_AUX = ["is", "are", "was", "were", "be", "been", "being", "has", "have", "had", "now", "fully", "already", "officially", "formally", "hereby", "can", "may", "should", "will", "shall", "must", "could", "would", "all", "totally", "completely", "therefore", "so", "also", "both", "considered", "deemed"];

const FIXED_RELEASE = [
  "good to go", "ok to ship", "okay to ship", "ok to use", "okay to use", "ok to release", "okay to release", "ok to proceed", "okay to proceed",
  "ready to ship", "ready to release", "ready to use", "ready for release", "ready for shipment", "ready for shipping", "ready for production", "ready for use", "ready for delivery",
  "cleared for release", "cleared for use", "cleared for production", "cleared for shipment", "cleared for shipping", "cleared for delivery", "cleared for flight", "cleared to ship", "cleared to use",
  "approved for use", "approved for production", "approved for release", "approved for shipment", "approved for shipping", "approved for delivery", "approved for flight", "approved to ship", "approved to use",
  "authorized for use", "authorized for production", "authorized for release", "authorized for shipment", "authorised for use", "authorised for release",
  "released for production", "released for use", "released for shipment", "released for shipping", "release for production", "release for shipment", "release for material", "release for use",
  "accepted for use", "accepted for production", "acceptable for use", "acceptable for production", "use as is", "use as-is", "green light", "green lit", "greenlit", "sign off", "signed off", "sign-off",
  "all clear", "hold lifted", "hold removed", "hold released", "quarantine lifted", "free to ship", "free to use", "free to release", "you may proceed", "proceed to ship", "proceed with shipment",
  "proceed with production", "proceed with release", "proceed with delivery", "can ship", "can be shipped", "can be released", "can be used", "may be shipped", "may be released", "may be used",
  "go ahead and ship", "go ahead and release", "go ahead and use", "go ahead and approve", "ship it", "send it", "release it", "approve it"
];
const FIXED_COMPLIANCE = [
  "compliant", "compliance", "in compliance", "conformant", "conforming material", "conforms to spec", "conforms to specification", "conforms to the spec",
  "meets spec", "meets specs", "meets specification", "meets specifications", "meets the spec", "meets the specification", "meets requirements", "meets all requirements", "meets the requirements",
  "meets the standard", "meets standards", "within spec", "within specification", "within tolerance", "to spec", "on spec", "in spec",
  "passes inspection", "passed inspection", "passes qa", "passed qa", "passes audit", "passed audit", "passes receiving inspection", "passed receiving inspection",
  "certified", "as9100 certified", "nadcap certified", "nadcap approved", "verified compliant", "fully compliant", "qualified material", "approved material",
  "no nonconformance", "no nonconformances", "no non conformance", "no discrepancies", "no discrepancy", "no issues", "satisfies requirements", "satisfies the requirements", "acceptable material", "accepted material"
];
const FIXED_SAFETY = [
  "safe to ship", "safe to use", "safe to fly", "safe to release", "safe to install", "safe to machine", "safe for flight", "safe for use", "safe for production",
  "is safe", "are safe", "airworthy", "flightworthy", "flight worthy", "air worthy", "fit for use", "fit for flight", "fit for purpose", "fit for service",
  "serviceable", "risk free", "risk-free", "no risk", "zero risk", "hazard free", "no safety concern", "no safety concerns", "no safety issue", "no safety issues", "flight safe"
];
const FIXED_COMMITMENT = [
  "guarantee", "guarantees", "guaranteed", "promise", "promises", "promised", "committed to", "commits to", "assured", "we assure", "i assure",
  "supplier confirmed", "supplier has confirmed", "supplier confirms", "will arrive", "will be delivered", "will ship", "ships tomorrow", "ships today", "arrives tomorrow", "on its way",
  "definitely", "certainly will", "100 percent", "without a doubt"
];

const NEGATORS = new Set(["not", "never", "cannot", "no", "without", "before", "until", "pending", "prior", "nor", "neither", "unless", "non", "un", "barring", "awaiting", "against", "forbid", "forbidden", "prohibited", "refuse", "refuses", "stop", "avoid", "dont"]);
const NOT_A_NEGATION_AFTER = new Set(["only", "just", "merely", "simply", "doubt", "question", "problem", "worries", "issue", "longer"]);
const SKIP_BACK = new Set(["be", "is", "are", "was", "were", "been", "being", "am", "yet", "to", "the", "a", "an", "any", "this", "that", "these", "those", "ever", "currently", "presently",
  "still", "should", "must", "may", "can", "could", "would", "will", "shall", "do", "does", "did", "has", "have", "had", "yet", "be", "fully", "physically", "immediately", "formally",
  "officially", "considered", "deemed", "treated", "as", "for", "of", "with", "any", "material", "lot", "parts", "physical", "operational", "final", "independent", "documented", "supplier", "further"]);

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const alt = words => [...new Set(words)].sort((a, b) => b.length - a.length).map(esc).join("|");
const canonPhrase = p => p.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
// Zero-width lookahead so overlapping idioms are all reported ("is safe" and "safe to use").
const fixedRe = list => new RegExp(`(?:^| )(?=(${alt(list.map(canonPhrase))})(?: |$))`, "g");

/** Litotes / double-negation release intent ("no reason not to ship", "mistake not to release"). */
const LITOTES_RELEASE = [
  /\bno\s+reason\s+not\s+to\b.{0,48}\b(?:ship|release|use|dispatch|send|deliver|approve|proceed)\b/,
  /\bmistake\s+not\s+to\b.{0,48}\b(?:ship|release|use|dispatch|send|deliver|approve)\b/,
  /\bcannot\s+justify\s+not\b.{0,48}\b(?:ship|release|use|using|dispatch|send)\b/,
  /\b(?:wrong|hard|difficult)\s+not\s+to\b.{0,48}\b(?:ship|release|use|dispatch|send)\b/,
  /\bwould\s+be\s+(?:a\s+)?mistake\s+not\s+to\b/
];
/** Idiomatic release / handoff outside verb-object grammar (incl. Spanish liberar). */
const IDIOMATIC_RELEASE = [
  /\bwaive\b.{0,32}\bhold\b/,
  /\blet\b.{0,24}\b(?:the\s+)?(?:bars?|material|lot|parts?|titanium)\b.{0,24}\bgo\b/,
  /\bhand\b.{0,24}\b(?:the\s+)?(?:titanium|material|lot|bars?)\b.{0,24}\bover\b/,
  /\bfree\s+up\b.{0,32}\blot\b/,
  /\bstart\s+cutting\b/,
  /\bproceed\s+with\s+cutting\b/,
  /\bgo\s+ahead\s+and\s+machine\b/,
  /\bmachine\s+the\s+(?:bars?|lot|material|parts?)\b/,
  /\brun\s+the\s+program\b.{0,32}\b(?:bars?|lot|parts?|tonight|now)\b/,
  /\blibera(?:r|ndo|do)\b.{0,40}\b(?:el\s+)?material\b/i,
  /\brilascia(?:re|mo|te|to)?\b.{0,40}\b(?:il\s+)?material/i,
  /\bfreigeb(?:en|e)\b.{0,40}\bmaterial/i,
  /\blib[eé]rer?\b.{0,40}\b(?:le\s+)?mat[eé]riau/i,
  /\b(?:bars?|material)\b.{0,24}\bto\s+the\s+floor\b/
];

const RE_FIXED = [[fixedRe(FIXED_RELEASE), "release"], [fixedRe(FIXED_COMPLIANCE), "compliance"], [fixedRe(FIXED_SAFETY), "safety"], [fixedRe(FIXED_COMMITMENT), "commitment"]];
const VERB_SET = new Set(RELEASE_VERBS);
const OBJECT_SET = new Set(RELEASE_OBJECTS);
const STATE_SET = new Set(STATE_WORDS);
const AUX_SET = new Set(OBJECT_AUX);
const LIST_JOINERS = new Set(["or", "and", "nor"]);
const NOUN_COMPOUND_BREAKS = new Set(["plan", "plans", "option", "options", "estimate", "cost", "costs", "schedule", "record", "records"]);

/** Normalize contractions in canonical text ("don t" → "do not", "can t" → "cannot"). */
function deContract(s) {
  return s.replace(/\bcan t\b/g, "cannot").replace(/\bwon t\b/g, "will not").replace(/\b([a-z]+)n t\b/g, "$1 not").replace(/\bdont\b/g, "do not").replace(/\bnonconform/g, "non conform").replace(/\bnon(?=compliant|conforming|conformant)/g, "non ");
}

function negatedAt(tokens, startIdx) {
  for (let i = startIdx - 1, seen = 0; i >= 0 && seen < 8; i--, seen++) {
    const t = tokens[i];
    if (NEGATORS.has(t)) {
      const next = tokens[i + 1];
      if (next && NOT_A_NEGATION_AFTER.has(next)) return false;
      // "no" negates only an immediately following claim word ("no release", "no guarantee"), never "No doubt, …"
      if (t === "no" && i + 1 !== startIdx) return false;
      return true;
    }
    // A coordinated verb list shares its negation: "never approve, authorize, or release material".
    if (SKIP_BACK.has(t) || LIST_JOINERS.has(t) || VERB_SET.has(t)) continue;
    return false;
  }
  return false;
}

function scanVariant(raw) {
  const s = deContract(raw);
  const tokens = s.split(" ");
  const hits = [];
  const push = (kind, rule, phrase, tIdx) => hits.push({ kind, rule, phrase, negated: negatedAt(tokens, tIdx) });
  // ACTION: every verb position independently (no overlap shadowing), object within 4 tokens.
  tokens.forEach((verb, i) => {
    if (!VERB_SET.has(verb)) return;
    for (let j = i + 1; j <= Math.min(tokens.length - 1, i + 4); j++) {
      const obj = tokens[j];
      if (NOUN_COMPOUND_BREAKS.has(obj)) break;
      if (!OBJECT_SET.has(obj)) continue;
      if (NEAR_ONLY_OBJECTS.has(obj) && j !== i + 1) continue;
      if (WEAK_VERBS.has(verb)) {
        const base = weakBase(verb);
        if (!base || !WEAK_VERB_OBJECTS[base].includes(obj)) continue;
      }
      push("release", "action", tokens.slice(i, j + 1).join(" "), i);
      break;
    }
    // weak verbs whose "object" is a fixed particle ("sign off", "put into production")
    if (WEAK_VERBS.has(verb)) {
      const base = weakBase(verb);
      const nxt = tokens.slice(i + 1, i + 3);
      if (base === "sign" && nxt[0] === "off") push("release", "action", `${verb} off`, i);
      if (base === "put" && nxt.some(t => t === "production" || t === "service")) push("release", "action", `${verb} ${nxt.join(" ")}`, i);
    }
  });
  // STATE: object … (aux){0,5} state-word ("the lot has now been fully released")
  tokens.forEach((w, k) => {
    if (!STATE_SET.has(w)) return;
    for (let i = k - 1, n = 0; i >= 0 && n < 6; i--, n++) {
      const t = tokens[i];
      if (OBJECT_SET.has(t) && !NEAR_ONLY_OBJECTS.has(t) && t !== "hold" && t !== "holds") { push("release", "state", tokens.slice(i, k + 1).join(" "), k); return; }
      if (!AUX_SET.has(t) && !["the", "a", "this", "that", "these", "those", "titanium", "incoming", "replacement", "substitute"].includes(t)) return;
    }
  });
  for (const [re, kind] of RE_FIXED) {
    re.lastIndex = 0;
    for (const m of s.matchAll(re)) {
      const at = m.index + (m[0].startsWith(" ") ? 1 : 0);
      push(kind, "fixed", m[1], s.slice(0, at).split(" ").filter(Boolean).length);
    }
  }
  for (const re of LITOTES_RELEASE) {
    if (re.test(s)) push("release", "litotes", s.match(re)?.[0]?.trim() || "litotes-release", tokens.length);
  }
  for (const re of IDIOMATIC_RELEASE) {
    if (re.test(s)) push("release", "idiom", s.match(re)?.[0]?.trim() || "idiomatic-release", tokens.length);
  }
  return hits;
}

/**
 * Detect release / compliance / safety / commitment claims.
 * Returns every hit (with `negated`) across all canonical variants, de-duplicated.
 */
export function detectClaimPhrases(text) {
  const seen = new Map();
  for (const v of screeningVariants(text)) {
    for (const h of scanVariant(v)) {
      const key = `${h.kind}|${h.phrase}|${h.negated}`;
      if (!seen.has(key)) seen.set(key, h);
    }
  }
  return [...seen.values()];
}

/** Only the affirmative (non-negated) hits. */
export function affirmativeClaims(text, kinds = ["release", "compliance", "safety", "commitment"]) {
  return detectClaimPhrases(text).filter(h => !h.negated && kinds.includes(h.kind));
}
