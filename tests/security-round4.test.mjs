import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestSession, freePort } from "./test-session.mjs";
import { resetRateLimitsForTests, ROUTE_LIMITS } from "../src/security/rate-limit.mjs";
import { resetSessionsForTests } from "../src/security/session-auth.mjs";
import { createLedger, appendLedgerEntry } from "../src/audit-ledger.mjs";
import { loadPersistedLedger } from "../src/audit-ledger-persist.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForHealth(baseUrl, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const h = await fetch(`${baseUrl}/api/health`);
      if (h.ok) return;
    } catch {}
    await sleep(50);
  }
  throw new Error("server not ready");
}

function spawnServer(port, extraEnv = {}) {
  return spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), META_BRIEF_MODE: "fixture", MODEL_API_KEY: "", ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

test("SEC-06 state-changing API requires session + CSRF", { timeout: 12000 }, async t => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawnServer(port);
  t.after(() => server.kill());
  await waitForHealth(baseUrl);
  const denied = await fetch(`${baseUrl}/api/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "AEROSPACE-40-LOT-CONFLICT", certificateText: "x" })
  });
  assert.equal(denied.status, 401);
  const session = await createTestSession(baseUrl);
  const ok = await fetch(`${baseUrl}/api/intake`, {
    method: "POST",
    headers: session.jsonHeaders,
    body: JSON.stringify({
      scenarioId: "AEROSPACE-40-LOT-CONFLICT",
      certificateText: "Heat Number: H-7713\nPurchase Order: PO-45892\nGrade: AMS4928\n"
    })
  });
  assert.equal(ok.status, 200);
});

test("SEC-13 CORS preflight denied and hostile Host rejected", { timeout: 12000 }, async t => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawnServer(port);
  t.after(() => server.kill());
  await waitForHealth(baseUrl);
  const options = await fetch(`${baseUrl}/api/health`, { method: "OPTIONS" });
  assert.equal(options.status, 403);
  const badHostStatus = await new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/api/health", method: "GET", headers: { Host: `evil.example:${port}` } },
      res => resolve(res.statusCode)
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(badHostStatus, 403);
  const corsHeader = options.headers.get("access-control-allow-origin");
  assert.equal(corsHeader, "null");
});

test("SEC-14 meta-brief rate limit returns 429 with Retry-After", { timeout: 15000 }, async t => {
  resetRateLimitsForTests();
  resetSessionsForTests();
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawnServer(port);
  t.after(() => server.kill());
  await waitForHealth(baseUrl);
  const session = await createTestSession(baseUrl);
  const body = JSON.stringify({
    scenarioId: "AEROSPACE-40-LOT-CONFLICT",
    summary: { findings: [{ field: "heat", expected: "H-7731", observed: "H-7713", evidence: { line: 4 } }], impactedOrders: 7, impactedUnits: 178 },
    plans: [{ id: "reissue", label: "Hold", estimatedCost: 1, lateHours: 0, substitutedQualifiedUnits: 0, conditionalJobs: 7, notes: "x" }]
  });
  const limit = ROUTE_LIMITS["meta-brief"].perIp;
  let lastStatus = 0;
  let retryAfter = "";
  for (let i = 0; i < limit + 2; i++) {
    const res = await fetch(`${baseUrl}/api/meta-brief`, { method: "POST", headers: session.jsonHeaders, body });
    lastStatus = res.status;
    retryAfter = res.headers.get("retry-after") || "";
    if (lastStatus === 429) break;
  }
  assert.equal(lastStatus, 429);
  assert.ok(retryAfter.length > 0);
});

test("SEC-15 single-step accept removed; mint alias removed; confirm requires session", { timeout: 12000 }, async t => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawnServer(port);
  t.after(() => server.kill());
  await waitForHealth(baseUrl);
  const mint = await fetch(`${baseUrl}/api/consent/mint`, { method: "POST" });
  assert.equal(mint.status, 404);
  const accept = await fetch(`${baseUrl}/api/consent/accept`, { method: "POST" });
  assert.equal(accept.status, 410);
  const confirm = await fetch(`${baseUrl}/api/consent/confirm`, { method: "POST" });
  assert.equal(confirm.status, 401);
});

test("SEC-16 persisted ledger loads and detects tamper", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ledger-"));
  const path = join(dir, "audit.jsonl");
  process.env.AUDIT_LEDGER_PATH = path;
  const ledger = createLedger();
  const { appendPersistedEntry } = await import("../src/audit-ledger-persist.mjs");
  await appendPersistedEntry(ledger, { actor: "test", action: "A", detail: "1" });
  await appendPersistedEntry(ledger, { actor: "test", action: "B", detail: "2" });
  const raw = await readFile(path, "utf8");
  const lines = raw.trim().split("\n");
  const row = JSON.parse(lines[1]);
  row.detail = "tampered";
  lines[1] = JSON.stringify(row);
  await writeFile(path, lines.join("\n") + "\n");
  const loaded = await loadPersistedLedger();
  assert.equal(loaded.tampered, true);
  delete process.env.AUDIT_LEDGER_PATH;
});

test("SEC-19 CI workflow uses read permissions and pinned action SHAs", async () => {
  const yml = await readFile(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(yml, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(yml, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(yml, /actions\/setup-node@[0-9a-f]{40}/);
  assert.match(yml, /concurrency:/);
});

test("SEC-20 live model verify skips honestly without credentials", async () => {
  const { spawn: sp } = await import("node:child_process");
  const child = sp(process.execPath, ["tools/live-model-verify.mjs"], {
    cwd: root,
    env: { ...process.env, MODEL_API_KEY: "", OLLAMA_ENDPOINT: "" }
  });
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  assert.equal(code, 0);
  const evidence = JSON.parse(await readFile(join(root, "docs/evidence/live-model-verify.json"), "utf8"));
  assert.equal(evidence.status, "skipped");
  assert.ok(evidence.reason);
});
