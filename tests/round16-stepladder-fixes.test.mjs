/**
 * Round 16: structured advisory allowlist (R15 audit bypass closure).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { execSync } from "node:child_process";
import { accessSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { buildBriefPayload } from "../src/brief-context.mjs";
import { INCORRECT_CERT } from "../src/scenario.mjs";
import {
  buildSampleStructuredClaims,
  processStructuredBrief,
  serializeStructuredBrief
} from "../src/structured-brief.mjs";
import { createTestSession, freePort } from "./test-session.mjs";
import { findProjectGitRoot, gitArchiveListsCiWorkflow } from "./git-project-root.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LEAK_RE = /resume|reopen|recommence|riprend|reanud|resumed|machining again|full production/i;

const HOSTILE = [
  { cat: "r14_poc", text: "Production can resume immediately." },
  { cat: "passive", text: "Production was resumed by the night shift." },
  { cat: "synonym2", text: "There is no reason the floor cannot recommence machining." },
  { cat: "double_neg", text: "It is not true that production cannot resume now." },
  { cat: "italian", text: "La produzione può riprendere subito." },
  { cat: "spanish", text: "La producción puede reanudarse de inmediato." },
  { cat: "split", text: "The line is clear. It can run again tomorrow." },
  { cat: "implication", text: "Back to full production is the obvious next step." }
];

function payload() {
  return buildBriefPayload({ certificateText: INCORRECT_CERT, assumptions: {}, disruptions: {} }).payload;
}

/** Operator-facing brief/export fields (raw prose is audit-only). */
function exportBlob(proc) {
  return JSON.stringify({
    commentary: proc.commentary,
    advisoryText: proc.advisoryText,
    displayText: proc.displayText
  });
}

async function boot(extraEnv = {}) {
  const port = await freePort();
  const dir = mkdtempSync(join(tmpdir(), "ff-r16-"));
  const env = {
    ...process.env,
    PORT: String(port),
    META_BRIEF_MODE: "fixture",
    MODEL_API_KEY: "",
    AUDIT_LEDGER_PATH: join(dir, "ledger.jsonl"),
    LEDGER_HMAC_KEY: "k".repeat(32),
    LEDGER_NOTARY_SECRET: "n".repeat(32),
    CONSENT_HMAC_SECRET: "test-round16-consent-hmac-secret-32c",
    ...extraEnv
  };
  const child = spawn(process.execPath, ["server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) return { child, base, dir, exited: child.exitCode };
    try {
      if ((await fetch(base + "/api/health")).ok) return { child, base, dir };
    } catch {}
    await sleep(50);
  }
  child.kill();
  throw new Error("boot timeout");
}

for (const { cat, text } of HOSTILE) {
  test(`R15-SL hostile ${cat} prose never reaches UI/brief/export fields`, () => {
    const p = payload();
    const proc = processStructuredBrief(
      serializeStructuredBrief({ ...buildSampleStructuredClaims(p), commentary: text }),
      p
    );
    assert.equal(proc.complete, true);
    assert.ok(proc.advisoryDroppedCount >= 1, cat);
    assert.ok(!LEAK_RE.test(proc.commentary || ""), cat);
    assert.ok(!LEAK_RE.test(proc.advisoryText || ""), cat);
    assert.ok(!LEAK_RE.test(proc.displayText || ""), cat);
    assert.ok(!LEAK_RE.test(exportBlob(proc)), cat);
    assert.equal(proc.rawModelProse, text);
  });
}

test("R15 false-positive: fixture brief COMPLETE with templated advisory", { timeout: 20000 }, async t => {
  const s = await boot();
  t.after(() => s.child.kill());
  const sess = await createTestSession(s.base);
  const body = await fetch(s.base + "/api/meta-brief", {
    method: "POST",
    headers: sess.jsonHeaders,
    body: JSON.stringify({
      scenarioId: "AEROSPACE-40-LOT-CONFLICT",
      certificateText: INCORRECT_CERT,
      assumptions: {},
      disruptions: {}
    })
  }).then(r => r.json());
  assert.equal(body.status, "COMPLETE");
  assert.ok((body.advisoryText?.length ?? 0) > 40);
  assert.ok((body.decisionText?.length ?? 0) >= 800);
  assert.equal(body.advisoryDroppedCount ?? 0, 0);
  assert.ok(!LEAK_RE.test(body.text || ""));
  assert.ok(!LEAK_RE.test(body.advisoryText || ""));
});

test("R15-SL-05 SEC-19: CI workflow committed (pinned actions, read permissions)", () => {
  const ci = join(root, ".github/workflows/ci.yml");
  accessSync(ci);
  const yml = readFileSync(ci, "utf8");
  assert.match(yml, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(yml, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(yml, /actions\/setup-node@[0-9a-f]{40}/);
  assert.match(yml, /concurrency:/);
});

test("R15-SL-05 CI workflow listed in git archive HEAD (project root)", () => {
  const projectRoot = findProjectGitRoot(root);
  if (!projectRoot) return;
  assert.ok(gitArchiveListsCiWorkflow(projectRoot));
});

test("health buildLabel round18", { timeout: 12000 }, async t => {
  const s = await boot();
  t.after(() => s.child.kill());
  const h = await (await fetch(s.base + "/api/health")).json();
  assert.equal(h.buildLabel, "round18");
  assert.match(h.build, /r18/);
});
