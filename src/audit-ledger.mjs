/**
 * Hash-chained, tamper-evident audit ledger (server-side).
 * - entry_hash = SHA-256 over {at, prev_hash, actor, action, detail}; prev_hash links entries.
 * - When a key is supplied, each entry also carries mac = HMAC-SHA256(key, entry_hash), so a
 *   rewritten chain with recomputed hashes fails verification unless the key is also stolen.
 * Limits (documented, not hidden): this is tamper-EVIDENT, not tamper-proof. Anyone holding
 * the key and write access can forge; truncation is caught by the head anchor and in-memory
 * head, but a coordinated rollback of ledger + anchor to an older consistent pair is not.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { sha256Hex } from "./sha256.mjs";

export const GENESIS = "0".repeat(64);

export function createLedger() {
  return { tip: null, entries: [] };
}

export const entryMac = (key, entryHash) => createHmac("sha256", key).update(`ledger|${entryHash}`).digest("hex");

/** Hashed body. `event` (typed envelope: event_id, trace_id, schema, kind, parent, idempotency key) is covered by the hash when present. */
function bodyOf(row) {
  const body = { at: row.at, prev_hash: row.prev_hash, actor: row.actor, action: row.action, detail: row.detail };
  if (row.event !== undefined) body.event = row.event;
  return body;
}

export function sealEntry(prevHash, entry, { key, at = new Date().toISOString() } = {}) {
  const body = { at, prev_hash: prevHash || GENESIS, actor: entry.actor, action: entry.action, detail: entry.detail };
  if (entry.event !== undefined) body.event = entry.event;
  const entry_hash = sha256Hex(JSON.stringify(body));
  return key ? { ...body, entry_hash, mac: entryMac(key, entry_hash) } : { ...body, entry_hash };
}

export function appendLedgerEntry(ledger, entry, opts = {}) {
  const stored = sealEntry(ledger.tip, entry, opts);
  ledger.entries.push(stored);
  ledger.tip = stored.entry_hash;
  return stored;
}

function macOk(key, row) {
  if (typeof row.mac !== "string") return false;
  const a = Buffer.from(row.mac, "utf8");
  const b = Buffer.from(entryMac(key, row.entry_hash), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyLedger(ledger, { key } = {}) {
  if (!key && ledger.entries.length) {
    return { ok: false, reason: "KEY_REQUIRED", length: ledger.entries.length };
  }
  let prev = GENESIS;
  let index = 0;
  for (const row of ledger.entries) {
    if (row.prev_hash !== prev) return { ok: false, at: row.at, index, reason: "CHAIN_BROKEN", length: ledger.entries.length };
    if (sha256Hex(JSON.stringify(bodyOf(row))) !== row.entry_hash) return { ok: false, at: row.at, index, reason: "HASH_MISMATCH", length: ledger.entries.length };
    if (key && !macOk(key, row)) return { ok: false, at: row.at, index, reason: "MAC_INVALID", length: ledger.entries.length };
    prev = row.entry_hash;
    index++;
  }
  return { ok: true, tip: ledger.entries.length ? prev : null, length: ledger.entries.length, keyed: Boolean(key) };
}
