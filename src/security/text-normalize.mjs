/**
 * Adversarial text normalization for screening (browser-safe; no node:* imports).
 *
 * Every screen in this build (model-output release/compliance screen, claim-checker
 * qualitative grounding, supplier-text injection quarantine, operator-name validation)
 * runs on the SAME canonical form so a bypass that works on one cannot work on another:
 *
 *   1. Unicode NFKC (full-width, ligatures, compatibility forms → base letters)
 *   2. strip invisible / bidi / variation-selector / soft-hyphen code points
 *   3. NFKD + drop combining marks (accents, zalgo)
 *   4. fold Cyrillic / Greek / Armenian / IPA confusables to Latin
 *   5. lowercase
 *   6. leetspeak folding inside mixed letter/digit tokens (r3l3a$e → release, g00d → good)
 *   7. punctuation / symbols → single spaces (re-lease, r.e.l.e.a.s.e)
 *   8. re-join letter-spaced words (r e l e a s e → release)
 *
 * screeningVariants() returns more than one canonical string when a character is
 * ambiguous (leet "1" → i or l), and screens check ALL variants.
 */

const INVISIBLE = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]/g;

// Visual confusables → Latin (upper- and lower-case forms; checked before and after lowercasing).
const CONFUSABLE_PAIRS = [
  // Cyrillic
  ["а", "a"], ["А", "a"], ["в", "b"], ["В", "b"], ["с", "c"], ["С", "c"], ["ԁ", "d"], ["е", "e"], ["Е", "e"], ["ё", "e"], ["Ё", "e"],
  ["һ", "h"], ["Н", "h"], ["і", "i"], ["І", "i"], ["ї", "i"], ["Ї", "i"], ["ј", "j"], ["Ј", "j"], ["к", "k"], ["К", "k"], ["ӏ", "l"], ["Ӏ", "l"],
  ["м", "m"], ["М", "m"], ["о", "o"], ["О", "o"], ["р", "p"], ["Р", "p"], ["ԛ", "q"], ["г", "r"], ["ѕ", "s"], ["Ѕ", "s"], ["т", "t"], ["Т", "t"],
  ["у", "y"], ["У", "y"], ["ү", "y"], ["х", "x"], ["Х", "x"], ["ԝ", "w"], ["Ԝ", "w"], ["ѵ", "v"], ["п", "n"], ["ө", "o"], ["ҽ", "e"], ["Ь", "b"],
  // Greek
  ["α", "a"], ["Α", "a"], ["β", "b"], ["Β", "b"], ["ε", "e"], ["Ε", "e"], ["ζ", "z"], ["Ζ", "z"], ["η", "n"], ["Η", "h"], ["ι", "i"], ["Ι", "i"],
  ["κ", "k"], ["Κ", "k"], ["μ", "u"], ["Μ", "m"], ["ν", "v"], ["Ν", "n"], ["ο", "o"], ["Ο", "o"], ["ρ", "p"], ["Ρ", "p"], ["σ", "o"], ["ς", "s"],
  ["τ", "t"], ["Τ", "t"], ["υ", "u"], ["Υ", "y"], ["χ", "x"], ["Χ", "x"], ["ω", "w"], ["γ", "y"], ["ϲ", "c"], ["Ϲ", "c"], ["ϳ", "j"],
  // Armenian / IPA / Latin extended look-alikes
  ["ս", "u"], ["օ", "o"], ["ց", "g"], ["ɑ", "a"], ["ɡ", "g"], ["ɩ", "i"], ["ı", "i"], ["ȷ", "j"], ["ʀ", "r"], ["ʏ", "y"], ["ɴ", "n"], ["ʟ", "l"],
  ["ᴀ", "a"], ["ʙ", "b"], ["ᴄ", "c"], ["ᴅ", "d"], ["ᴇ", "e"], ["ɢ", "g"], ["ʜ", "h"], ["ᴊ", "j"], ["ᴋ", "k"], ["ᴍ", "m"], ["ᴏ", "o"], ["ᴘ", "p"],
  ["ꜱ", "s"], ["ᴛ", "t"], ["ᴜ", "u"], ["ᴠ", "v"], ["ᴡ", "w"], ["ᴢ", "z"], ["ℓ", "l"], ["ø", "o"], ["ð", "d"], ["þ", "p"], ["ß", "ss"], ["æ", "ae"], ["œ", "oe"]
];
const CONFUSABLES = new Map(CONFUSABLE_PAIRS);
const CONFUSABLE_RE = new RegExp(`[${CONFUSABLE_PAIRS.map(([k]) => k).join("")}]`, "gu");

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "6": "g", "7": "t", "8": "b", "9": "g", "@": "a", "$": "s", "!": "i", "|": "l", "+": "t", "€": "e", "£": "l" };
const LEET_ALT = { ...LEET, "1": "l", "!": "l" };

/** NFKC + invisible strip + accent strip + confusable fold + lowercase. Keeps punctuation/digits. */
export function foldText(text) {
  let s = String(text ?? "").normalize("NFKC").replace(INVISIBLE, "");
  s = s.normalize("NFKD").replace(/\p{M}+/gu, "");
  s = s.replace(CONFUSABLE_RE, ch => CONFUSABLES.get(ch) ?? ch).toLowerCase();
  s = s.replace(CONFUSABLE_RE, ch => CONFUSABLES.get(ch) ?? ch);
  // Invisible/ZWS strip can glue "release\u200bfor" → "releasefor". Re-split known verb+for joins
  // so the phrase grammar still sees "release for production".
  s = s.replace(/\b(release|approve|authorize|authorise|clear|ship|dispatch)(for|the|this|that|these|those|all)\b/g, "$1 $2");
  return s.normalize("NFKC");
}

function deLeet(folded, table) {
  // Only fold tokens that mix letters with leet characters; pure numbers ("30", "4735") are untouched.
  return folded.replace(/[^\s]+/g, tok => {
    if (!/[a-z]/.test(tok) || !/[013456789@$!|+€£]/.test(tok)) return tok;
    // Leave real identifiers / quantities alone: JOB-007, H-7713, AMS4928, PO-45892, 9.8h, 12%, $4735, Ti-6Al-4V.
    if (/^[a-z]{1,5}-[a-z0-9-]*\d[a-z0-9-]*[.,;:]?$/.test(tok) || /^[a-z]{2,5}\d{3,}[.,;:]?$/.test(tok) || /^\$?\d[\d,.]*(h|hrs?|%|x|k|m)?[.,;:]?$/.test(tok) || /^ti-6al-4v/.test(tok)) return tok;
    return tok.replace(/[013456789@$!|+€£]/g, c => table[c] ?? c);
  });
}

function collapseSpacedLetters(s) {
  // "r e l e a s e" / "r-e-l-e-a-s-e" (after punctuation → space) → "release". Needs ≥3 single letters in a row.
  return s.replace(/\b(?:[a-z] ){2,}[a-z]\b/g, m => m.replace(/ /g, ""));
}

const toWords = s => s.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

/** All canonical forms that a screen must check. */
export function screeningVariants(text) {
  const folded = foldText(text);
  const out = new Set();
  for (const table of [LEET, LEET_ALT]) {
    const words = toWords(deLeet(folded, table));
    out.add(words);
    out.add(collapseSpacedLetters(words));
  }
  return [...out].filter(Boolean);
}

/** Primary canonical form (first variant). */
export function canonicalText(text) {
  return screeningVariants(text)[0] || "";
}

/** True when text contains invisible/bidi controls or confusable characters (used to flag, not just fold). */
export function hasObfuscation(text) {
  const s = String(text ?? "");
  INVISIBLE.lastIndex = 0;
  CONFUSABLE_RE.lastIndex = 0;
  return INVISIBLE.test(s) || CONFUSABLE_RE.test(s.normalize("NFKC"));
}
