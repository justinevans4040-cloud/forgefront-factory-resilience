import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createTestSession, freePort } from "./test-session.mjs";
import { resetOperatorStateForTests } from "../src/pm/operator-state.mjs";
import { resetRateLimitsForTests } from "../src/security/rate-limit.mjs";
import { INCORRECT_CERT } from "../src/scenario.mjs";
import { hashPlan } from "../src/consent-gate.mjs";
import { scenarioHash } from "../src/scenario-hash.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function bootServer(port) {
  const server = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), META_BRIEF_MODE: "fixture", AUDIT_LEDGER_PATH: `/tmp/ledger-pm-${port}.jsonl` },
    stdio: ["ignore", "pipe", "pipe"]
  });
  for (let i = 0; i < 40; i++) {
    try {
      const h = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (h.ok) return server;
    } catch {}
    await sleep(50);
  }
  server.kill();
  throw new Error("server failed to start");
}

test("kanban gated before consent and move requires CSRF", { timeout: 15000 }, async t => {
  resetOperatorStateForTests();
  resetRateLimitsForTests();
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = await bootServer(port);
  t.after(() => server.kill());

  const session = await createTestSession(baseUrl);
  const gated = await fetch(`${baseUrl}/api/kanban`, { headers: session.jsonHeaders });
  assert.equal(gated.status, 403);

  const pm = await fetch(`${baseUrl}/api/pm/analyze`, {
    method: "POST",
    headers: session.jsonHeaders,
    body: JSON.stringify({ certificateText: INCORRECT_CERT, assumptions: { substituteStock: 96 } })
  });
  assert.equal(pm.status, 200);
  const pmBody = await pm.json();
  assert.equal(pmBody.pm.plans.length, 4);

  const inputs = { certificateText: INCORRECT_CERT, assumptions: { substituteStock: 96 } };
  const review = await fetch(`${baseUrl}/api/consent/review`, {
    method: "POST", headers: session.jsonHeaders,
    body: JSON.stringify({ planId: "reissue", operator: "OP-A", ...inputs })
  }).then(r => r.json());
  assert.equal(review.status, "REVIEW_TOKEN");
  const accept = await fetch(`${baseUrl}/api/consent/confirm`, {
    method: "POST", headers: session.jsonHeaders,
    body: JSON.stringify({ token: review.token, phrase: "APPROVE reissue", ...inputs })
  });
  assert.equal(accept.status, 200);
  const hdrs = { ...session.jsonHeaders, "X-Scenario-Hash": scenarioHash(inputs) };

  const boardRes = await fetch(`${baseUrl}/api/kanban`, { headers: hdrs });
  assert.equal(boardRes.status, 200);
  const board = await boardRes.json();
  assert.ok(board.board.cards.length >= 5);
  for (const card of board.board.cards) assert.ok(Number.isFinite(card.dueHour) && card.dueHour > 0, `numeric dueHour for ${card.id}`);

  const noCsrf = await fetch(`${baseUrl}/api/kanban/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Token": session.sessionToken, "X-Scenario-Hash": scenarioHash(inputs) },
    body: JSON.stringify({ cardId: board.board.cards[0].id, column: "in_progress" })
  });
  assert.equal(noCsrf.status, 401);

  const moved = await fetch(`${baseUrl}/api/kanban/move`, {
    method: "POST",
    headers: hdrs,
    body: JSON.stringify({ cardId: board.board.cards[0].id, column: "in_progress" })
  });
  assert.equal(moved.status, 200);

  const verify = await fetch(`${baseUrl}/api/audit/verify`);
  const audit = await verify.json();
  assert.ok(audit.length >= 1);
});

test("pm analyze rate limit returns 429", { timeout: 20000 }, async t => {
  resetRateLimitsForTests();
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = await bootServer(port);
  t.after(() => server.kill());
  const session = await createTestSession(baseUrl);
  const body = JSON.stringify({ certificateText: INCORRECT_CERT });
  let saw429 = false;
  for (let i = 0; i < 25; i++) {
    const res = await fetch(`${baseUrl}/api/pm/analyze`, { method: "POST", headers: session.jsonHeaders, body });
    if (res.status === 429) {
      saw429 = true;
      assert.ok(res.headers.get("retry-after"));
      break;
    }
  }
  assert.equal(saw429, true);
});
