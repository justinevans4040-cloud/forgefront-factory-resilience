/**
 * Single-use consent nonce store (server-side).
 *
 * Every consumed consent nonce (the review token's jti) is appended to a JSONL file
 * with fsync-free synchronous append BEFORE the approval is granted, and the file is
 * reloaded at boot. A replayed token is therefore rejected (TOKEN_REPLAY) even after a
 * server restart. Entries are compacted at load once their token has expired (an expired
 * token is rejected by its own expiry check).
 *
 * Without a configured path (unit tests) the store is memory-only.
 */
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export class NonceStore {
  constructor(path = null) {
    this.path = path;
    this.used = new Map(); // jti -> expiresAt (unix s)
    this.loaded = false;
  }

  load(nowSec = Math.floor(Date.now() / 1000)) {
    this.loaded = true;
    if (!this.path) return this;
    let raw = "";
    try { raw = readFileSync(this.path, "utf8"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    let dropped = 0;
    for (const line of raw.split("\n").filter(Boolean)) {
      try {
        const row = JSON.parse(line);
        if (typeof row.jti !== "string") continue;
        if (Number(row.exp) < nowSec - 3600) { dropped++; continue; }
        this.used.set(row.jti, Number(row.exp));
      } catch { /* a torn final line is ignored; the ledger still records the acceptance */ }
    }
    if (dropped) this.compact();
    return this;
  }

  compact() {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, [...this.used].map(([jti, exp]) => JSON.stringify({ jti, exp })).join("\n") + (this.used.size ? "\n" : ""), { mode: 0o600 });
    renameSync(tmp, this.path);
  }

  has(jti) {
    if (!this.loaded) this.load();
    return this.used.has(jti);
  }

  /** Persist first, then mark used in memory. Throws if the write fails (consent then fails closed). */
  consume(jti, expiresAt) {
    if (!this.loaded) this.load();
    if (this.used.has(jti)) return false;
    if (this.path) {
      mkdirSync(dirname(this.path), { recursive: true });
      appendFileSync(this.path, JSON.stringify({ jti, exp: expiresAt, at: new Date().toISOString() }) + "\n", { mode: 0o600 });
    }
    this.used.set(jti, expiresAt);
    return true;
  }

  /** Seed from an external authoritative record (e.g. CONSENT_ACCEPTED ledger entries). */
  seed(jti, expiresAt = Number.MAX_SAFE_INTEGER) {
    if (!this.loaded) this.load();
    if (jti) this.used.set(jti, expiresAt);
  }

  get size() { return this.used.size; }
  clearMemory() { this.used.clear(); this.loaded = !this.path ? true : false; }
}

let defaultStore = new NonceStore(null);
export const nonceStore = () => defaultStore;
export function configureNonceStore(path) {
  defaultStore = new NonceStore(path).load();
  return defaultStore;
}
