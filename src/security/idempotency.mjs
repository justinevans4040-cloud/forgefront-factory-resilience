/**
 * Idempotency keys for state-changing commands (approval confirm, Kanban move).
 *
 * - Key format: 8–128 chars of [A-Za-z0-9_.:-] sent as the `Idempotency-Key` header.
 *   When absent the server mints one and returns it, so every effect is still keyed.
 * - Scoped per session + command. Same key + same request fingerprint → the ORIGINAL
 *   response is replayed (no second effect, no second ledger entry). Same key + a
 *   different request → 422 IDEMPOTENCY_KEY_REUSED. Concurrent duplicate → 409 IN_FLIGHT.
 * - Entries live 24 h (bounded at 5,000).
 */
import { randomBytes } from "node:crypto";
import { sha256Hex } from "../sha256.mjs";

const KEY_RE = /^[A-Za-z0-9_.:-]{8,128}$/;
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

export const validIdempotencyKey = key => typeof key === "string" && KEY_RE.test(key);
export const mintIdempotencyKey = () => `srv-${randomBytes(12).toString("hex")}`;
export const fingerprintOf = value => sha256Hex(JSON.stringify(value));

export class IdempotencyStore {
  constructor() { this.rows = new Map(); }

  slot(sessionDigest, scope, key) { return `${sessionDigest}|${scope}|${key}`; }

  /** Begin a keyed command. Returns {state:"new"|"replay"|"conflict"|"in-flight", ...}. */
  begin(sessionDigest, scope, key, fingerprint, nowMs = Date.now()) {
    this.prune(nowMs);
    const id = this.slot(sessionDigest, scope, key);
    const row = this.rows.get(id);
    if (!row) {
      this.rows.set(id, { fingerprint, pending: true, at: nowMs });
      return { state: "new" };
    }
    if (row.fingerprint !== fingerprint) return { state: "conflict" };
    if (row.pending) return { state: "in-flight" };
    return { state: "replay", status: row.status, body: row.body, eventId: row.eventId || null };
  }

  /** Record the final response. Only successful (2xx) outcomes are pinned; failures release the key. */
  finish(sessionDigest, scope, key, status, body, eventId = null) {
    const id = this.slot(sessionDigest, scope, key);
    const row = this.rows.get(id);
    if (!row) return;
    if (status >= 200 && status < 300) Object.assign(row, { pending: false, status, body, eventId });
    else this.rows.delete(id);
  }

  prune(nowMs = Date.now()) {
    for (const [id, row] of this.rows) if (nowMs - row.at > TTL_MS) this.rows.delete(id);
    while (this.rows.size > MAX_ENTRIES) this.rows.delete(this.rows.keys().next().value);
  }

  get size() { return this.rows.size; }
}
