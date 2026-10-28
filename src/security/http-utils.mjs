import { resolve, normalize, sep, extname, relative } from "node:path";

/**
 * Explicit allowlist of client-side static assets. Server modules (server.mjs,
 * src/security/*, src/audit-ledger*.mjs, src/consent-gate.mjs, src/prompt-defense.mjs,
 * src/model-adapter.mjs, src/brief-context.mjs, tools/*, tests/*, package.json, .env*,
 * data/*, docs/*, fixtures that aren't needed by the browser, …) are refused even when
 * their extension is otherwise allowed. Browser import graph is walked from src/app.mjs.
 */
const STATIC_EXT = new Set([".html", ".mjs", ".js", ".css", ".svg"]);
const VENDOR_CCV3_EXT = new Set([
  ".html", ".js", ".mjs", ".css", ".svg", ".png", ".txt", ".md", ".webmanifest"
]);

const ALLOWED_EXACT = new Set([
  "index.html"
]);

const ALLOWED_PREFIXES = [
  "src/app.mjs",
  "src/styles.css",
  "src/scenario.mjs",
  "src/scenario-hash.mjs",
  "src/engine.mjs",
  "src/epistemic.mjs",
  "src/intake.mjs",
  "src/graph.mjs",
  "src/incident.mjs",
  "src/ui-viz.mjs",
  "src/machine-routing.mjs",
  "src/sha256.mjs",
  "src/pm/cpm-calculator.mjs",
  "src/pm/evm-calculator.mjs",
  "src/pm/wsjf-calculator.mjs",
  "src/pm/pm-analysis.mjs"
];

export function isAllowedStaticRel(rel) {
  const norm = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!norm || norm.includes("\0") || norm.includes("..")) return false;
  if (ALLOWED_EXACT.has(norm)) return true;
  // Command Center V3 Program tab assets (vendored read-only copy; no access tokens).
  if (norm.startsWith("vendor/command-center-v3/")) {
    // Never serve JSON state/token dumps from the Program vendor tree.
    if (extname(norm) === ".json") return false;
    return VENDOR_CCV3_EXT.has(extname(norm));
  }
  return ALLOWED_PREFIXES.some(p => norm === p);
}

export function safeStaticPath(baseDir, urlPathname) {
  if (!urlPathname || typeof urlPathname !== "string") return null;
  let decoded;
  try { decoded = decodeURIComponent(urlPathname); } catch { return null; }
  if (decoded.includes("\0") || decoded.includes("\\")) return null;
  const rel = (decoded === "/" ? "index.html" : decoded).replace(/^\/+/, "");
  if (rel.includes("..")) return null;
  if (!isAllowedStaticRel(rel)) return null;
  const full = normalize(resolve(baseDir, rel));
  const root = normalize(baseDir.endsWith(sep) ? baseDir : baseDir + sep);
  if (!full.startsWith(root)) return null;
  // Defense in depth: relative path after resolve must equal the allowlisted rel.
  const relAfter = relative(baseDir, full).replace(/\\/g, "/");
  if (relAfter !== rel.replace(/\\/g, "/")) return null;
  const ext = extname(full);
  const normRel = rel.replace(/\\/g, "/");
  if (normRel.startsWith("vendor/command-center-v3/")) {
    if (ext === ".json") return null;
    if (!VENDOR_CCV3_EXT.has(ext)) return null;
  } else if (!STATIC_EXT.has(ext)) {
    return null;
  }
  return full;
}

export async function readBodyLimited(req, maxBytes, timeoutMs = 15000) {
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    let data = "";
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new Error("REQUEST_TIMEOUT")), timeoutMs);
    req.on("data", chunk => {
      if (settled) return;
      size += chunk.length;
      if (size > maxBytes) {
        finish(reject, new Error("PAYLOAD_TOO_LARGE"));
        return;
      }
      data += chunk.toString();
    });
    req.on("end", () => {
      if (!settled) finish(resolvePromise, data);
    });
    req.on("error", err => finish(reject, err));
    req.on("aborted", () => finish(reject, new Error("REQUEST_ABORTED")));
  });
}

export function decodeBase64Limited(b64, maxDecodedBytes) {
  const raw = String(b64 || "").replace(/\s/g, "");
  if (!raw.length) return Buffer.alloc(0);
  const approx = Math.floor(raw.length * 3 / 4);
  if (approx > maxDecodedBytes) throw new Error("PAYLOAD_TOO_LARGE");
  const buf = Buffer.from(raw, "base64");
  if (buf.length > maxDecodedBytes) throw new Error("PAYLOAD_TOO_LARGE");
  return buf;
}

export function publicErrorMessage(error) {
  const code = error?.message;
  if (code === "PAYLOAD_TOO_LARGE") return "Payload too large.";
  if (code === "REQUEST_TIMEOUT") return "Request timed out.";
  return "Invalid request.";
}
