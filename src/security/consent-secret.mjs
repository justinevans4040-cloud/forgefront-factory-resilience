import { randomBytes } from "node:crypto";

/**
 * HMAC secret for consent tokens and session signatures.
 * - CONSENT_HMAC_SECRET (>= 32 chars AND not a known-dev fallback) wins.
 * - Otherwise a random 256-bit secret is generated once per server process.
 * - NODE_ENV=production without a configured strong secret refuses to start.
 * - A configured known-dev fallback (the old hard-coded string or obvious toys)
 *   is treated as WEAK: the server refuses to start in production, and outside
 *   production it only starts when ALLOW_WEAK_CONSENT_SECRET=1 is set explicitly;
 *   health then reports consentSecretStrength=weak so operators see the gap.
 */
function canonicalDevSecret(s) {
  return String(s || "").normalize("NFKC").trim().toLowerCase().replace(/[!?.]+$/g, "");
}

const KNOWN_DEV_SECRETS = new Set([
  "local-dev-consent-secret-not-for-production",
  "dev-secret-not-for-production-use-only!!",
  "changemechangemechangemechangeme12",
  "test-consent-hmac-secret-32chars!!"
].map(canonicalDevSecret));

let ephemeral = null;
let warnedWeak = false;

function isKnownDev(s) {
  return KNOWN_DEV_SECRETS.has(canonicalDevSecret(s));
}

export function consentHmacSecret() {
  const configured = process.env.CONSENT_HMAC_SECRET;
  if (configured && configured.length >= 32 && !isKnownDev(configured)) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CONSENT_HMAC_SECRET_REQUIRED");
  }
  if (configured && (configured.length < 32 || isKnownDev(configured))) {
    if (process.env.ALLOW_WEAK_CONSENT_SECRET !== "1") {
      throw new Error("CONSENT_HMAC_SECRET_WEAK");
    }
    if (!warnedWeak) {
      console.error("[consent] WEAK CONSENT_HMAC_SECRET in use (ALLOW_WEAK_CONSENT_SECRET=1). Not for shared environments.");
      warnedWeak = true;
    }
    return configured;
  }
  if (!ephemeral) ephemeral = randomBytes(32).toString("hex");
  return ephemeral;
}

/** "configured" | "ephemeral-random" | "too-short" | "known-dev-fallback" */
export function consentSecretSource() {
  const s = process.env.CONSENT_HMAC_SECRET;
  if (!s) return "ephemeral-random";
  if (isKnownDev(s)) return "known-dev-fallback";
  if (s.length >= 32) return "configured";
  return "too-short";
}

export function isWeakConsentSecret() {
  const src = consentSecretSource();
  return src === "too-short" || src === "known-dev-fallback";
}

/** Reset ephemeral + warning flag between tests. */
export function resetConsentSecretForTests() {
  ephemeral = null;
  warnedWeak = false;
}
