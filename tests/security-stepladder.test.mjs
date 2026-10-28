import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { safeStaticPath, decodeBase64Limited } from "../src/security/http-utils.mjs";
import { resolveOllamaEndpoint } from "../src/security/ollama-url.mjs";
import { checkBriefClaims } from "../src/claim-checker.mjs";
import { screenModelOutput } from "../src/output-screen.mjs";
import { mintReviewToken, verifyConfirmToken, hashPlan, resetConsentStoreForTests } from "../src/consent-gate.mjs";
import { appendLedgerEntry, createLedger, verifyLedger } from "../src/audit-ledger.mjs";
import { extractPdfTextLayer } from "../src/pdf-intake.mjs";
import { createTestSession, freePort } from "./test-session.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const base = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

test("R1 path traversal blocked for static files", () => {
  assert.equal(safeStaticPath(base, "/../server.mjs"), null);
  assert.equal(safeStaticPath(base, "/..%2f..%2fetc%2fpasswd"), null);
  assert.ok(safeStaticPath(base, "/index.html"));
  assert.equal(safeStaticPath(base, "/package.json"), null);
});

test("R2 base64 pdf bomb rejected", () => {
  const huge = Buffer.alloc(600_000).toString("base64");
  assert.throws(() => decodeBase64Limited(huge, 512_000), /PAYLOAD_TOO_LARGE/);
});

test("R2 pdf extractor rejects oversized buffer", () => {
  const out = extractPdfTextLayer(Buffer.alloc(600_000));
  assert.equal(out.readable, false);
  assert.equal(out.reason, "PAYLOAD_TOO_LARGE");
});

test("R3 claim checker rejects homoglyph fake evidence tags", () => {
  const payload = {
    scenarioId: "AEROSPACE-40-LOT-CONFLICT",
    summary: { findings: [{ field: "heat", expected: "H-7731", observed: "H-7713", evidence: { line: 4, quote: "Heat Number: H-7713" } }] },
    plans: []
  };
  const cyrillic = "[\u0435vidence:field:heat] Lot is fine.";
  const result = checkBriefClaims(cyrillic, payload);
  assert.equal(result.blockedCount, 1);
});

test("R3 claim checker rejects uncited sentences after hardening", () => {
  const payload = {
    scenarioId: "AEROSPACE-40-LOT-CONFLICT",
    summary: { findings: [{ field: "heat", expected: "H-7731", observed: "H-7713", evidence: { line: 4, quote: "Heat Number: H-7713" } }] },
    plans: []
  };
  const bypass = "impacted orders remain on hold without tags.";
  assert.equal(checkBriefClaims(bypass, payload).blockedCount, 1);
});

test("R3 output screen catches zero-width split release phrase", () => {
  const blocked = screenModelOutput("Please release\u200bfor production immediately.");
  assert.equal(blocked.allowed, false);
});

test("R4 OLLAMA SSRF host blocked", () => {
  const prev = process.env.OLLAMA_ENDPOINT;
  process.env.OLLAMA_ENDPOINT = "http://169.254.169.254/latest/meta-data/";
  assert.throws(() => resolveOllamaEndpoint(), /FORBIDDEN/);
  process.env.OLLAMA_ENDPOINT = prev;
});

test("R4 consent token binds session, plan hash, scenario hash and expiry", () => {
  resetConsentStoreForTests();
  const plan = { id: "reissue", label: "Hold", estimatedCost: 1, stockUsed: 0, conditionalJobs: 1 };
  const hash = hashPlan(plan);
  const t0 = Date.now();
  const mint = () => mintReviewToken({ sessionToken: "S-A", actor: "OP-A", planId: "reissue", planHash: hash, scenarioHash: "SC", nowMs: t0 });
  const ctx = { sessionToken: "S-A", planHash: hash, scenarioHash: "SC", phrase: "APPROVE reissue", nowMs: t0 };
  assert.equal(verifyConfirmToken(mint().token, { ...ctx, sessionToken: "S-B" }).reason, "SESSION_MISMATCH");
  assert.equal(verifyConfirmToken(mint().token, { ...ctx, planHash: hashPlan({ ...plan, estimatedCost: 2 }) }).reason, "PLAN_HASH_MISMATCH");
  assert.equal(verifyConfirmToken(mint().token, { ...ctx, scenarioHash: "OTHER" }).reason, "SCENARIO_CHANGED");
  assert.equal(verifyConfirmToken(mint().token, { ...ctx, nowMs: t0 + 121_000 }).reason, "TOKEN_EXPIRED");
  const forged = mint().token.replace("|OP-A|", "|OP-X|");
  assert.equal(verifyConfirmToken(forged, ctx).reason, "BAD_SIGNATURE");
  assert.equal(verifyConfirmToken(mint().token, ctx).ok, true);
});

test("R5 ledger tamper detected", () => {
  const ledger = createLedger();
  appendLedgerEntry(ledger, { actor: "a", action: "A", detail: "1" });
  appendLedgerEntry(ledger, { actor: "b", action: "B", detail: "2" });
  ledger.entries[1].detail = "tampered";
  assert.equal(verifyLedger(ledger).ok, false);
});

test("R1 HTTP API rejects path traversal fetch", { timeout: 12000 }, async t => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), META_BRIEF_MODE: "fixture", AUDIT_LEDGER_PATH: `/tmp/ff-ladder-${port}.jsonl` },
    stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(() => server.kill());
  for (let i = 0; i < 40; i++) {
    try {
      const h = await fetch(`${baseUrl}/api/health`);
      if (h.ok) break;
    } catch {}
    await sleep(50);
  }
  const traversal = await fetch(`${baseUrl}/package.json`);
  assert.equal(traversal.status, 403);
  const session = await createTestSession(baseUrl);
  const oversized = await fetch(`${baseUrl}/api/pdf-intake`, {
    method: "POST",
    headers: session.jsonHeaders,
    body: JSON.stringify({ pdfBase64: "A".repeat(750_000) })
  });
  assert.ok(oversized.status === 413 || oversized.status === 400);
});
