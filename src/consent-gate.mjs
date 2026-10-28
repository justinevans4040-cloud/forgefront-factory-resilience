/**
 * Two-step operator consent (server-side only).
 *
 * Step 1 — review:  the server recomputes the plan from the submitted scenario
 *                   inputs, hashes it, and mints an HMAC-signed token bound to
 *                   {session, operator, planId, planHash, scenarioHash, expiry}.
 * Step 2 — confirm: the server recomputes the plan AGAIN from the inputs sent at
 *                   confirm time and checks every binding: signature, minted by
 *                   this process, same session, not expired, not replayed,
 *                   same plan hash, same scenario hash, exact typed phrase.
 *
 * Tokens are single-use (jti consumed on success) and expire (default 120 s).
 * Acceptance is a scenario-planning record only — operationalRelease is always false.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sha256Hex } from "./sha256.mjs";
import { consentHmacSecret } from "./security/consent-secret.mjs";
import { nonceStore } from "./security/nonce-store.mjs";

export const DEFAULT_TTL_SEC = 120;
/** Hard ceiling on how long a recorded scenario approval may live (consent envelope policy). */
export const MAX_APPROVAL_TTL_SEC = 15 * 60;
const mintedJtis = new Map(); // jti -> { sessionToken, expiresAt }

/**
 * Canonical plan PARAMETERS — everything the operator is consenting to, recomputed by the
 * server from the scenario inputs: cost, stock, schedule effect, every job allocation and
 * the assumptions the plan was computed under. Any drift changes the hash.
 */
export function planParameters(plan) {
  const a = plan.assumptions || {};
  return {
    id: plan.id,
    label: plan.label,
    estimatedCost: plan.estimatedCost,
    fee: plan.fee ?? null,
    stockUsed: plan.stockUsed,
    stockAvailable: plan.stockAvailable ?? null,
    conditionalJobs: plan.conditionalJobs,
    lateJobs: plan.lateJobs ?? null,
    incrementalLateHours: plan.incrementalLateHours ?? null,
    expectedReleaseHours: plan.expectedReleaseHours ?? null,
    allocations: (plan.allocations || []).map(x => [x.jobId, x.units, x.material, x.releaseHour, Boolean(x.conditional)]),
    assumptions: ["substituteStock", "expeditedLotHours", "hybridRemainderHours", "reissueHours", "machineOutageHours", "expediteFee", "hybridFee", "substitutionPremiumPerUnit", "latenessCostPerHour", "qualifiedStock"].map(k => [k, a[k] ?? null])
  };
}

export function hashPlan(plan) {
  return sha256Hex(JSON.stringify(planParameters(plan)));
}

const sessionDigest = sessionToken => sha256Hex(`session|${sessionToken}`).slice(0, 32);
const sign = payload => createHmac("sha256", consentHmacSecret()).update(payload).digest("hex");
const enc = value => encodeURIComponent(String(value));

export function mintReviewToken({ sessionToken, actor, planId, planHash, scenarioHash, ttlSec = DEFAULT_TTL_SEC, nowMs = Date.now() }) {
  if (!sessionToken || !actor || !planId || !planHash || !scenarioHash) throw new Error("CONSENT_MINT_FIELDS_REQUIRED");
  const jti = randomBytes(12).toString("hex");
  const issuedAt = Math.floor(nowMs / 1000);
  const expiresAt = issuedAt + ttlSec;
  const payload = [jti, sessionDigest(sessionToken), enc(actor), enc(planId), planHash, scenarioHash, issuedAt, expiresAt].join("|");
  mintedJtis.set(jti, { sessionToken, expiresAt });
  pruneMinted(nowMs);
  return { token: `${payload}|${sign(payload)}`, jti, planId, planHash, scenarioHash, actor, issuedAt, expiresAt, phrase: `APPROVE ${planId}` };
}

function pruneMinted(nowMs) {
  const now = Math.floor(nowMs / 1000);
  for (const [jti, row] of mintedJtis) if (row.expiresAt < now - 600) mintedJtis.delete(jti);
  if (mintedJtis.size > 5000) mintedJtis.delete(mintedJtis.keys().next().value);
}

export function parseConsentToken(token) {
  const parts = String(token || "").split("|");
  if (parts.length !== 9) return null;
  const [jti, sess, actor, planId, planHash, scenarioHash, issuedAt, expiresAt, sig] = parts;
  try {
    return { jti, sess, actor: decodeURIComponent(actor), planId: decodeURIComponent(planId), planHash, scenarioHash, issuedAt: Number(issuedAt), expiresAt: Number(expiresAt), sig, payload: parts.slice(0, 8).join("|") };
  } catch {
    return null;
  }
}

/** Verify step-2 confirmation. Every check below can fail independently. */
export function verifyConfirmToken(token, opts = {}) {
  const { sessionToken, planHash, scenarioHash, phrase, nowMs = Date.now() } = opts;
  const t = parseConsentToken(token);
  if (!t) return { ok: false, reason: "MALFORMED_TOKEN" };
  const a = Buffer.from(t.sig, "utf8");
  const b = Buffer.from(sign(t.payload), "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "BAD_SIGNATURE" };
  const store = opts.nonceStore || nonceStore();
  if (store.has(t.jti)) return { ok: false, reason: "TOKEN_REPLAY" };
  const minted = mintedJtis.get(t.jti);
  if (!minted) return { ok: false, reason: "TOKEN_UNKNOWN" };
  if (t.sess !== sessionDigest(sessionToken) || minted.sessionToken !== sessionToken) return { ok: false, reason: "SESSION_MISMATCH" };
  if (Math.floor(nowMs / 1000) > t.expiresAt) return { ok: false, reason: "TOKEN_EXPIRED" };
  if (t.scenarioHash !== scenarioHash) return { ok: false, reason: "SCENARIO_CHANGED" };
  if (t.planHash !== planHash) return { ok: false, reason: "PLAN_HASH_MISMATCH" };
  if (String(phrase || "").trim() !== `APPROVE ${t.planId}`) return { ok: false, reason: "PHRASE_MISMATCH" };
  // Persist the nonce BEFORE granting; a write failure throws and consent fails closed.
  if (!store.consume(t.jti, t.expiresAt)) return { ok: false, reason: "TOKEN_REPLAY" };
  mintedJtis.delete(t.jti);
  return { ok: true, jti: t.jti, actor: t.actor, planId: t.planId, planHash: t.planHash, scenarioHash: t.scenarioHash, sessionDigest: t.sess };
}

/* ---------------- Consent envelope (the recorded approval) ---------------- */
const canonicalEnvelope = env => JSON.stringify([env.v, env.planId, env.planParamHash, env.scenarioHash, env.nonce, env.operator, env.sessionDigest, env.issuedAt, env.expiresAt, env.idempotencyKey, env.operationalRelease]);

/**
 * Seal the approval envelope: planId + server-recomputed plan-parameter hash + scenario hash +
 * single-use nonce + operator/session binding + TTL (clamped to MAX_APPROVAL_TTL_SEC), HMAC-signed.
 */
export function sealApprovalEnvelope({ planId, planParamHash, scenarioHash, nonce, operator, sessionToken, ttlSec, idempotencyKey = null, nowMs = Date.now() }) {
  const ttl = Math.max(1, Math.min(MAX_APPROVAL_TTL_SEC, Math.floor(Number(ttlSec) || MAX_APPROVAL_TTL_SEC)));
  const issuedAt = Math.floor(nowMs / 1000);
  const env = { v: 1, planId, planParamHash, scenarioHash, nonce, operator, sessionDigest: sessionDigest(sessionToken), issuedAt, expiresAt: issuedAt + ttl, ttlSec: ttl, idempotencyKey, operationalRelease: false };
  return { ...env, mac: sign(`envelope|${canonicalEnvelope(env)}`) };
}

/** Verify an approval envelope against the current session and scenario. */
export function verifyApprovalEnvelope(env, { sessionToken, scenarioHash, nowMs = Date.now() } = {}) {
  if (!env || env.v !== 1 || typeof env.mac !== "string") return { ok: false, reason: "ENVELOPE_MALFORMED" };
  const expected = sign(`envelope|${canonicalEnvelope(env)}`);
  const a = Buffer.from(env.mac, "utf8"), b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "ENVELOPE_MAC_INVALID" };
  if (env.expiresAt - env.issuedAt > MAX_APPROVAL_TTL_SEC) return { ok: false, reason: "ENVELOPE_TTL_EXCEEDS_POLICY" };
  if (sessionToken && env.sessionDigest !== sessionDigest(sessionToken)) return { ok: false, reason: "SESSION_MISMATCH" };
  if (Math.floor(nowMs / 1000) >= env.expiresAt) return { ok: false, reason: "APPROVAL_EXPIRED" };
  if (scenarioHash && env.scenarioHash !== scenarioHash) return { ok: false, reason: "SCENARIO_CHANGED" };
  if (env.operationalRelease !== false) return { ok: false, reason: "RELEASE_FORBIDDEN" };
  return { ok: true };
}

export { sessionDigest };

export function resetConsentStoreForTests() {
  nonceStore().clearMemory();
  mintedJtis.clear();
}
