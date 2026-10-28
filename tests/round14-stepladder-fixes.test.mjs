/**
 * Round 14: strict JSON, required claims, semantic field coverage, UI/API hardening.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createTestSession, freePort } from "./test-session.mjs";
import { buildBriefPayload, runSamplePlanner } from "../src/brief-context.mjs";
import { INCORRECT_CERT } from "../src/scenario.mjs";
import {
  processStructuredBrief,
  serializeStructuredBrief,
  buildSampleStructuredClaims,
  MAX_STRUCTURED_CLAIMS
} from "../src/structured-brief.mjs";
import { parseJsonStrictOrError } from "../src/security/strict-json.mjs";
import { MUSE_JSON_RESPONSE_FORMAT } from "../src/model-adapter.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const payload = () => buildBriefPayload({ certificateText: INCORRECT_CERT, assumptions: {}, disruptions: {} }).payload;

async function boot(extraEnv = {}) {
  const port = await freePort();
  const dir = mkdtempSync(join(tmpdir(), "ff-r14-"));
  const env = {
    ...process.env, PORT: String(port), META_BRIEF_MODE: "fixture", MODEL_API_KEY: "",
    AUDIT_LEDGER_PATH: join(dir, "ledger.jsonl"),
    LEDGER_HMAC_KEY: "k".repeat(32),
    LEDGER_NOTARY_SECRET: "n".repeat(32),
    CONSENT_HMAC_SECRET: "test-round14-consent-hmac-secret-32c",
    ...extraEnv
  };
  const child = spawn(process.execPath, ["server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) return { child, base, dir, exited: child.exitCode };
    try { if ((await fetch(base + "/api/health")).ok) return { child, base, dir }; } catch {}
    await sleep(50);
  }
  child.kill();
  throw new Error("server boot timeout");
}

test("R13-SL-01 duplicate JSON key claims fails closed", () => {
  const raw = `{"claims":[{"type":"CERT_FIELD_STATUS","evidenceIds":["field:grade"],"params":{"field":"grade"}},{"type":"PRODUCTION_RESUME","evidenceIds":["field:grade"],"params":{}}],"claims":[{"type":"IMPACT_HOLD","evidenceIds":["metric:impactedOrders","metric:impactedUnits"],"params":{}}],"commentary":""}`;
  assert.equal(parseJsonStrictOrError(raw).ok, false);
  const proc = processStructuredBrief(raw, payload());
  assert.equal(proc.complete, false);
  assert.ok(proc.schemaErrors.some(e => e.startsWith("DUPLICATE_KEY")));
});

test("R13-SL-02 grade-only claim not COMPLETE when heat CONFLICT", () => {
  const claims = [{
    type: "CERT_FIELD_STATUS",
    evidenceIds: ["field:grade"],
    params: { field: "grade" }
  }];
  const proc = processStructuredBrief(serializeStructuredBrief({ claims, commentary: "" }), payload());
  assert.equal(proc.complete, false);
  assert.ok(proc.schemaErrors.some(e => e.startsWith("REQUIRED_CLAIM_MISSING") || e.startsWith("SEMANTIC_CONFLICT_FIELD_UNREPORTED")));
});

test("R13-SL-05 duplicate claims array and 500 spam not COMPLETE", () => {
  const p = payload();
  const base = buildSampleStructuredClaims(p).claims;
  const dup = serializeStructuredBrief({ claims: [...base, base[0]], commentary: "" });
  const procDup = processStructuredBrief(dup, p);
  assert.equal(procDup.complete, false);
  assert.ok(procDup.schemaErrors.some(e => e.startsWith("DUPLICATE_CLAIM")));
  const spam = Array.from({ length: 500 }, () => ({
    type: "SCENARIO_HOLD_REMINDER",
    evidenceIds: [`scenario:${p.scenarioId}`],
    params: { scenarioId: p.scenarioId }
  }));
  const procSpam = processStructuredBrief(serializeStructuredBrief({ claims: spam, commentary: "" }), p);
  assert.equal(procSpam.complete, false);
  assert.ok(procSpam.schemaErrors.some(e => e.startsWith("CLAIMS_ARRAY_TOO_LARGE")));
  assert.ok(MAX_STRUCTURED_CLAIMS < 500);
});

test("false-positive sample brief still COMPLETE with useful decision text", () => {
  const p = payload();
  const sample = runSamplePlanner(p);
  const proc = processStructuredBrief(sample.text, p);
  assert.equal(proc.complete, true);
  assert.ok(proc.decisionText.length >= 800);
  assert.match(proc.decisionText, /heat/i);
});

test("R13-SL-04 Muse adapter exposes OpenAI-compatible json_object response_format", () => {
  assert.deepEqual(MUSE_JSON_RESPONSE_FORMAT, { type: "json_object" });
});

test("health buildLabel round14", { timeout: 12000 }, async t => {
  const s = await boot();
  t.after(() => s.child.kill());
  const h = await (await fetch(s.base + "/api/health")).json();
  assert.equal(h.buildLabel, "round18");
  assert.match(h.build, /r18/);
});

test("meta-brief returns decisionText separate from commentary", { timeout: 15000 }, async t => {
  const s = await boot();
  t.after(() => s.child.kill());
  const sess = await createTestSession(s.base);
  const body = await fetch(s.base + "/api/meta-brief", {
    method: "POST", headers: sess.jsonHeaders,
    body: JSON.stringify({ scenarioId: "AEROSPACE-40-LOT-CONFLICT", certificateText: INCORRECT_CERT, assumptions: {}, disruptions: {} })
  }).then(r => r.json());
  assert.equal(body.status, "COMPLETE");
  assert.ok(body.decisionText);
  assert.ok(!body.decisionText.includes("AI commentary"));
});
