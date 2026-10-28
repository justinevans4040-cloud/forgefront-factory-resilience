/** Round 8: one test (or more) per claim-drift audit item H1–H6, M1–M9, L1–L12, plus new capabilities. */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { createTestSession, freePort } from "./test-session.mjs";
import { INCORRECT_CERT, MATCHING_CERT, createScenario } from "../src/scenario.mjs";
import { scenarioHash } from "../src/scenario-hash.mjs";
import { checkBriefClaims, extractNumbers } from "../src/claim-checker.mjs";
import { buildBriefPayload, runSamplePlanner, adversarialBrief, BRIEF_TOOLS, executeBriefTool } from "../src/brief-context.mjs";
import { modelComplete, resolveMuseEndpoint } from "../src/model-adapter.mjs";
import { buildRecoveryKanban } from "../src/pm/kanban.mjs";
import { buildPmContextFromState, littlesLawForCells } from "../src/pm/pm-analysis.mjs";
import { scheduleJobs } from "../src/engine.mjs";
import { extractPdfTextLayer, processPdfCertificate } from "../src/pdf-intake.mjs";
import { createIncidentRecord, syncIncidentFromEngine } from "../src/incident.mjs";
import { chromeCandidates } from "../tools/browser-smoke.mjs";
import { ROUTE_LIMITS } from "../src/security/rate-limit.mjs";
import { MAX_SESSIONS, createOperatorSession, sessionCount, resetSessionsForTests } from "../src/security/session-auth.mjs";
import { appendLedgerEntry, createLedger, verifyLedger } from "../src/audit-ledger.mjs";
import { sha256Hex } from "../src/sha256.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INPUTS = { certificateText: INCORRECT_CERT, assumptions: { substituteStock: 96, expeditedLotHours: 20, machineOutageHours: 0 }, disruptions: {} };

async function boot(extraEnv = {}) {
  const dir = await mkdtemp(join(tmpdir(), "ff-r8-"));
  const port = await freePort();
  const ledger = join(dir, "audit-ledger.jsonl");
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), META_BRIEF_MODE: "sample", MODEL_API_KEY: "", AUDIT_LEDGER_PATH: ledger, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return { child, base, ledger, dir, port }; } catch {}
    await sleep(50);
  }
  child.kill();
  throw new Error("server failed to start");
}
const post = (base, path, headers, body) => fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
const ledgerLines = async path => (await readFile(path, "utf8")).trim().split("\n").map(l => JSON.parse(l));

async function approve(base, session, planId = "hybrid", operator = "Justin Evans", inputs = INPUTS) {
  const review = await post(base, "/api/consent/review", session.jsonHeaders, { planId, operator, ...inputs }).then(r => r.json());
  assert.equal(review.status, "REVIEW_TOKEN");
  const confirm = await post(base, "/api/consent/confirm", session.jsonHeaders, { token: review.token, phrase: `APPROVE ${planId}`, ...inputs });
  return { review, confirm, body: await confirm.json() };
}

/* ---------------- H1 consent ---------------- */
test("H1 consent: unknown planId rejected at review and logged", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  const session = await createTestSession(s.base);
  const res = await post(s.base, "/api/consent/review", session.jsonHeaders, { planId: "teleport", operator: "OP", ...INPUTS });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).reason, "UNKNOWN_PLAN");
  assert.ok((await ledgerLines(s.ledger)).some(e => e.action === "CONSENT_DENIED" && e.detail.includes("UNKNOWN_PLAN")));
  assert.equal((await post(s.base, "/api/consent/accept", session.jsonHeaders, { planId: "teleport", phrase: "APPROVE teleport" })).status, 410);
});

test("H1 consent: server recomputes the plan — changed inputs between review and confirm are rejected", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  const session = await createTestSession(s.base);
  const review = await post(s.base, "/api/consent/review", session.jsonHeaders, { planId: "hybrid", operator: "OP", ...INPUTS }).then(r => r.json());
  assert.equal(review.plan.estimatedCost, buildPmContextFromState(INPUTS).plans.find(p => p.id === "hybrid").estimatedCost, "server-computed plan");
  const changed = { ...INPUTS, assumptions: { ...INPUTS.assumptions, substituteStock: 30 } };
  const res = await post(s.base, "/api/consent/confirm", session.jsonHeaders, { token: review.token, phrase: "APPROVE hybrid", ...changed, plan: { id: "hybrid", estimatedCost: 1 } });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).reason, "SCENARIO_CHANGED");
});

test("H1 consent: actor bound to session, token bound to session, single use", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  const a = await createTestSession(s.base);
  const b = await createTestSession(s.base);
  const review = await post(s.base, "/api/consent/review", a.jsonHeaders, { planId: "hybrid", operator: "Alice", ...INPUTS }).then(r => r.json());
  const other = await post(s.base, "/api/consent/review", a.jsonHeaders, { planId: "hybrid", operator: "Mallory", ...INPUTS });
  assert.equal(other.status, 409);
  assert.equal((await other.json()).reason, "OPERATOR_BOUND");
  const stolen = await post(s.base, "/api/consent/confirm", b.jsonHeaders, { token: review.token, phrase: "APPROVE hybrid", ...INPUTS });
  assert.equal((await stolen.json()).reason, "SESSION_MISMATCH");
  const ok = await post(s.base, "/api/consent/confirm", a.jsonHeaders, { token: review.token, phrase: "APPROVE hybrid", ...INPUTS }).then(r => r.json());
  assert.equal(ok.status, "ACCEPTED");
  assert.equal(ok.operator, "Alice");
  assert.equal(ok.operationalRelease, false);
  const replay = await post(s.base, "/api/consent/confirm", a.jsonHeaders, { token: review.token, phrase: "APPROVE hybrid", ...INPUTS }).then(r => r.json());
  assert.equal(replay.reason, "TOKEN_REPLAY");
});

test("H1 consent: approvals expire (APPROVAL_TTL_SEC) and Kanban is re-gated", { timeout: 20000 }, async t => {
  const s = await boot({ APPROVAL_TTL_SEC: "1" }); t.after(() => s.child.kill());
  const session = await createTestSession(s.base);
  const { body } = await approve(s.base, session);
  assert.equal(body.status, "ACCEPTED");
  const hdrs = { ...session.jsonHeaders, "X-Scenario-Hash": scenarioHash(INPUTS) };
  assert.equal((await fetch(`${s.base}/api/kanban`, { headers: hdrs })).status, 200);
  await sleep(1300);
  const expired = await fetch(`${s.base}/api/kanban`, { headers: hdrs });
  assert.equal(expired.status, 403);
  assert.equal((await expired.json()).status, "CONSENT_EXPIRED");
  assert.ok((await ledgerLines(s.ledger)).some(e => e.action === "CONSENT_EXPIRED"));
});

/* ---------------- M1 invalidation ---------------- */
test("M1 scenario change invalidates approval server-side (hash) and via revoke, both logged", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  const session = await createTestSession(s.base);
  await approve(s.base, session);
  const shocked = { ...INPUTS, disruptions: { substituteLotQuestioned: true, machineOutageHours: 12 } };
  const stale = await fetch(`${s.base}/api/kanban`, { headers: { ...session.jsonHeaders, "X-Scenario-Hash": scenarioHash(shocked) } });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).status, "APPROVAL_STALE");
  assert.equal((await fetch(`${s.base}/api/kanban`, { headers: { ...session.jsonHeaders, "X-Scenario-Hash": scenarioHash(INPUTS) } })).status, 403, "stays revoked");
  await approve(s.base, session);
  const revoke = await post(s.base, "/api/consent/revoke", session.jsonHeaders, { reason: "second shock" }).then(r => r.json());
  assert.equal(revoke.status, "REVOKED");
  const inval = (await ledgerLines(s.ledger)).filter(e => e.action === "CONSENT_INVALIDATED");
  assert.equal(inval.length, 2);
});

test("M1 incident goes REOPENED after acceptance is invalidated", () => {
  const factory = createScenario();
  const ctx = buildPmContextFromState(INPUTS);
  const rec = createIncidentRecord(factory);
  syncIncidentFromEngine(rec, { certificate: ctx.certificate, impact: ctx.impact, plans: ctx.plans, approval: { planId: "hybrid", operator: "J" } });
  syncIncidentFromEngine(rec, { certificate: ctx.certificate, impact: ctx.impact, plans: ctx.plans, staleApproval: true });
  assert.equal(rec.state, "REOPENED");
});

/* ---------------- H6 claim checker ---------------- */
test("H6 claim checker: whole-token numbers, spelled-out numbers, assertions, entities", () => {
  const { payload } = buildBriefPayload(INPUTS);
  const check = s => checkBriefClaims(s, payload).blocked[0]?.reason || "ALLOWED";
  assert.equal(check("[evidence:metric:impactedUnits] 17 units affected."), "NUMBER_NOT_IN_EVIDENCE", "17 must not match 178");
  assert.equal(check("[evidence:metric:impactedUnits] 178 units affected."), "ALLOWED");
  assert.equal(check("[evidence:metric:impactedUnits] One hundred seventy-eight units affected."), "ALLOWED");
  assert.equal(check("[evidence:metric:impactedOrders] Seventy production jobs are late."), "NUMBER_NOT_IN_EVIDENCE");
  assert.equal(check("[evidence:metric:impactedOrders] Seven production jobs are held."), "ALLOWED");
  assert.equal(check("[evidence:scenario:AEROSPACE-40-LOT-CONFLICT] The supplier has confirmed the replacement lot ships tomorrow."), "UNSUPPORTED_ASSERTION");
  assert.equal(check("[evidence:scenario:AEROSPACE-40-LOT-CONFLICT] Material is not released before review."), "ALLOWED");
  const hybrid = payload.plans.find(p => p.id === "hybrid");
  assert.equal(check(`[evidence:plan:hybrid] It costs $${hybrid.estimatedCost.toLocaleString("en-US")}.`), "ALLOWED", "comma-formatted dollars");
  assert.equal(check("[evidence:plan:hybrid] It costs $1,000."), "NUMBER_NOT_IN_EVIDENCE");
  assert.equal(check(`[evidence:pm:cpi:hybrid] CPI is ${hybrid.evm.costPerformanceIndex.toFixed(2)}.`), "ALLOWED", "rounded decimal");
  assert.equal(check("[evidence:metric:impactedOrders] JOB-999 is urgent."), "ENTITY_NOT_IN_EVIDENCE");
  assert.equal(check("[evidence:plan:teleport] Free."), "UNKNOWN_EVIDENCE_ID");
  assert.deepEqual(extractNumbers("JOB-007 Ti-6Al-4V AMS4911").map(n => n.value), [], "identifiers are not quantities");
});

test("H6 sample brief passes; adversarial structured brief fails allowlist", async () => {
  const { processStructuredBrief } = await import("../src/structured-brief.mjs");
  const { payload } = buildBriefPayload(INPUTS);
  const sample = runSamplePlanner(payload);
  assert.equal(processStructuredBrief(sample.text, payload).complete, true);
  const adv = adversarialBrief(payload);
  const bad = processStructuredBrief(adv.text, payload);
  assert.equal(bad.complete, false);
  assert.ok(bad.schemaErrors.length >= 1);
});

test("H6 registry is server-built: a forged client summary cannot add evidence", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  const session = await createTestSession(s.base);
  const res = await post(s.base, "/api/meta-brief", session.jsonHeaders, {
    scenarioId: "AEROSPACE-40-LOT-CONFLICT", ...INPUTS,
    summary: { impactedUnits: 9999, findings: [] }, plans: [{ id: "free", label: "Free", estimatedCost: 0 }]
  }).then(r => r.json());
  assert.equal(res.status, "COMPLETE");
  assert.match(res.text, /178 units/);
  assert.doesNotMatch(res.text, /9999|Free/);
  const adv = await post(s.base, "/api/meta-brief", session.jsonHeaders, { scenarioId: "AEROSPACE-40-LOT-CONFLICT", ...INPUTS, mode: "adversarial" }).then(r => r.json());
  assert.notEqual(adv.status, "COMPLETE");
  assert.ok(adv.schemaErrors?.length || adv.blockedCount > 0);
  const none = await post(s.base, "/api/meta-brief", session.jsonHeaders, { scenarioId: "AEROSPACE-40-LOT-CONFLICT", certificateText: MATCHING_CERT });
  assert.equal(none.status, 409);
});

/* ---------------- H3 / M6 / L7 sample mode + live path ---------------- */
test("H3 sample mode is labeled in health, brief, model id and ledger", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  const health = await fetch(`${s.base}/api/health`).then(r => r.json());
  assert.equal(health.metaModeLabel, "Sample mode (no live Muse Spark key)");
  const session = await createTestSession(s.base);
  const brief = await post(s.base, "/api/meta-brief", session.jsonHeaders, { scenarioId: "AEROSPACE-40-LOT-CONFLICT", ...INPUTS }).then(r => r.json());
  assert.equal(brief.modeLabel, "Sample mode (no live Muse Spark key)");
  assert.equal(brief.model, "fixture-template");
  assert.equal(brief.verifiedLive, false);
  assert.ok((await ledgerLines(s.ledger)).some(e => e.action === "META_BRIEF" && e.detail.startsWith("sample:")));
  const app = await readFile(join(root, "src/app.mjs"), "utf8");
  for (const needle of ["Sample mode (no live Muse Spark key)", "SAMPLE MODE"]) assert.ok(app.includes(needle) || app.includes("SAMPLE_LABEL"), needle);
});

test("Live Muse Spark path: multi-step tool calls against engine, claim-checked (mock endpoint)", { timeout: 20000 }, async t => {
  const { payload } = buildBriefPayload(INPUTS);
  const seen = [];
  const mock = http.createServer(async (req, res) => {
    let raw = ""; for await (const c of req) raw += c;
    const body = JSON.parse(raw);
    seen.push({ auth: req.headers.authorization, tools: (body.tools || []).length, roles: body.messages.map(m => m.role) });
    const toolMsgs = body.messages.filter(m => m.role === "tool");
    let message;
    if (toolMsgs.length === 0) message = { role: "assistant", content: "", tool_calls: [{ id: "c1", type: "function", function: { name: "get_incident_summary", arguments: "{}" } }, { id: "c2", type: "function", function: { name: "list_recovery_plans", arguments: "{}" } }] };
    else if (toolMsgs.length === 2) message = { role: "assistant", content: "", tool_calls: [{ id: "c3", type: "function", function: { name: "get_plan_metrics", arguments: JSON.stringify({ planId: "hybrid" }) } }] };
    else {
      const plans = JSON.parse(toolMsgs[1].content).data;
      message = { role: "assistant", content: `[evidence:metric:impactedUnits] 178 units are held. [evidence:plan:${plans[0].id}] Cheapest is ${plans[0].label} at $${plans[0].estimatedCost}. [evidence:metric:impactedUnits] Only 17 units matter.` };
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ model: "muse-spark-1.3", choices: [{ message }] }));
  });
  await new Promise(r => mock.listen(0, "127.0.0.1", r));
  t.after(() => mock.close());
  const prev = { ...process.env };
  process.env.MODEL_API_KEY = "test-key-not-real";
  process.env.MODEL_API_BASE = `http://127.0.0.1:${mock.address().port}/v1`;
  t.after(() => { for (const k of ["MODEL_API_KEY", "MODEL_API_BASE"]) if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; });
  const out = await modelComplete({ provider: "muse-spark", messages: [{ role: "system", content: "x" }, { role: "user", content: "y" }], tools: BRIEF_TOOLS, executeTool: (n, a) => executeBriefTool(payload, n, a), maxSteps: 4 });
  assert.equal(out.verifiedLive, true);
  assert.deepEqual(out.trace.map(x => x.tool), ["get_incident_summary", "list_recovery_plans", "get_plan_metrics"]);
  assert.equal(seen[0].auth, "Bearer test-key-not-real");
  assert.equal(seen[0].tools, BRIEF_TOOLS.length);
  const claims = checkBriefClaims(out.content, payload);
  assert.equal(claims.blockedCount, 1, "live output still claim-checked");
  process.env.MODEL_API_BASE = "http://evil.example.com/v1";
  assert.throws(() => resolveMuseEndpoint(), /FORBIDDEN/);
});

/* ---------------- H4 Kanban ---------------- */
test("H4 Kanban: numeric due hours from CPM projectDurationHours, correct pluralization", () => {
  const ctx = buildPmContextFromState(INPUTS);
  const plan = ctx.plans[0];
  const cpm = ctx.pm.plans.find(p => p.planId === plan.id).cpm;
  const board = buildRecoveryKanban({ plan, cpm, wsjfRank: ctx.pm.wsjfRank, operator: "J", approvalJti: "x" });
  for (const c of board.cards) assert.ok(Number.isInteger(c.dueHour) && c.dueHour > 0, c.id);
  assert.equal(board.cards.at(-1).dueHour, Math.round(cpm.projectDurationHours));
  assert.doesNotMatch(JSON.stringify(board), /undefined|NaN|null/);
  const one = buildRecoveryKanban({ plan: { ...plan, lateJobs: 1 }, cpm, wsjfRank: [], operator: "J", approvalJti: "x" });
  assert.match(one.cards[2].title, /\(1 late job shop-wide\)/);
  assert.throws(() => buildRecoveryKanban({ plan, cpm: {}, wsjfRank: [], operator: "J", approvalJti: "x" }), /KANBAN_NEEDS_CPM_DURATION/);
});

/* ---------------- M2 / M3 Little's Law ---------------- */
test("M3 Little's Law is measured (event sweep), not circular, and verifies L = λW", () => {
  const factory = createScenario();
  const schedule = scheduleJobs(factory);
  const cells = littlesLawForCells(schedule, factory, { affectedMachines: factory.machines.map(m => m.id) });
  for (const c of cells) {
    assert.ok(c.averageItemsInSystem < c.wipJobs, "L is a time average, not the job count");
    assert.ok(Math.abs(c.averageItemsInSystem - c.throughputJobsPerHour * c.averageTimeInSystemHours) < 0.02);
    assert.notEqual(c.averageTimeInSystemHours, c.observationWindowHours, "W is not just the makespan");
    assert.ok(c.utilizationPct > 0 && c.utilizationPct <= 100);
  }
  const held = littlesLawForCells(schedule, factory, { affectedMachines: factory.machines.map(m => m.id) }, Object.fromEntries(schedule.map(r => [r.id, r.start])));
  assert.ok(held.every(c => c.averageQueueWaitHours === 0), "arrivals change the measurement");
});

/* ---------------- M5 CPM labeling data ---------------- */
test("M5 every plan exposes impacted-job finish delta alongside shop CPM delta", () => {
  const ctx = buildPmContextFromState(INPUTS);
  for (const p of ctx.pm.plans) assert.ok(Number.isFinite(p.cpm.impactedFinishDeltaHours));
  assert.ok(new Set(ctx.pm.plans.map(p => p.cpm.impactedFinishDeltaHours)).size > 1, "impacted delta varies across plans");
});

/* ---------------- H5 / L8 PDF ---------------- */
function flatePdf(lines) {
  const content = "BT /F1 12 Tf 72 720 Td " + lines.map((l, i) => `${i ? "0 -16 Td " : ""}(${l}) Tj`).join(" ") + " ET";
  const z = deflateSync(Buffer.from(content, "latin1"));
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];
  let out = "%PDF-1.4\n";
  const parts = [Buffer.from(out, "latin1")];
  objs.forEach((o, i) => {
    if (o) parts.push(Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, "latin1"));
    else parts.push(Buffer.from(`${i + 1} 0 obj\n<< /Length ${z.length} /Filter /FlateDecode >>\nstream\n`, "latin1"), z, Buffer.from("\nendstream\nendobj\n", "latin1"));
  });
  parts.push(Buffer.from("trailer << /Root 1 0 R >>\n%%EOF\n", "latin1"));
  return Buffer.concat(parts);
}

test("H5 PDF: FlateDecode stream text is extracted and fields parsed", async () => {
  const pdf = flatePdf(INCORRECT_CERT.trim().split("\n"));
  const layer = extractPdfTextLayer(pdf);
  assert.equal(layer.compressed, true);
  assert.match(layer.text, /Heat Number: H-7713/);
  const r = await processPdfCertificate(pdf, { provider: "fixture" });
  assert.equal(r.route, "PROCESSING");
  assert.equal(r.decision.heat, "H-7713");
});

test("H5 PDF: bundled Chrome-printed (Type0/ToUnicode, compressed) samples parse", async () => {
  const conflict = await processPdfCertificate(await readFile(join(root, "fixtures/pdf/sample-cert-conflict.pdf")), { provider: "fixture" });
  assert.equal(conflict.route, "PROCESSING");
  assert.deepEqual([conflict.decision.po, conflict.decision.heat, conflict.decision.grade], ["PO-45892", "H-7713", "AMS4928"]);
  const matching = await processPdfCertificate(await readFile(join(root, "fixtures/pdf/sample-cert-matching.pdf")), { provider: "fixture" });
  assert.equal(matching.route, "PROCESSING");
});

test("L8 PDF without a text layer reports TEXT_LAYER_UNREADABLE (no fake OCR code)", async () => {
  const imageOnly = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Page /Contents 2 0 R >>\nendobj\n2 0 obj\n<< /Length 20 >>\nstream\nq 100 0 0 100 0 0 cm Q\nendstream\nendobj\n%%EOF\n");
  const r = await processPdfCertificate(imageOnly, { provider: "fixture" });
  assert.equal(r.reason, "TEXT_LAYER_UNREADABLE");
  assert.match(r.message, /does not perform OCR/);
  const srcFiles = (await readdir(join(root, "src"))).filter(f => f.endsWith(".mjs"));
  for (const f of srcFiles) assert.doesNotMatch(await readFile(join(root, "src", f), "utf8"), /OCR_FAIL/);
});

test("H5 PDF sample route works over HTTP and is ledgered with the session operator", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  const session = await createTestSession(s.base);
  await approve(s.base, session);
  const r = await post(s.base, "/api/pdf-intake/sample", session.jsonHeaders, { sample: "conflict" }).then(r => r.json());
  assert.equal(r.route, "PROCESSING");
  const entry = (await ledgerLines(s.ledger)).find(e => e.action === "PDF_INTAKE");
  assert.equal(entry.actor, "Justin Evans");
});

/* ---------------- H2 ledger ---------------- */
test("H2 ledger: edit on disk while running is detected on demand", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  const session = await createTestSession(s.base);
  await approve(s.base, session);
  assert.equal((await fetch(`${s.base}/api/audit/verify`).then(r => r.json())).ok, true);
  const lines = (await readFile(s.ledger, "utf8")).trim().split("\n");
  const row = JSON.parse(lines[1]); row.actor = "someone-else"; lines[1] = JSON.stringify(row);
  await writeFile(s.ledger, lines.join("\n") + "\n");
  const v = await fetch(`${s.base}/api/audit/verify`).then(r => r.json());
  assert.equal(v.ok, false);
  assert.equal(v.reason, "HASH_MISMATCH");
  const health = await fetch(`${s.base}/api/health`).then(r => r.json());
  assert.equal(health.status, "ledger_tampered");
  const blocked = await post(s.base, "/api/consent/review", session.jsonHeaders, { planId: "hybrid", operator: "Justin Evans", ...INPUTS });
  assert.equal(blocked.status, 423, "consent fails closed when ledger is untrusted");
});

test("H2 ledger: periodic verification catches tail truncation while running", { timeout: 20000 }, async t => {
  const s = await boot({ LEDGER_VERIFY_INTERVAL_MS: "2000" }); t.after(() => s.child.kill());
  const session = await createTestSession(s.base);
  await approve(s.base, session);
  const lines = (await readFile(s.ledger, "utf8")).trim().split("\n");
  await writeFile(s.ledger, lines.slice(0, -2).join("\n") + "\n");
  await sleep(2600);
  const health = await fetch(`${s.base}/api/health`).then(r => r.json());
  assert.equal(health.ledgerIntegrity.ok, false);
  assert.match(health.ledgerIntegrity.reason, /TRUNCATED|ANCHOR/);
});

test("H2 ledger: chain rewritten with recomputed SHA-256 (no key) fails HMAC at restart", { timeout: 30000 }, async t => {
  const s = await boot();
  const session = await createTestSession(s.base);
  await approve(s.base, session);
  s.child.kill();
  await sleep(200);
  const rows = await ledgerLines(s.ledger);
  let prev = "0".repeat(64);
  const rewritten = rows.map(r => {
    const body = { at: r.at, prev_hash: prev, actor: r.actor === "Justin Evans" ? "forger" : r.actor, action: r.action, detail: r.detail };
    const entry_hash = sha256Hex(JSON.stringify(body));
    prev = entry_hash;
    return { ...body, entry_hash, mac: r.mac };
  });
  await writeFile(s.ledger, rewritten.map(r => JSON.stringify(r)).join("\n") + "\n");
  const s2child = spawn(process.execPath, ["server.mjs"], { cwd: root, env: { ...process.env, PORT: String(s.port), AUDIT_LEDGER_PATH: s.ledger, META_BRIEF_MODE: "sample" }, stdio: "ignore" });
  t.after(() => s2child.kill());
  let health;
  for (let i = 0; i < 100; i++) { try { health = await fetch(`${s.base}/api/health`).then(r => r.json()); break; } catch { await sleep(50); } }
  assert.equal(health.ledgerIntegrity.ok, false);
  assert.match(health.ledgerIntegrity.reason, /MAC_INVALID|ANCHOR/);
});

test("H2 in-memory ledger API supports HMAC keys", () => {
  const l = createLedger();
  appendLedgerEntry(l, { actor: "a", action: "A", detail: "1" }, { key: "k".repeat(32) });
  assert.equal(verifyLedger(l, { key: "k".repeat(32) }).ok, true);
  assert.equal(verifyLedger(l, { key: "z".repeat(32) }).reason, "MAC_INVALID");
});

/* ---------------- L6 operator names ---------------- */
test("L6 Kanban moves and briefs are ledgered under the real operator", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  const session = await createTestSession(s.base);
  await approve(s.base, session, "hybrid", "Justin Evans");
  const hdrs = { ...session.jsonHeaders, "X-Scenario-Hash": scenarioHash(INPUTS) };
  const board = await fetch(`${s.base}/api/kanban`, { headers: hdrs }).then(r => r.json());
  assert.equal((await post(s.base, "/api/kanban/move", hdrs, { cardId: board.board.cards[0].id, column: "in_progress" })).status, 200);
  await post(s.base, "/api/meta-brief", session.jsonHeaders, { scenarioId: "AEROSPACE-40-LOT-CONFLICT", ...INPUTS });
  const rows = await ledgerLines(s.ledger);
  assert.equal(rows.find(e => e.action === "KANBAN_MOVE").actor, "Justin Evans");
  assert.equal(rows.find(e => e.action === "META_BRIEF").actor, "Justin Evans");
  assert.ok(!rows.some(e => e.actor === "operator"));
});

/* ---------------- M8 rate limits / sessions ---------------- */
test("M8 /api/session is rate limited and the session map is capped", { timeout: 20000 }, async t => {
  const s = await boot(); t.after(() => s.child.kill());
  let saw429 = false;
  for (let i = 0; i < ROUTE_LIMITS.session.perIp + 2; i++) {
    const r = await fetch(`${s.base}/api/session`);
    if (r.status === 429) { saw429 = true; assert.ok(r.headers.get("retry-after")); break; }
  }
  assert.equal(saw429, true);
  resetSessionsForTests();
  for (let i = 0; i < MAX_SESSIONS + 25; i++) { const s = createOperatorSession("127.0.0.1"); assert.equal(s.ok, true); }
  assert.ok(sessionCount() <= MAX_SESSIONS);
  for (const key of ["read", "ledger-verify", "session"]) assert.ok(ROUTE_LIMITS[key].perIp > 0);
});

/* ---------------- M9 smoke finder ---------------- */
test("M9 browser smoke finds Windows Chrome/Edge and honors CHROME_PATH", () => {
  const win = chromeCandidates({ PROGRAMFILES: "C:\\Program Files", "PROGRAMFILES(X86)": "C:\\Program Files (x86)", LOCALAPPDATA: "C:\\Users\\j\\AppData\\Local", PATH: "" }, "win32");
  assert.ok(win.some(p => /Google.Chrome.Application.chrome\.exe$/.test(p)));
  assert.ok(win.some(p => /Microsoft.Edge.Application.msedge\.exe$/.test(p)));
  assert.equal(chromeCandidates({ CHROME_PATH: "/opt/x/chrome", PATH: "" }, "linux")[0], "/opt/x/chrome");
});

/* ---------------- L1 / L12 build + secrets ---------------- */
test("L1/L12 health reports round r18 and no hard-coded consent secret", { timeout: 20000 }, async t => {
  const s = await boot({ CONSENT_HMAC_SECRET: "" }); t.after(() => s.child.kill());
  const h = await fetch(`${s.base}/api/health`).then(r => r.json());
  assert.equal(h.buildRound, "r18");
  assert.equal(h.buildLabel, "round18");
  assert.equal(h.buildVersion, "0.9.0");
  assert.match(h.build, /r18/);
  assert.equal(h.consentSecretSource, "ephemeral-random");
  assert.equal(h.consentSecretStrength, "strong");
  assert.match((await ledgerLines(s.ledger))[0].detail, /round18|r18|Factory Resilience/);
  // The known-dev string may appear in the reject-list; what matters is it can never
  // be the effective secret without an explicit ALLOW_WEAK_CONSENT_SECRET=1, and even
  // then health reports strength=weak.
  const { consentHmacSecret, consentSecretSource, resetConsentSecretForTests, isWeakConsentSecret } = await import("../src/security/consent-secret.mjs");
  resetConsentSecretForTests();
  process.env.CONSENT_HMAC_SECRET = "local-dev-consent-secret-not-for-production";
  delete process.env.ALLOW_WEAK_CONSENT_SECRET;
  assert.throws(() => consentHmacSecret(), /CONSENT_HMAC_SECRET_WEAK/);
  process.env.ALLOW_WEAK_CONSENT_SECRET = "1";
  assert.equal(consentSecretSource(), "known-dev-fallback");
  assert.equal(isWeakConsentSecret(), true);
  delete process.env.CONSENT_HMAC_SECRET;
  delete process.env.ALLOW_WEAK_CONSENT_SECRET;
  resetConsentSecretForTests();
});

/* ---------------- docs / UI claim-drift guard ---------------- */
test("claim-drift guard: retired overclaims do not reappear in UI or docs", async () => {
  const files = ["index.html", "src/app.mjs", "README.md", "docs/DEMO_SCRIPT_2MIN.md", "docs/SECURITY_AUDIT_STEPLADDER.md", "docs/PROVENANCE.md"];
  for (const f of files) {
    const text = await readFile(join(root, f), "utf8");
    assert.doesNotMatch(text, /(?<!not )tamper-proof/i, `${f}: tamper-proof`);
    assert.doesNotMatch(text, /atomic consent/i, `${f}: atomic consent`);
    assert.doesNotMatch(text, /Unsupported claims blocked/i, `${f}: old meter label`);
    assert.doesNotMatch(text, /muse-spark-1\.3-fixture|OCR_FAIL/, `${f}: fixture id / OCR code`);
  }
  const demo = await readFile(join(root, "docs/DEMO_SCRIPT_2MIN.md"), "utf8");
  assert.match(demo, /4310/);
  assert.doesNotMatch(demo, /\bDrag\b/);
  assert.doesNotMatch(demo, /Expand Project Management/i);
});
