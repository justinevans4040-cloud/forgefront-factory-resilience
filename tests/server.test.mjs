import { INCORRECT_CERT } from "../src/scenario.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createTestSession, freePort } from "./test-session.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

test("server loads the interactive application, core module and honest Meta status", { timeout: 12000 }, async t => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const ledgerPath = `/tmp/ff-server-test-${port}.jsonl`;
  const server = spawn(process.execPath, ["server.mjs"], {
    cwd: root, windowsHide: true,
    env: { ...process.env, PORT: String(port), MODEL_API_KEY: "", META_BRIEF_MODE: "fixture", AUDIT_LEDGER_PATH: ledgerPath },
    stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(() => server.kill());
  let ready = false;
  for (let n = 0; n < 60; n++) {
    if (server.exitCode !== null) throw new Error("Server exited during smoke test");
    try {
      const health = await fetch(base + "/api/health");
      if (health.ok) { ready = true; break; }
    } catch {}
    await sleep(50);
  }
  assert.equal(ready, true, "Local server should respond");

  const home = await fetch(base + "/");
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Factory Resilience/);
  assert.match(html, /src\/app.mjs/);
  assert.match(html, /id="planCards"/);

  const app = await fetch(base + "/src/app.mjs");
  assert.equal(app.status, 200);
  assert.match(await app.text(), /buildRecoveryPlans/);

  const css = await fetch(base + "/src/styles.css");
  assert.equal(css.status, 200);
  assert.match(await css.text(), /plan-grid/);

  const health = await fetch(base + "/api/health").then(r => r.json());
  assert.equal(health.status, "ready");
  assert.equal(health.metaMode, "not configured");
  assert.equal(health.metaBriefMode, "sample");
  assert.equal(health.metaModeLabel, "Sample mode (no live Muse Spark key)");
  assert.equal(health.buildRound, "r18");
  assert.equal(health.buildLabel, "round18");
  assert.equal(health.buildVersion, "0.9.0");
  assert.equal(health.ledgerIntegrity.ok, true);

  const session = await createTestSession(base);

  const intake = await fetch(base + "/api/intake", {
    method: "POST", headers: session.jsonHeaders,
    body: JSON.stringify({ scenarioId: "AEROSPACE-40-LOT-CONFLICT", certificateText: "Heat Number: H-7713\nPurchase Order: PO-45892\nGrade: AMS4928\n" })
  }).then(r => r.json());
  assert.equal(intake.certificateStatus, "REVIEW REQUIRED");
  assert.ok(intake.reconciliation.contradictions.length > 0);

  const fixtureBrief = await fetch(base + "/api/meta-brief", {
    method: "POST", headers: session.jsonHeaders,
    body: JSON.stringify({
      scenarioId: "AEROSPACE-40-LOT-CONFLICT",
      certificateText: INCORRECT_CERT,
      assumptions: { substituteStock: 96, expeditedLotHours: 20, machineOutageHours: 0 }
    })
  }).then(r => r.json());
  assert.ok(fixtureBrief.status === "COMPLETE" || fixtureBrief.status === "PARTIAL");
  assert.equal(fixtureBrief.verifiedLive, false);
  assert.equal(fixtureBrief.blockedCount, 0);
  assert.equal(fixtureBrief.modeLabel, "Sample mode (no live Muse Spark key)");
  assert.ok(fixtureBrief.trace.length >= 3, "sample planner runs real engine tools");

  const badRequest = await fetch(base + "/api/meta-brief", {
    method: "POST", headers: session.jsonHeaders,
    body: JSON.stringify({ scenarioId: "WRONG" })
  });
  assert.equal(badRequest.status, 400);

  const noFile = await fetch(base + "/private.txt");
  assert.equal(noFile.status, 403);

  const securityHeader = home.headers.get("content-security-policy");
  assert.match(securityHeader, /script-src 'self'/);
});
