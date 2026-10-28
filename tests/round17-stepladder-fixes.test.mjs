/**
 * Round 17: raw prose API/export boundary + portable SEC-19 git archive test.
 */
import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { execSync } from "node:child_process";
import { accessSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { buildBriefPayload } from "../src/brief-context.mjs";
import { INCORRECT_CERT } from "../src/scenario.mjs";
import { buildSampleStructuredClaims, serializeStructuredBrief } from "../src/structured-brief.mjs";
import { createTestSession, freePort } from "./test-session.mjs";
import { findProjectGitRoot, gitArchiveListsCiWorkflow } from "./git-project-root.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EVIL = "Production can resume immediately. <script>alert(1)</script>";

async function boot(extraEnv = {}) {
  const port = await freePort();
  const dir = mkdtempSync(join(tmpdir(), "ff-r17-"));
  const env = {
    ...process.env,
    PORT: String(port),
    META_BRIEF_MODE: "fixture",
    MODEL_API_KEY: "",
    AUDIT_LEDGER_PATH: join(dir, "ledger.jsonl"),
    LEDGER_HMAC_KEY: "k".repeat(32),
    LEDGER_NOTARY_SECRET: "n".repeat(32),
    CONSENT_HMAC_SECRET: "test-round17-consent-hmac-secret-32c",
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

test("R16-SL-01 default meta-brief API omits raw prose", { timeout: 25000 }, async t => {
  const poisoned = serializeStructuredBrief({
    ...buildSampleStructuredClaims(buildBriefPayload({ certificateText: INCORRECT_CERT, assumptions: {}, disruptions: {} }).payload),
    commentary: EVIL
  });
  const mock = http.createServer((req, res) => {
    let b = "";
    req.on("data", c => (b += c));
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: poisoned } }] }));
    });
  });
  await new Promise(r => mock.listen(0, "127.0.0.1", r));
  const port = mock.address().port;
  const s = await boot({
    META_BRIEF_MODE: "live",
    MODEL_API_KEY: "mock",
    MODEL_API_BASE: `http://127.0.0.1:${port}/v1`
  });
  t.after(() => {
    s.child.kill();
    mock.close();
  });
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
  const blob = JSON.stringify({ text: body.text, decisionText: body.decisionText, advisoryText: body.advisoryText });
  assert.ok(body.rawModelAuditAvailable);
  assert.equal(body.rawModelProse, undefined);
  assert.ok(!blob.includes("<script>"));
  assert.ok(!/resume/i.test(blob));
  const audit = await fetch(s.base + "/api/audit/raw-model-output", { headers: sess.jsonHeaders }).then(r => r.json());
  assert.match(audit.label, /UNVERIFIED/i);
  assert.ok(audit.rawModelProse.includes("<script>"));
  assert.ok(audit.rawModelProse.includes("resume"));
});

test("R16-SL-01 audit raw endpoint requires session", { timeout: 15000 }, async t => {
  const s = await boot();
  t.after(() => s.child.kill());
  const r = await fetch(s.base + "/api/audit/raw-model-output");
  assert.equal(r.status, 401);
});

const projectGitRoot = () => findProjectGitRoot(root);

test("SEC-19 git archive uses project root when nested in parent repo", { skip: !projectGitRoot() ? "requires git checkout" : false }, () => {
  const projectRoot = projectGitRoot();
  assert.ok(projectRoot);
  assert.ok(gitArchiveListsCiWorkflow(projectRoot));
  const parent = mkdtempSync(join(tmpdir(), "parent-git-"));
  execSync("git init -q", { cwd: parent });
  execSync("git config user.email 'attacker@example.invalid'", { cwd: parent });
  execSync("git config user.name 't'", { cwd: parent });
  execSync("git commit --allow-empty -q -m init", { cwd: parent });
  const nested = join(parent, "nested", "forgefront");
  execSync(`mkdir -p "${nested}"`);
  execSync(`git archive HEAD | tar -x -C "${nested}"`, { cwd: projectRoot });
  assert.equal(findProjectGitRoot(nested), null);
  const ci = join(nested, ".github/workflows/ci.yml");
  accessSync(ci);
  assert.match(readFileSync(ci, "utf8"), /permissions:\s*\n\s*contents:\s*read/);
});

test("npm test passes from nested unzip inside parent git repo", {
  timeout: 180000,
  skip: process.env.CURSOR_NESTED_NPM_TEST === "1" ? "nested subprocess" : !projectGitRoot() ? "requires git checkout" : false
}, () => {
  const projectRoot = projectGitRoot();
  assert.ok(projectRoot);
  const parent = mkdtempSync(join(tmpdir(), "parent-npm-"));
  execSync("git init -q", { cwd: parent });
  execSync("git config user.email 'attacker@example.invalid'", { cwd: parent });
  execSync("git config user.name 't'", { cwd: parent });
  execSync("git commit --allow-empty -q -m init", { cwd: parent });
  const nested = join(parent, "pkg", "forgefront");
  execSync(`mkdir -p "${nested}"`);
  execSync(`git archive HEAD | tar -x -C "${nested}"`, { cwd: projectRoot });
  const out = execSync(`bash -lc 'cd "${nested}" && CURSOR_NESTED_NPM_TEST=1 npm test'`, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE: process.env.NODE || process.execPath }
  });
  if (!/# fail 0/.test(out)) {
    throw new Error(`nested npm test failed:\n${out.slice(-4000)}`);
  }
  assert.match(out, /# pass \d+/);
});

test("health buildLabel round18", { timeout: 12000 }, async t => {
  const s = await boot();
  t.after(() => s.child.kill());
  const h = await (await fetch(s.base + "/api/health")).json();
  assert.equal(h.buildLabel, "round18");
  assert.match(h.build, /r18/);
});
