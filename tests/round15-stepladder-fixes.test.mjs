import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
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
import { screenModelOutput } from "../src/output-screen.mjs";
import {
  COMMENTARY_WITHHELD_NOTICE,
  commentarySentenceAssertsDecision,
  screenAdvisoryCommentary
} from "../src/security/commentary-decision-screen.mjs";
import { createTestSession, freePort } from "./test-session.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function boot(extraEnv = {}) {
  const port = await freePort();
  const dir = mkdtempSync(join(tmpdir(), "ff-r15-"));
  const env = {
    ...process.env,
    PORT: String(port),
    META_BRIEF_MODE: "fixture",
    MODEL_API_KEY: "",
    AUDIT_LEDGER_PATH: join(dir, "ledger.jsonl"),
    LEDGER_HMAC_KEY: "k".repeat(32),
    LEDGER_NOTARY_SECRET: "n".repeat(32),
    CONSENT_HMAC_SECRET: "test-round15-consent-hmac-secret-32c",
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

function payload() {
  return buildBriefPayload({ certificateText: INCORRECT_CERT, assumptions: {}, disruptions: {} }).payload;
}

test("R14-SL-01 PoC: resume commentary withheld on COMPLETE brief", () => {
  const p = payload();
  const line = "Production can resume immediately.";
  assert.equal(screenModelOutput(line).allowed, true, "legacy screen alone misses resume");
  const brief = serializeStructuredBrief({
    ...JSON.parse(serializeStructuredBrief(buildSampleStructuredClaims(p))),
    commentary: line
  });
  const proc = processStructuredBrief(brief, p);
  assert.equal(proc.complete, true);
  assert.ok(proc.advisoryDroppedCount >= 1);
  assert.ok(!/resume/i.test(proc.advisoryText || ""));
  assert.ok(!/resume/i.test(proc.commentary || ""));
  assert.ok(!/resume/i.test(proc.decisionText));
});

test("R14-SL-01 paraphrase variants withheld", () => {
  const p = payload();
  const variants = [
    "Manufacturing may restart at once.",
    "We can resume output now.",
    "Operations should continue as normal.",
    "The shop is clear to run again."
  ];
  for (const line of variants) {
    assert.ok(commentarySentenceAssertsDecision(line), `expected decision assert: ${line}`);
    const proc = processStructuredBrief(
      serializeStructuredBrief({ ...buildSampleStructuredClaims(p), commentary: line }),
      p
    );
    assert.ok(proc.advisoryDroppedCount >= 1, line);
    assert.ok(!/resume|restart|continue/i.test(proc.advisoryText || ""), line);
  }
});

test("R14-SL-01 false positive: templated advisory still shown without free prose", () => {
  const p = payload();
  const proc = processStructuredBrief(serializeStructuredBrief(buildSampleStructuredClaims(p)), p);
  assert.equal(proc.complete, true);
  assert.equal(proc.advisoryDroppedCount, 0);
  assert.ok(proc.advisoryText && proc.advisoryText.length > 40);
});

test("R14-SL-01 partial withhold keeps safe sentences", () => {
  const p = payload();
  const safe = "Little's Law cell metrics help explain queue buildup while the lot stays on hold.";
  const text = `${safe} Production can resume immediately.`;
  const screened = screenAdvisoryCommentary(text);
  assert.equal(screened.commentaryWithheld, true);
  assert.match(screened.allowedText, /Little's Law/i);
  assert.ok(!/resume/i.test(screened.allowedText));
  const proc = processStructuredBrief(
    serializeStructuredBrief({ ...buildSampleStructuredClaims(p), commentary: text }),
    p
  );
  assert.ok(proc.advisoryDroppedCount >= 1);
  assert.ok(proc.advisoryText && proc.advisoryText.length > 20);
});

test("R14-SL-01 negated resume advice is not withheld", () => {
  const line = "Do not resume production until heat trace review closes.";
  assert.equal(commentarySentenceAssertsDecision(line), false);
  const proc = processStructuredBrief(
    serializeStructuredBrief({ ...buildSampleStructuredClaims(payload()), commentary: line }),
    payload()
  );
  assert.ok(proc.advisoryDroppedCount >= 1);
  assert.ok(proc.advisoryText && !/not resume/i.test(proc.advisoryText));
});

test("R14 false-positive HTTP meta-brief still COMPLETE", { timeout: 20000 }, async t => {
  const s = await boot({ META_BRIEF_MODE: "fixture" });
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
  assert.equal(body.blockedCount, 0);
  assert.ok((body.decisionText?.length ?? 0) >= 800);
  assert.match(body.decisionText || "", /heat/i);
});

test("health buildLabel round18", { timeout: 12000 }, async t => {
  const s = await boot();
  t.after(() => s.child.kill());
  const h = await (await fetch(s.base + "/api/health")).json();
  assert.equal(h.buildLabel, "round18");
  assert.match(h.build, /r18/);
});

test("withheld notice constant", () => {
  assert.match(COMMENTARY_WITHHELD_NOTICE, /DECISION panel/);
});
