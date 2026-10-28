import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { consentHmacSecret } from "./consent-secret.mjs";
import { foldText, hasObfuscation } from "./text-normalize.mjs";

const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const MAX_SESSIONS = 500;

/**
 * Operator display names (bound into consent tokens and the ledger).
 * - 1..64 chars after trim
 * - letters / marks / digits / spaces / .'- only (no HTML, no control chars)
 * - reserved names (system, admin, root, …) rejected — including confusable lookalikes
 */
const RESERVED = new Set([
  "system", "admin", "administrator", "root", "operator", "forgefront", "server",
  "service", "daemon", "null", "undefined", "anonymous", "guest",
  "localhost", "internal", "superuser", "sudo"
]);
const NAME_OK = /^[\p{L}\p{M}][\p{L}\p{M}\p{N} .'\-]{0,62}[\p{L}\p{M}\p{N}.]?$/u;

export function validateOperatorName(raw) {
  const name = String(raw ?? "").normalize("NFKC").trim();
  if (!name) return { ok: false, reason: "OPERATOR_REQUIRED" };
  if (name.length > 64) return { ok: false, reason: "OPERATOR_TOO_LONG" };
  if (/[<>&"`\\/;{}|]/.test(name) || /[\u0000-\u001f\u007f]/.test(name) || /\s{2,}/.test(name)) {
    return { ok: false, reason: "OPERATOR_INVALID_CHARS" };
  }
  if (!NAME_OK.test(name)) return { ok: false, reason: "OPERATOR_INVALID_CHARS" };
  const folded = foldText(name);
  const compact = folded.replace(/[\s.'\-]+/g, "");
  if (RESERVED.has(folded) || RESERVED.has(compact) || RESERVED.has(folded.replace(/\s+/g, " "))) {
    return { ok: false, reason: "OPERATOR_RESERVED" };
  }
  // Confusable / mixed-script attempt to look like a reserved name
  if (hasObfuscation(String(raw ?? "")) && (RESERVED.has(folded) || RESERVED.has(compact))) {
    return { ok: false, reason: "OPERATOR_RESERVED" };
  }
  if (!/[a-z0-9]/i.test(folded)) return { ok: false, reason: "OPERATOR_INVALID_CHARS" };
  return { ok: true, operator: name.slice(0, 64) };
}

function pruneSessions(now = Date.now()) {
  for (const [token, row] of sessions) if (now - row.at > SESSION_TTL_MS) sessions.delete(token);
  while (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
}

function sessionKey() {
  return consentHmacSecret();
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost", "0:0:0:0:0:0:0:1"]);

export function isLoopbackIp(ip) {
  const n = String(ip || "").replace(/^::ffff:/i, "").toLowerCase();
  return LOOPBACK.has(n) || n.startsWith("127.");
}

/**
 * Issue a session only to a loopback client. The demo binds to 127.0.0.1, so a
 * non-loopback peer means the Host / proxy path was forged; refuse rather than
 * mint a token that could be replayed from elsewhere.
 * Returns {ok:true, sessionToken, csrfToken, expiresInSec, clientIp} or {ok:false, reason}.
 */
export function createOperatorSession(clientIp) {
  const ip = String(clientIp || "").replace(/^::ffff:/i, "") || "127.0.0.1";
  if (!isLoopbackIp(ip)) return { ok: false, reason: "LOOPBACK_REQUIRED" };
  pruneSessions();
  const sessionToken = randomBytes(24).toString("hex");
  const csrfToken = randomBytes(24).toString("hex");
  const sig = createHmac("sha256", sessionKey()).update(`${sessionToken}|${csrfToken}|${ip}`).digest("hex");
  sessions.set(sessionToken, { csrfToken, clientIp: ip, sig, at: Date.now(), operator: null });
  return { ok: true, sessionToken, csrfToken, expiresInSec: Math.floor(SESSION_TTL_MS / 1000), clientIp: ip };
}

export function validateOperatorSession(req, { requireCsrf = true } = {}) {
  const sessionToken = req.headers["x-session-token"];
  const csrfToken = req.headers["x-csrf-token"];
  if (!sessionToken || typeof sessionToken !== "string") return { ok: false, reason: "SESSION_REQUIRED" };
  const row = sessions.get(sessionToken);
  if (!row) return { ok: false, reason: "SESSION_INVALID" };
  if (Date.now() - row.at > SESSION_TTL_MS) {
    sessions.delete(sessionToken);
    return { ok: false, reason: "SESSION_EXPIRED" };
  }
  const ip = req.socket?.remoteAddress?.replace("::ffff:", "") || "127.0.0.1";
  const expectedSig = createHmac("sha256", sessionKey()).update(`${sessionToken}|${row.csrfToken}|${row.clientIp}`).digest("hex");
  const a = Buffer.from(row.sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "SESSION_SIG_INVALID" };
  if (row.clientIp !== ip && row.clientIp !== "127.0.0.1" && ip !== "::1") {
    return { ok: false, reason: "SESSION_IP_MISMATCH" };
  }
  if (requireCsrf) {
    if (!csrfToken || csrfToken !== row.csrfToken) return { ok: false, reason: "CSRF_INVALID" };
  }
  return { ok: true, sessionToken, clientIp: row.clientIp, operator: row.operator || null };
}

/** Bind an operator name to a session on first use; later calls must match. */
export function bindSessionOperator(sessionToken, operator) {
  const row = sessions.get(sessionToken);
  if (!row) return { ok: false, reason: "SESSION_INVALID" };
  const checked = validateOperatorName(operator);
  if (!checked.ok) return checked;
  if (row.operator && row.operator !== checked.operator) return { ok: false, reason: "OPERATOR_BOUND", operator: row.operator };
  const firstBind = !row.operator;
  row.operator = checked.operator;
  return { ok: true, operator: checked.operator, firstBind };
}

export function sessionOperator(sessionToken) {
  return sessions.get(sessionToken)?.operator || null;
}

export function sessionCount() {
  return sessions.size;
}

export function resetSessionsForTests() {
  sessions.clear();
}
