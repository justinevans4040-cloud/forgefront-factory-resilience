/**
 * Canonical scenario fingerprint shared by browser and server (no node:* imports).
 * Consent approvals are bound to this hash: any change to the certificate text,
 * operator assumptions, or injected disruptions produces a different hash and
 * invalidates a prior approval on the server.
 */
import { sha256Hex } from "./sha256.mjs";

/** Every engine assumption that changes recovery plan cost or timing (must match server/browser). */
export const ASSUMPTION_KEYS = [
  "substituteStock", "expeditedLotHours", "machineOutageHours",
  "reissueHours", "hybridRemainderHours", "expediteFee", "hybridFee",
  "substitutionPremiumPerUnit", "latenessCostPerHour"
];
export const DISRUPTION_KEYS = ["machineOutageHours", "substituteLotQuestioned"];

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    const v = obj?.[key];
    if (v === undefined || v === null || v === "") continue;
    out[key] = typeof v === "boolean" ? v : Number.isFinite(Number(v)) ? Number(v) : String(v);
  }
  return out;
}

export function canonicalScenarioInputs({ certificateText = "", assumptions = {}, disruptions = {} } = {}) {
  const dis = pick(disruptions, DISRUPTION_KEYS);
  if (!dis.substituteLotQuestioned) delete dis.substituteLotQuestioned;
  if (!dis.machineOutageHours) delete dis.machineOutageHours;
  return {
    certificateText: String(certificateText).replace(/\r\n/g, "\n").trim(),
    assumptions: pick(assumptions, ASSUMPTION_KEYS),
    disruptions: dis
  };
}

export function scenarioHash(inputs) {
  const c = canonicalScenarioInputs(inputs);
  // Keys are emitted in a fixed order so browser and server agree byte-for-byte.
  return sha256Hex(JSON.stringify([c.certificateText, ASSUMPTION_KEYS.map(k => c.assumptions[k] ?? null), DISRUPTION_KEYS.map(k => c.disruptions[k] ?? null)]));
}
