/**
 * Persistence + on-demand verification for the audit ledger.
 * - Ledger lines: data/audit-ledger.jsonl (HMAC-keyed entries).
 * - Head anchor:  data/audit-ledger.anchor.json = {length, tip, mac} rewritten on every append;
 *   detects truncation / tail deletion and entries appended by anyone without the key.
 * - Key: LEDGER_HMAC_KEY (>= 32 chars) or a random key created once at LEDGER_HMAC_KEY_PATH
 *   (default: sibling of the ledger directory, `.forgefront-ledger-key`, mode 0600) — never
 *   inside the ledger directory, so write access to the ledger alone cannot forge.
 * - verifyPersistedLedger() RE-READS the file from disk and checks chain, MACs, the anchor
 *   and the server's in-memory head — so edits made while the server runs are detected.
 */
import { open, readFile, mkdir, appendFile, writeFile, rename, chmod } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { randomBytes, createHmac } from "node:crypto";
import { createLedger, verifyLedger, sealEntry } from "./audit-ledger.mjs";

const DEFAULT_PATH = fileURLToPath(new URL("../data/audit-ledger.jsonl", import.meta.url));

export function ledgerPath() {
  return process.env.AUDIT_LEDGER_PATH || DEFAULT_PATH;
}
export const anchorPathFor = path => path.replace(/\.jsonl$/, "") + ".anchor.json";
export const anchorPath = () => anchorPathFor(ledgerPath());
export const witnessPathFor = path => path.replace(/\.jsonl$/, "") + ".witness.jsonl";
export const witnessPath = () => witnessPathFor(ledgerPath());
/** Append-only notary chain signed with a SEPARATE secret (LEDGER_NOTARY_SECRET) — ledger HMAC key alone cannot forge. */
export const notaryPathFor = path => path.replace(/\.jsonl$/, "") + ".notary.jsonl";
export const notaryPath = () => notaryPathFor(ledgerPath());
/** Append-only export anchor (operator copies off-box); sibling of the ledger — never a shared global path. */
export const exportAnchorPathFor = path => {
  if (process.env.LEDGER_EXPORT_ANCHOR_PATH) return process.env.LEDGER_EXPORT_ANCHOR_PATH;
  return path.replace(/\.jsonl$/, "") + ".export.jsonl";
};
export const exportAnchorPath = () => exportAnchorPathFor(ledgerPath());
const exportMac = (key, length, tip) => createHmac("sha256", key).update(`export|${length}|${tip}`).digest("hex");
/**
 * Key file lives OUTSIDE the ledger directory so write access to the ledger + anchor
 * is not enough to forge.
 * - LEDGER_HMAC_KEY_PATH wins when set.
 * - Otherwise: parent of the ledger directory (data/audit-ledger.jsonl → <repo>/.forgefront-ledger-key).
 * - If the parent would be the filesystem root (flat /tmp/foo.jsonl paths used by tests), the key
 *   goes under os.tmpdir()/forgefront-ledger-keys/<ledger-basename>.key — still outside the
 *   ledger's own directory.
 */
const keyPath = () => {
  if (process.env.LEDGER_HMAC_KEY_PATH) return process.env.LEDGER_HMAC_KEY_PATH;
  const ledgerDir = dirname(ledgerPath());
  const parent = dirname(ledgerDir);
  if (parent && parent !== ledgerDir && parent !== "/" && parent !== "\\") {
    return join(parent, ".forgefront-ledger-key");
  }
  return join(tmpdir(), "forgefront-ledger-keys", `${basename(ledgerPath())}.key`);
};

let cachedKey = null;
let keySource = null;
export async function ledgerKey() {
  if (cachedKey) return cachedKey;
  const env = process.env.LEDGER_HMAC_KEY;
  if (env && env.length >= 32) { cachedKey = env; keySource = "env"; return cachedKey; }
  await mkdir(dirname(ledgerPath()), { recursive: true });
  try {
    cachedKey = (await readFile(keyPath(), "utf8")).trim();
    keySource = "local-key-file";
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    cachedKey = randomBytes(32).toString("hex");
    await mkdir(dirname(keyPath()), { recursive: true });
    await writeFile(keyPath(), cachedKey + "\n", { mode: 0o600, flag: "wx" }).catch(async e => {
      if (e?.code === "EEXIST") cachedKey = (await readFile(keyPath(), "utf8")).trim();
      else throw e;
    });
    await chmod(keyPath(), 0o600).catch(() => {});
    keySource = "local-key-file";
  }
  return cachedKey;
}
export const ledgerKeySource = () => keySource;
export function resetLedgerKeyForTests() { cachedKey = null; keySource = null; }

const notarySecretPath = () => {
  if (process.env.LEDGER_NOTARY_SECRET_PATH) return process.env.LEDGER_NOTARY_SECRET_PATH;
  const kp = keyPath();
  const parent = dirname(kp);
  return join(parent, ".forgefront-ledger-notary-secret");
};

let cachedNotary = null;
let notarySource = null;
export async function ledgerNotarySecret() {
  if (cachedNotary) return cachedNotary;
  const env = process.env.LEDGER_NOTARY_SECRET;
  if (env && env.length >= 32) { cachedNotary = env; notarySource = "env"; return cachedNotary; }
  try {
    cachedNotary = (await readFile(notarySecretPath(), "utf8")).trim();
    notarySource = "local-notary-file";
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    cachedNotary = randomBytes(32).toString("hex");
    await mkdir(dirname(notarySecretPath()), { recursive: true });
    await writeFile(notarySecretPath(), cachedNotary + "\n", { mode: 0o600, flag: "wx" }).catch(async e => {
      if (e?.code === "EEXIST") cachedNotary = (await readFile(notarySecretPath(), "utf8")).trim();
      else throw e;
    });
    await chmod(notarySecretPath(), 0o600).catch(() => {});
    notarySource = "local-notary-file";
  }
  return cachedNotary;
}
export const ledgerNotarySource = () => notarySource;
export function resetLedgerNotaryForTests() { cachedNotary = null; notarySource = null; }

const anchorMac = (key, length, tip) => createHmac("sha256", key).update(`anchor|${length}|${tip}`).digest("hex");
export const notaryMac = (secret, length, tip) => createHmac("sha256", secret).update(`notary|${length}|${tip}`).digest("hex");

async function readLines(path) {
  try {
    const raw = await readFile(path, "utf8");
    return raw.split("\n").filter(Boolean);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function readAnchor(path = anchorPath()) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch (error) {
    if (error?.code === "ENOENT") return null;
    return { corrupt: true };
  }
}

/**
 * Re-read + verify from disk. `memory` = {length, tip} the running server expects.
 * `opts.path` verifies a COPY of the ledger (and its sibling anchor) with the same key — used by
 * the "Prove it" judge panel so the live ledger is never modified.
 */
export async function verifyPersistedLedger(memory = null, opts = {}) {
  const key = await ledgerKey();
  const ledger = createLedger();
  const checkedAt = new Date().toISOString();
  const path = opts.path || ledgerPath();
  let lines;
  try { lines = await readLines(path); } catch { return { ok: false, reason: "UNREADABLE", checkedAt }; }
  for (const [i, line] of lines.entries()) {
    try { ledger.entries.push(JSON.parse(line)); } catch { return { ok: false, reason: "MALFORMED_LINE", index: i, checkedAt, length: lines.length }; }
  }
  ledger.tip = ledger.entries.at(-1)?.entry_hash || null;
  const proof = verifyLedger(ledger, { key });
  if (!proof.ok) return { ...proof, checkedAt, ledger };
  const anchor = await readAnchor(opts.path ? anchorPathFor(opts.path) : anchorPath());
  if (ledger.entries.length || anchor) {
    if (!anchor || anchor.corrupt) return { ok: false, reason: "ANCHOR_MISSING", checkedAt, length: proof.length, ledger };
    if (anchor.mac !== anchorMac(key, anchor.length, anchor.tip)) return { ok: false, reason: "ANCHOR_MAC_INVALID", checkedAt, length: proof.length, ledger };
    if (anchor.length !== proof.length || anchor.tip !== proof.tip) return { ok: false, reason: proof.length < anchor.length ? "TRUNCATED" : "ANCHOR_MISMATCH", checkedAt, length: proof.length, ledger };
  }
  if (memory && (memory.length !== proof.length || memory.tip !== proof.tip)) {
    return { ok: false, reason: proof.length < memory.length ? "TRUNCATED_WHILE_RUNNING" : "DIVERGED_FROM_MEMORY", checkedAt, length: proof.length, ledger };
  }
  const wPath = opts.path ? witnessPathFor(opts.path) : witnessPath();
  const witnessLines = await readLines(wPath).catch(() => []);
  if (witnessLines.length) {
    let witness;
    try { witness = JSON.parse(witnessLines.at(-1)); } catch { witness = { corrupt: true }; }
    if (!witness.corrupt && witness.length > proof.length) {
      return { ok: false, reason: "WITNESS_ROLLBACK", checkedAt, length: proof.length, ledger };
    }
    if (!witness.corrupt && witness.length === proof.length && witness.tip && witness.tip !== proof.tip) {
      return { ok: false, reason: "WITNESS_TIP_MISMATCH", checkedAt, length: proof.length, ledger };
    }
  }
  if (proof.length) {
    const notarySecret = await ledgerNotarySecret();
    const nPath = opts.path ? notaryPathFor(opts.path) : notaryPath();
    const notaryLines = await readLines(nPath).catch(() => []);
    if (!notaryLines.length) {
      return { ok: false, reason: "NOTARY_MISSING", checkedAt, length: proof.length, ledger };
    }
    let notary;
    try { notary = JSON.parse(notaryLines.at(-1)); } catch { notary = { corrupt: true }; }
    if (notary.corrupt || notary.length !== proof.length || notary.tip !== proof.tip
      || notary.mac !== notaryMac(notarySecret, proof.length, proof.tip)) {
      return { ok: false, reason: "NOTARY_MISMATCH", checkedAt, length: proof.length, ledger };
    }
  }
  const ePath = opts.path ? exportAnchorPathFor(opts.path) : exportAnchorPath();
  const exportLines = await readLines(ePath).catch(() => []);
  if (exportLines.length) {
    let exportAnchor;
    try { exportAnchor = JSON.parse(exportLines.at(-1)); } catch { exportAnchor = { corrupt: true }; }
    if (!exportAnchor.corrupt) {
      if (exportAnchor.length > proof.length) {
        return { ok: false, reason: "EXPORT_ANCHOR_ROLLBACK", checkedAt, length: proof.length, ledger };
      }
      if (exportAnchor.length === proof.length && exportAnchor.tip && exportAnchor.tip !== proof.tip) {
        return { ok: false, reason: "EXPORT_ANCHOR_TIP_MISMATCH", checkedAt, length: proof.length, ledger };
      }
      if (exportAnchor.mac !== exportMac(key, exportAnchor.length, exportAnchor.tip)) {
        return { ok: false, reason: "EXPORT_ANCHOR_MAC_INVALID", checkedAt, length: proof.length, ledger };
      }
    }
  }
  return { ok: true, tip: proof.tip, length: proof.length, keyed: true, anchored: true, notarized: true, exportAnchored: exportLines.length > 0, checkedAt, ledger };
}

export async function loadPersistedLedger() {
  const result = await verifyPersistedLedger();
  const ledger = result.ledger || createLedger();
  const { ledger: _omit, ...proof } = result;
  return { ledger, tampered: !result.ok, proof };
}

export async function appendPersistedEntry(ledger, entry) {
  const key = await ledgerKey();
  const stored = sealEntry(ledger.tip, entry, { key });
  const path = ledgerPath();
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(stored)}\n`, { encoding: "utf8" });
  const handle = await open(path, "a");
  try { await handle.sync(); } finally { await handle.close(); }
  ledger.entries.push(stored);
  ledger.tip = stored.entry_hash;
  const length = ledger.entries.length;
  const tmp = `${anchorPath()}.tmp`;
  await writeFile(tmp, JSON.stringify({ length, tip: stored.entry_hash, mac: anchorMac(key, length, stored.entry_hash), at: stored.at }) + "\n");
  await rename(tmp, anchorPath());
  const wPath = witnessPath();
  await appendFile(wPath, `${JSON.stringify({ length, tip: stored.entry_hash, mac: anchorMac(key, length, stored.entry_hash), at: stored.at })}\n`, { encoding: "utf8" });
  const notarySecret = await ledgerNotarySecret();
  const nPath = notaryPath();
  await appendFile(nPath, `${JSON.stringify({ length, tip: stored.entry_hash, mac: notaryMac(notarySecret, length, stored.entry_hash), at: stored.at })}\n`, { encoding: "utf8" });
  const ePath = exportAnchorPath();
  await mkdir(dirname(ePath), { recursive: true });
  await appendFile(ePath, `${JSON.stringify({ length, tip: stored.entry_hash, mac: exportMac(key, length, stored.entry_hash), at: stored.at })}\n`, { encoding: "utf8" });
  return stored;
}
