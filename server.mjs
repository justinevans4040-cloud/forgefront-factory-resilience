import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreBriefGrounding } from "./src/meta-grounding.mjs";
import { parseDocument, reconcilePacket } from "./src/intake.mjs";
import { createScenario } from "./src/scenario.mjs";
import { validateCertificate } from "./src/engine.mjs";
import { modelComplete, resolveProvider, museModelId } from "./src/model-adapter.mjs";
import { checkBriefClaims, buildEvidenceRegistry, hashRegistry } from "./src/claim-checker.mjs";
import { processPdfCertificate } from "./src/pdf-intake.mjs";
import { mintReviewToken, verifyConfirmToken, parseConsentToken, hashPlan, planParameters, DEFAULT_TTL_SEC, MAX_APPROVAL_TTL_SEC, sealApprovalEnvelope, verifyApprovalEnvelope, sessionDigest } from "./src/consent-gate.mjs";
import { appendPersistedEntry, loadPersistedLedger, verifyPersistedLedger, ledgerKeySource, ledgerPath } from "./src/audit-ledger-persist.mjs";
import { configureNonceStore, nonceStore } from "./src/security/nonce-store.mjs";
import { IdempotencyStore, validIdempotencyKey, mintIdempotencyKey, fingerprintOf } from "./src/security/idempotency.mjs";
import { MissionTracker, makeEvent, kindForAction, verifyMissionChain, MISSION_STAGES } from "./src/mission.mjs";
import { arbitrateCellContention, arbitrateAiVsEngine } from "./src/arbitration.mjs";
import { resolveDeterministic, sampleAnswerPlanner, AnswerCache, PROVENANCE } from "./src/resolution-ladder.mjs";
import { runProveIt } from "./src/prove-it.mjs";
import { scanSupplierText } from "./src/prompt-defense.mjs";
import { dirname, join } from "node:path";
import { readBodyLimited, decodeBase64Limited, publicErrorMessage, safeStaticPath } from "./src/security/http-utils.mjs";
import { consentSecretSource, consentHmacSecret } from "./src/security/consent-secret.mjs";
import { corsDenyHeaders, validateHostAndOrigin } from "./src/security/request-guard.mjs";
import { createOperatorSession, validateOperatorSession, bindSessionOperator, sessionOperator } from "./src/security/session-auth.mjs";
import { ROUTE_LIMITS, checkRateLimits, checkDailyBudget, withConcurrency } from "./src/security/rate-limit.mjs";
import { buildPmContextFromState } from "./src/pm/pm-analysis.mjs";
import { buildRecoveryKanban, moveKanbanCard, KANBAN_COLUMNS } from "./src/pm/kanban.mjs";
import { getKanbanBoard, getOperatorApproval, peekOperatorApproval, revokeOperatorApproval, setOperatorApproval, updateKanbanBoard, approvalTtlMs, approvalCount, kanbanCount, expireOperatorApprovalForProof } from "./src/pm/operator-state.mjs";
import { scenarioHash } from "./src/scenario-hash.mjs";
import { buildBriefPayload, BRIEF_TOOLS, executeBriefTool, runSamplePlanner, adversarialBrief, SAMPLE_MODE_LABEL } from "./src/brief-context.mjs";
import { processStructuredBrief } from "./src/structured-brief.mjs";
import { stashRawModelAudit, peekRawModelAudit } from "./src/raw-model-audit-store.mjs";
import { COMMENTARY_WITHHELD_NOTICE } from "./src/security/commentary-decision-screen.mjs";
import { createProgramBridge, defaultBridgePath } from "./src/program-bridge.mjs";

const base = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
// Display round for R18 Command Center V3 (sealed R17 zip remains rollback authority on disk).
const BUILD_ROUND = "r18";
const PROGRAM_INTEGRATION = "command-center-v3-r18";
const programBridge = createProgramBridge({ path: process.env.PROGRAM_BRIDGE_PATH || defaultBridgePath(base) });
await programBridge.load();
const packageJson = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
const PACKAGE_VERSION = String(packageJson.version || "0.0.0");
let buildInfo = {
  round: BUILD_ROUND,
  version: PACKAGE_VERSION,
  tag: `izzy-parallel-${PACKAGE_VERSION}-r18+${PROGRAM_INTEGRATION}`,
  commit: process.env.BUILD_COMMIT || null,
  programIntegration: PROGRAM_INTEGRATION
};
try {
  const info = JSON.parse(await readFile(new URL("./BUILD_INFO.json", import.meta.url), "utf8"));
  // Round / version / tag ALWAYS come from this source file + package.json — BUILD_INFO.json
  // may only supply commit (or be absent). This closes the "health still says r4 on round 7" drift.
  buildInfo = {
    ...buildInfo,
    commit: info.commit || buildInfo.commit
  };
} catch {}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};
const baseHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  ...corsDenyHeaders
};

/** Headers for Command Center V3 Program assets (same-origin iframe + inline script legacy UI). */
function staticHeadersFor(relPath) {
  const norm = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!norm.startsWith("vendor/command-center-v3/")) return { ...baseHeaders };
  const headers = { ...baseHeaders };
  delete headers["X-Frame-Options"];
  // Same-origin Program embed only. Inline scripts required by legacy ForgeFront_PM.html.
  headers["Content-Security-Policy"] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'"
  ].join("; ");
  return headers;
}

const MAX_JSON_BODY = 96_000;
const MAX_PDF_JSON_BODY = 700_000;
const MAX_PDF_BYTES = 512_000;
const MAX_DOC_TEXT = 64_000;
const LEDGER_VERIFY_INTERVAL_MS = Math.max(2000, Number(process.env.LEDGER_VERIFY_INTERVAL_MS) || 30_000);
const SAMPLE_PDFS = { conflict: "fixtures/pdf/sample-cert-conflict.pdf", matching: "fixtures/pdf/sample-cert-matching.pdf" };

let auditLedger = null;
let ledgerStatus = { ok: true, reason: null, checkedAt: null, length: 0, tip: null };
let ledgerQueue = Promise.resolve();
const missions = new MissionTracker();
const idempotency = new IdempotencyStore();
const answerCache = new AnswerCache();
let lastProveIt = null;

const send = (res, status, value, extra = {}) => {
  res.writeHead(status, { ...baseHeaders, "Content-Type": "application/json; charset=utf-8", ...extra });
  res.end(JSON.stringify(value));
};

const clientIp = req => (req.socket?.remoteAddress || "127.0.0.1").replace("::ffff:", "");

function jsonContentTypeOk(req) {
  const ct = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  return ct === "application/json";
}

/** Returns null and sends 415 when Content-Type is not application/json. */
async function bodyJSON(req, res, maxBytes = MAX_JSON_BODY) {
  if (!jsonContentTypeOk(req)) {
    if (res) send(res, 415, { status: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json" });
    return null;
  }
  const raw = await readBodyLimited(req, maxBytes);
  return raw ? JSON.parse(raw) : {};
}

function ledgerTrusted(res) {
  if (ledgerStatus.ok) return true;
  send(res, 423, { status: "LEDGER_TAMPERED", message: "This action is disabled while the audit ledger fails verification." });
  return false;
}

function guardRequest(req, res, { requireSession = false } = {}) {
  if (req.method === "OPTIONS") {
    send(res, 403, { error: "CORS denied" });
    return false;
  }
  const hostOrigin = validateHostAndOrigin(req, port);
  if (!hostOrigin.ok) {
    send(res, 403, { status: "FORBIDDEN", reason: hostOrigin.reason });
    return false;
  }
  if (requireSession) {
    const auth = validateOperatorSession(req, { requireCsrf: true });
    if (!auth.ok) {
      send(res, 401, { status: "UNAUTHORIZED", reason: auth.reason });
      return false;
    }
    return auth;
  }
  return true;
}

async function enforceLimits(req, res, routeKey) {
  const profile = ROUTE_LIMITS[routeKey];
  const ip = clientIp(req);
  const rate = checkRateLimits({ ip, route: routeKey, profile });
  if (!rate.allowed) {
    send(res, 429, { status: "RATE_LIMITED", scope: rate.scope }, { "Retry-After": String(rate.retryAfter) });
    return false;
  }
  const budget = checkDailyBudget(routeKey, profile.costPerCall, profile.dailyUnits);
  if (!budget.allowed) {
    send(res, 429, { status: "DAILY_BUDGET_EXCEEDED" }, { "Retry-After": String(budget.retryAfter) });
    return false;
  }
  return { ip, profile };
}

function metaBriefMode() {
  const mode = (process.env.META_BRIEF_MODE || "auto").toLowerCase();
  if (mode === "fixture" || mode === "sample") return "sample";
  if (mode === "live") return "live";
  return process.env.MODEL_API_KEY ? "live" : "sample";
}

function briefProvider() {
  const mode = metaBriefMode();
  if (mode === "sample") return "fixture";
  return process.env.MODEL_API_KEY ? "muse-spark" : resolveProvider(process.env.MODEL_PROVIDER);
}

const SYSTEM_PROMPT = [
  "You are the incident-briefing assistant inside ForgeFront Factory Resilience (synthetic aerospace scenario).",
  "Call the read-only tools, then respond with JSON ONLY (no markdown prose decisions).",
  'Schema: {"claims":[...],"advisory":[{"type":"<advisory_enum>","evidenceIds":[...],"params":{}}]} — do NOT send free-text commentary.',
  `Allowed claim types ONLY: CERT_FIELD_STATUS, IMPACT_HOLD, RECOVERY_PLAN_ESTIMATE, PM_METRICS_SYNTHETIC, WSJF_FIX_FIRST, SCENARIO_HOLD_REMINDER.`,
  "Allowed advisory types ONLY: RISK_NOTE, CONTEXT_NOTE, DATA_GAP, SUGGESTED_CHECK (each with evidenceIds + constrained params). Free prose is dropped.",
  "Each claim must cite evidence ids returned by tools. Never invent numbers."
].join(" ");

function modeLabel(result) {
  if (result.mode === "adversarial") return "Adversarial self-test (canned bad sentences — no model call)";
  if (result.verifiedLive) return result.provider === "llama" ? "Live Llama (local)" : `Live Muse Spark (${result.model})`;
  return SAMPLE_MODE_LABEL;
}

async function metaBrief(pack, { adversarial = false } = {}) {
  const { payload } = pack;
  const registry = buildEvidenceRegistry(payload);
  const provider = adversarial ? "fixture" : briefProvider();
  const sample = adversarial ? { text: adversarialBrief(payload).text, trace: [] } : runSamplePlanner(payload);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Explain scenario ${payload.scenarioId}: what conflicts, what is held, which recovery option is cheapest and its schedule/cost effect, and what to fix first.` }
  ];
  try {
    const model = await modelComplete({
      provider, messages, sample,
      tools: BRIEF_TOOLS,
      executeTool: (name, args) => executeBriefTool(payload, name, args),
      maxSteps: 4
    });
    const common = {
      provider: model.provider, model: model.model, verifiedLive: Boolean(model.verifiedLive),
      mode: adversarial ? "adversarial" : model.verifiedLive ? "live" : "sample",
      trace: model.trace || [], registrySize: registry.size, registryHash: hashRegistry(registry), scenarioHash: pack.scenarioHash
    };
    common.modeLabel = modeLabel(common);
    if (model.blocked) {
      return { ...common, status: "BLOCKED", message: "Model output attempted approval/release language and was rejected.", screenViolations: model.screenViolations, blockedCount: 1 };
    }
    const processed = processStructuredBrief(model.content, payload, { registry });
    const claims = processed.decisionText
      ? checkBriefClaims(processed.decisionText, payload, { registry })
      : { blockedCount: 1, blocked: [], results: [], citations: [], totalSentences: 0 };
    const arbitration = arbitrateAiVsEngine({
      allowed: claims.results?.filter(r => r.allowed) || [],
      blocked: claims.blocked || [],
      registry,
      modelLabel: common.verifiedLive ? common.model : "sample-mode"
    });
    const status = processed.complete ? "COMPLETE" : "PARTIAL";
    return {
      ...common, status,
      text: processed.displayText,
      decisionText: processed.decisionText,
      commentary: processed.commentary,
      advisoryText: processed.advisoryText,
      advisoryDroppedCount: processed.advisoryDroppedCount,
      rawModelProse: processed.rawModelProse,
      rawModelScreened: processed.rawModelScreened,
      commentaryBlocked: processed.commentaryBlocked,
      commentaryWithheld: processed.commentaryWithheld,
      schemaErrors: processed.schemaErrors,
      allowlistArchitecture: processed.architecture,
      blockedCount: processed.blockedCount,
      blocked: (claims.blocked || []).map(b => ({ sentence: b.sentence.slice(0, 300), reason: b.reason, detail: b.detail })),
      citations: processed.citations,
      grounding: processed.grounding,
      provenance: PROVENANCE.MUSE,
      arbitration: { tally: arbitration.tally, decisions: arbitration.decisions.map(slimDecision) },
      claimAudit: { totalSentences: claims.totalSentences ?? 0, registrySize: registry.size, structuredClaims: processed.claimCount }
    };
  } catch {
    return { status: "API_ERROR", message: "Model request failed. The deterministic engine is unaffected.", verifiedLive: false, provider, mode: "error", modeLabel: provider === "fixture" ? SAMPLE_MODE_LABEL : "Live model unavailable" };
  }
}

function truncateText(value) {
  const s = String(value || "");
  return s.length > MAX_DOC_TEXT ? s.slice(0, MAX_DOC_TEXT) : s;
}

function scenarioInputs(body) {
  return {
    certificateText: truncateText(body?.certificateText ?? ""),
    assumptions: body?.assumptions && typeof body.assumptions === "object" ? body.assumptions : {},
    disruptions: body?.disruptions && typeof body.disruptions === "object" ? body.disruptions : {}
  };
}

const slimDecision = d => ({ id: d.id, kind: d.kind, status: d.status, subject: d.subject, sentence: d.sentence, checkReason: d.checkReason, cell: d.cell, cellLabel: d.cellLabel, planId: d.planId, slotStartHour: d.slotStartHour, shocksInvolved: d.shocksInvolved, value: d.value, winnerClaimId: d.winnerClaimId, supportingClaimIds: d.supportingClaimIds, scores: d.scores, factors: d.factors, margin: d.margin, authority: d.authority || null, rationale: d.rationale, candidates: d.candidates });

/**
 * Serialized, fail-closed ledger append. Every entry gets a typed event envelope
 * (schema, event_id, trace_id, kind, parent_event_id, idempotency_key) inside the hashed body.
 * Returns the stored row, or false when the ledger is untrusted.
 */
function ledgerAppend(entry) {
  const { traceId, ...rest } = entry;
  const row = { ...rest, event: rest.event || makeEvent({ kind: kindForAction(rest.action), traceId: traceId || "system" }) };
  const job = ledgerQueue.then(async () => {
    if (!ledgerStatus.ok) return false;
    const stored = await appendPersistedEntry(auditLedger, row);
    ledgerStatus = { ...ledgerStatus, length: auditLedger.entries.length, tip: auditLedger.tip };
    return stored;
  });
  ledgerQueue = job.catch(() => false);
  return job;
}

async function verifyLedgerNow() {
  const run = ledgerQueue.then(async () => {
    const result = await verifyPersistedLedger({ length: auditLedger.entries.length, tip: auditLedger.tip });
    const { ledger: _omit, ...proof } = result;
    if (ledgerStatus.ok && !proof.ok) console.error(`[ledger] verification FAILED: ${proof.reason}`);
    ledgerStatus = { ...proof, ok: ledgerStatus.ok && proof.ok, reason: ledgerStatus.ok ? proof.reason || null : ledgerStatus.reason };
    return ledgerStatus;
  });
  ledgerQueue = run.catch(() => false);
  return run;
}

function ledgerView() {
  return {
    ok: Boolean(ledgerStatus.ok), tampered: !ledgerStatus.ok, reason: ledgerStatus.reason || null,
    length: auditLedger?.entries.length ?? 0, tip: auditLedger?.tip ?? null, checkedAt: ledgerStatus.checkedAt,
    keyed: true, anchored: true, keySource: ledgerKeySource(), verifyIntervalMs: LEDGER_VERIFY_INTERVAL_MS,
    guarantee: "hash-chained, HMAC-keyed, head-anchored, witness + notary dual-secret, tamper-evident (not tamper-proof)"
  };
}

const operatorFor = auth => sessionOperator(auth.sessionToken) || "unbound-session";
const missionKey = auth => sessionDigest(auth.sessionToken);
const currentTrace = auth => missions.current(missionKey(auth))?.traceId || "unbound";

/* ---------------- Mission chain (intent → plan → approval → effect → outcome) ---------------- */
async function closeMission(auth, outcome, why, actor) {
  const mission = missions.current(missionKey(auth));
  if (!mission) return null;
  const stored = await ledgerAppend({ actor, action: "MISSION_OUTCOME", detail: `${outcome}: ${why}`, event: missions.next(mission, "outcome") });
  return { traceId: mission.traceId, outcome, eventId: stored?.event?.event_id || null };
}

async function openMission(auth, sh, actor, ctx) {
  const key = missionKey(auth);
  const open = missions.current(key);
  if (open && open.scenarioHash === sh) return open;
  if (open) await closeMission(auth, "SUPERSEDED", "scenario changed before the mission completed", actor);
  const { mission } = missions.ensure(key, sh);
  const conflict = ctx.certificate.findings.filter(f => f.status !== "MATCH").map(f => `${f.field} ${f.observed ?? "missing"}≠${f.expected}`).join(", ") || "no field conflict";
  await ledgerAppend({ actor, action: "MISSION_INTENT", detail: `Resolve ${conflict} on ${ctx.factory.incomingLotId}: ${ctx.impact.jobIds.length} jobs / ${ctx.impact.units} units held · scenario ${sh.slice(0, 12)}`, event: missions.next(mission, "intent") });
  return mission;
}

function stageEvent(auth, kind, idempotencyKey = null) {
  const mission = missions.current(missionKey(auth));
  return mission ? missions.next(mission, kind, idempotencyKey) : makeEvent({ kind: "audit", traceId: "unbound", idempotencyKey });
}

/* ---------------- Idempotency (approvals + Kanban moves) ---------------- */
function idempotencyKeyFor(req, res) {
  const raw = req.headers["idempotency-key"];
  if (raw === undefined) return { key: mintIdempotencyKey(), minted: true };
  const key = String(raw);
  if (!validIdempotencyKey(key)) { send(res, 400, { status: "INVALID_IDEMPOTENCY_KEY", message: "Idempotency-Key must be 8–128 chars of [A-Za-z0-9_.:-]." }); return null; }
  return { key, minted: false };
}

/** Returns true when the request was fully handled (replay / conflict / in-flight). */
function idempotencyGate(res, auth, scope, key, fingerprint) {
  const verdict = idempotency.begin(missionKey(auth), scope, key, fingerprint);
  if (verdict.state === "new") return false;
  if (verdict.state === "replay") { send(res, verdict.status, { ...verdict.body, idempotentReplay: true }, { "Idempotency-Key": key, "Idempotent-Replay": "true" }); return true; }
  if (verdict.state === "conflict") { send(res, 422, { status: "IDEMPOTENCY_KEY_REUSED", message: "This Idempotency-Key was already used for a different request." }); return true; }
  send(res, 409, { status: "IDEMPOTENCY_IN_FLIGHT" });
  return true;
}

function finishIdempotent(res, auth, scope, key, status, body, eventId) {
  idempotency.finish(missionKey(auth), scope, key, status, body, eventId);
  send(res, status, body, { "Idempotency-Key": key });
}

/** Approval must be live, its sealed envelope valid, AND bound to the scenario the browser shows. */
async function requireLiveApproval(req, res, auth) {
  const prior = peekOperatorApproval(auth.sessionToken);
  const approval = getOperatorApproval(auth.sessionToken);
  if (!approval) {
    if (prior) {
      await ledgerAppend({ actor: prior.operator, action: "CONSENT_EXPIRED", detail: prior.planId, traceId: currentTrace(auth) });
      await closeMission(auth, "EXPIRED", `approval for ${prior.planId} passed its ${prior.envelope?.ttlSec ?? "?"} s TTL`, prior.operator);
    }
    send(res, 403, { status: prior ? "CONSENT_EXPIRED" : "CONSENT_REQUIRED", message: prior ? "Scenario approval expired; review and confirm again." : "Accept a recovery plan before opening the board." });
    return null;
  }
  const claimed = String(req.headers["x-scenario-hash"] || "");
  if (!claimed) {
    send(res, 400, { status: "SCENARIO_HASH_REQUIRED" });
    return null;
  }
  const env = verifyApprovalEnvelope(approval.envelope, { sessionToken: auth.sessionToken });
  if (!env.ok) {
    revokeOperatorApproval(auth.sessionToken);
    await ledgerAppend({ actor: approval.operator, action: "CONSENT_INVALIDATED", detail: `${approval.planId}:${env.reason}`, traceId: currentTrace(auth) });
    await closeMission(auth, env.reason === "APPROVAL_EXPIRED" ? "EXPIRED" : "INVALIDATED", env.reason, approval.operator);
    send(res, 403, { status: env.reason === "APPROVAL_EXPIRED" ? "CONSENT_EXPIRED" : "ENVELOPE_INVALID", reason: env.reason });
    return null;
  }
  if (claimed !== approval.scenarioHash) {
    revokeOperatorApproval(auth.sessionToken);
    await ledgerAppend({ actor: approval.operator, action: "CONSENT_INVALIDATED", detail: `${approval.planId}:scenario-changed`, traceId: currentTrace(auth) });
    await closeMission(auth, "SUPERSEDED", "scenario changed after acceptance", approval.operator);
    send(res, 409, { status: "APPROVAL_STALE", message: "Scenario changed since acceptance; approval invalidated." });
    return null;
  }
  return approval;
}

/** Deterministic-first resolution ladder: engine → cache → Muse Spark, with per-answer provenance. */
async function answerQuestion(auth, question, inputs) {
  const pack = buildBriefPayload(inputs);
  const { payload } = pack;
  const registry = buildEvidenceRegistry(payload);
  const ladder = [];
  const actor = operatorFor(auth);
  const finish = (claims, extra) => ({
    question, scenarioHash: pack.scenarioHash, registrySize: registry.size, ladder,
    text: claims.allowedText, citations: claims.citations, blockedCount: claims.blockedCount,
    blocked: claims.blocked.map(b => ({ sentence: b.sentence.slice(0, 300), reason: b.reason, detail: b.detail })), ...extra
  });

  // Rung 1 — deterministic engine
  const det = resolveDeterministic(question, payload);
  if (det.answered) {
    ladder.push({ rung: "engine", outcome: "answered", detail: `resolver ${det.resolver}` });
    const claims = checkBriefClaims(det.text, payload, { registry });
    const stored = await ledgerAppend({ actor, action: "ASK_ANSWERED", detail: `provenance=engine resolver=${det.resolver} blocked=${claims.blockedCount}`, traceId: currentTrace(auth) });
    return finish(claims, { provenance: PROVENANCE.ENGINE, provenanceLabel: "Engine (deterministic)", resolver: det.resolver, policy: det.policy || null, eventId: stored?.event?.event_id || null });
  }
  ladder.push({ rung: "engine", outcome: "not-enough", detail: `${det.reason}: ${det.why}` });

  // Rung 2 — cache of verified Muse Spark answers for this exact scenario
  const cached = answerCache.get(pack.scenarioHash, question);
  if (cached) {
    ladder.push({ rung: "cache", outcome: "hit", detail: `verified answer from ${cached.sourceEventId || "earlier call"} (${cached.modeLabel})` });
    const claims = checkBriefClaims(cached.rawText, payload, { registry });
    const stored = await ledgerAppend({ actor, action: "ASK_ANSWERED", detail: `provenance=cache source=${cached.sourceEventId} origin=${cached.mode}`, traceId: currentTrace(auth) });
    return finish(claims, { provenance: PROVENANCE.CACHE, provenanceLabel: `Cache · verified ${cached.mode === "live" ? "Muse Spark" : "Sample mode"} answer`, cachedFrom: cached.sourceEventId, cacheKey: cached.cacheKey, cachedAt: cached.cachedAt, museReason: cached.museReason, trace: cached.trace, modeLabel: cached.modeLabel, eventId: stored?.event?.event_id || null });
  }
  ladder.push({ rung: "cache", outcome: "miss", detail: "no verified answer for this scenario hash + question" });

  // Rung 3 — Muse Spark (live, or Sample mode planner over the same tools)
  const provider = briefProvider();
  const sample = sampleAnswerPlanner(payload, question);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Operator question about scenario ${payload.scenarioId}: ${question}\nThe deterministic engine could not answer this alone (${det.reason}). Use the tools, cite evidence ids, and explain.` }
  ];
  let model;
  try {
    model = await modelComplete({ provider, messages, sample, tools: BRIEF_TOOLS, executeTool: (name, args) => executeBriefTool(payload, name, args), maxSteps: 4 });
  } catch {
    ladder.push({ rung: "muse-spark", outcome: "error", detail: "model request failed; engine answers unaffected" });
    return { question, ladder, provenance: PROVENANCE.MUSE, status: "API_ERROR", text: "", blocked: [], citations: [] };
  }
  const mode = model.verifiedLive ? "live" : "sample";
  const modeLabel = modeLabel_({ verifiedLive: model.verifiedLive, provider: model.provider, model: model.model });
  if (model.blocked) {
    ladder.push({ rung: "muse-spark", outcome: "blocked", detail: "output attempted approval/release language" });
    return { question, ladder, provenance: PROVENANCE.MUSE, status: "BLOCKED", text: "", blocked: [], citations: [], modeLabel };
  }
  const claims = checkBriefClaims(model.content, payload, { registry });
  const trace = model.trace || [];
  ladder.push({ rung: "muse-spark", outcome: claims.blockedCount ? "answered-with-removals" : "answered", detail: `${modeLabel}; ${trace.length} tool call(s); ${claims.blockedCount} sentence(s) removed by the claim checker` });
  const stored = await ledgerAppend({ actor, action: "ASK_MUSE_SPARK", detail: `why-engine-not-enough=${det.reason} (${det.why.slice(0, 140)}) mode=${mode} tools=${trace.length} blocked=${claims.blockedCount}`, traceId: currentTrace(auth) });
  const eventId = stored?.event?.event_id || null;
  if (claims.blockedCount === 0 && claims.allowedText) {
    answerCache.put(pack.scenarioHash, question, { rawText: model.content, sourceEventId: eventId, mode, modeLabel, museReason: det.reason, trace });
  }
  return finish(claims, { provenance: PROVENANCE.MUSE, provenanceLabel: mode === "live" ? `Muse Spark (${model.model})` : `Muse Spark · ${SAMPLE_MODE_LABEL}`, museReason: det.reason, museWhy: det.why, trace, modeLabel, eventId, status: claims.blockedCount ? "PARTIAL" : "COMPLETE" });
}

const modeLabel_ = r => modeLabel({ ...r, mode: r.verifiedLive ? "live" : "sample" });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);

    if (req.method === "OPTIONS") {
      guardRequest(req, res);
      return;
    }

    if (url.pathname === "/api/session" && req.method === "GET") {
      if (!guardRequest(req, res)) return;
      if (!(await enforceLimits(req, res, "session"))) return;
      const issued = createOperatorSession(clientIp(req));
      if (!issued.ok) return send(res, 403, { status: "FORBIDDEN", reason: issued.reason });
      await ledgerAppend({ actor: "system", action: "SESSION_ISSUED", detail: `loopback:${issued.clientIp}` });
      send(res, 200, { sessionToken: issued.sessionToken, csrfToken: issued.csrfToken, expiresInSec: issued.expiresInSec });
      return;
    }

    if (url.pathname === "/api/health" && req.method === "GET") {
      if (!guardRequest(req, res)) return;
      if (!(await enforceLimits(req, res, "read"))) return;
      const mode = metaBriefMode();
      send(res, 200, {
        status: ledgerStatus.ok ? "ready" : "ledger_tampered",
        metaMode: process.env.MODEL_API_KEY ? "configured" : "not configured",
        metaBriefMode: mode,
        metaModeLabel: mode === "sample" ? SAMPLE_MODE_LABEL : `Live Muse Spark (${museModelId()})`,
        modelProvider: briefProvider(),
        consentSecretSource: consentSecretSource(),
        consentSecretStrength: (consentSecretSource() === "too-short" || consentSecretSource() === "known-dev-fallback") ? "weak" : "strong",
        consentTokenTtlSec: DEFAULT_TTL_SEC,
        approvalTtlSec: Math.round(approvalTtlMs() / 1000),
        approvalTtlMaxSec: MAX_APPROVAL_TTL_SEC,
        consentNoncesPersisted: nonceStore().size,
        answerCacheSize: answerCache.size,
        lastProveIt: lastProveIt ? { status: lastProveIt.status, passed: lastProveIt.passed, total: lastProveIt.total, ranAt: lastProveIt.ranAt } : null,
        ledgerIntegrity: ledgerView(),
        foundation: "synthetic demonstration",
        build: buildInfo.tag,
        buildRound: buildInfo.round,
        buildVersion: buildInfo.version,
        buildLabel: `round${String(buildInfo.round).replace(/^r/, "")}`,
        buildCommit: buildInfo.commit,
        programIntegration: buildInfo.programIntegration || PROGRAM_INTEGRATION,
        programBridge: {
          product: "Command Center V3 · Project + Communications OS",
          updatedAt: programBridge.view().updatedAt,
          status: programBridge.view().snapshot.status
        }
      });
      return;
    }

    if (url.pathname === "/api/program/bridge" && req.method === "GET") {
      if (!guardRequest(req, res)) return;
      if (!(await enforceLimits(req, res, "read"))) return;
      send(res, 200, programBridge.view());
      return;
    }

    if (url.pathname === "/api/program/events" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!(await enforceLimits(req, res, "pm"))) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      // Privileged cascade types (CONSENT_ACCEPTED / KANBAN_MOVE) are server-only.
      const allowed = new Set([
        "INCIDENT_DETECTED",
        "CERTIFICATE_CONFLICT",
        "SECOND_SHOCK",
        "CERTIFICATE_CLEARED",
        "RESET"
      ]);
      const type = String(body.type || "");
      if (!allowed.has(type)) {
        return send(res, 403, {
          status: "FORBIDDEN_EVENT_TYPE",
          message: "Consent and Kanban program events are recorded only by the gated server paths."
        });
      }
      const recorded = await programBridge.record({
        type,
        actor: operatorFor(auth) || "operator",
        traceId: body.traceId || currentTrace(auth),
        detail: body.detail && typeof body.detail === "object" ? body.detail : {}
      });
      await ledgerAppend({
        actor: operatorFor(auth) || "operator",
        action: "PROGRAM_BRIDGE_EVENT",
        detail: `${type}:${recorded.event.id}`,
        traceId: recorded.event.traceId
      });
      send(res, 200, recorded);
      return;
    }

    if (url.pathname === "/api/audit/verify" && req.method === "GET") {
      if (!guardRequest(req, res)) return;
      if (!(await enforceLimits(req, res, "ledger-verify"))) return;
      await verifyLedgerNow();
      send(res, 200, ledgerView());
      return;
    }

    if (url.pathname === "/api/audit/export-anchor" && req.method === "GET") {
      if (!guardRequest(req, res)) return;
      if (!(await enforceLimits(req, res, "ledger-verify"))) return;
      const proof = await verifyPersistedLedger({ length: auditLedger.entries.length, tip: auditLedger.tip });
      send(res, 200, {
        checked: true,
        ok: proof.ok,
        exportAnchored: Boolean(proof.exportAnchored),
        reason: proof.reason || null,
        tip: proof.tip || null,
        length: proof.length ?? 0,
        hint: "Copy the ledger .export.jsonl sibling off-box; rollback is detected when on-disk ledger is shorter than the export tip."
      });
      return;
    }

    if (url.pathname === "/api/audit/raw-model-output" && req.method === "GET") {
      if (!guardRequest(req, res)) return;
      if (!(await enforceLimits(req, res, "ledger-verify"))) return;
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      const entry = peekRawModelAudit(auth.sessionToken);
      if (!entry?.rawModelProse) {
        return send(res, 404, { status: "NO_RAW_MODEL_CAPTURE", message: "No unverified raw model prose captured for this session." });
      }
      await ledgerAppend({
        actor: operatorFor(auth),
        action: "RAW_MODEL_AUDIT_VIEW",
        detail: `chars=${entry.rawModelProse.length} scenario=${String(entry.scenarioHash || "").slice(0, 12)}`,
        traceId: currentTrace(auth)
      });
      send(res, 200, {
        label: "Raw model output (UNVERIFIED — audit only)",
        warning: "Not for operational decisions. Phrase screen is advisory on this view only.",
        withheldNotice: COMMENTARY_WITHHELD_NOTICE,
        rawModelProse: entry.rawModelProse,
        phraseScreen: entry.rawModelScreened || null,
        scenarioHash: entry.scenarioHash || null,
        capturedAt: entry.storedAt,
        briefMode: entry.mode || null,
        briefStatus: entry.briefStatus || null
      });
      return;
    }

    if (url.pathname === "/api/intake" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!(await enforceLimits(req, res, "intake"))) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      const factory = createScenario();
      if (body?.scenarioId && body.scenarioId !== factory.scenarioId) {
        return send(res, 400, { status: "INVALID_REQUEST", message: "Unknown scenario." });
      }
      const docs = [];
      if (body?.certificateText) docs.push(parseDocument("material_certificate", truncateText(body.certificateText), "DOC-CERT-CLIENT"));
      if (body?.purchaseOrderText) docs.push(parseDocument("purchase_order", truncateText(body.purchaseOrderText), "DOC-PO-CLIENT"));
      if (body?.inventoryText) docs.push(parseDocument("inventory_receipt", truncateText(body.inventoryText), "DOC-INV-CLIENT"));
      const lot = factory.lots.find(l => l.id === factory.incomingLotId);
      const reconciliation = reconcilePacket(docs, lot);
      const certificate = validateCertificate(factory, truncateText(body?.certificateText || ""));
      const scanned = [body?.certificateText, body?.purchaseOrderText, body?.inventoryText].filter(Boolean).map(t => scanSupplierText(truncateText(t)));
      const threats = scanned.flatMap(x => x.threats);
      const injection = { quarantined: threats.length > 0, threats, policy: "supplier-text-never-executes-as-instruction", actionsTaken: 0 };
      if (threats.length) await ledgerAppend({ actor: operatorFor(auth), action: "INTAKE_INJECTION_QUARANTINED", detail: threats.map(t => t.id).join(","), traceId: currentTrace(auth) });
      send(res, 200, { reconciliation, certificateStatus: certificate.status, documentCount: docs.length, injection });
      return;
    }

    if ((url.pathname === "/api/pdf-intake" || url.pathname === "/api/pdf-intake/sample") && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!(await enforceLimits(req, res, "pdf-intake"))) return;
      const body = await bodyJSON(req, res, MAX_PDF_JSON_BODY);
      if (!body) return;
      let buffer;
      let source = "upload";
      if (url.pathname.endsWith("/sample")) {
        const rel = SAMPLE_PDFS[String(body?.sample || "")];
        if (!rel) return send(res, 400, { status: "INVALID_REQUEST", message: "sample must be conflict or matching" });
        buffer = await readFile(new URL(`./${rel}`, import.meta.url));
        source = `bundled:${body.sample}`;
      } else {
        buffer = decodeBase64Limited(body?.pdfBase64, MAX_PDF_BYTES);
      }
      if (!buffer.length) return send(res, 400, { status: "INVALID_REQUEST", message: "pdfBase64 required" });
      const result = await processPdfCertificate(buffer, { provider: "fixture" });
      await ledgerAppend({ actor: operatorFor(auth), action: "PDF_INTAKE", detail: `${source}:${result.route}${result.reason ? `:${result.reason}` : ""}` });
      send(res, 200, { ...result, source });
      return;
    }

    if (url.pathname === "/api/consent/review" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!(await enforceLimits(req, res, "consent"))) return;
      if (!ledgerStatus.ok) return send(res, 423, { status: "LEDGER_TAMPERED", message: "Consent is disabled while the audit ledger fails verification." });
      const body = await bodyJSON(req, res);
      if (!body) return;
      const planId = String(body?.planId || "").slice(0, 32);
      const bound = bindSessionOperator(auth.sessionToken, body?.operator);
      if (!bound.ok) {
        const code = bound.reason === "OPERATOR_BOUND" ? 409 : bound.reason === "OPERATOR_RESERVED" ? 403 : 400;
        return send(res, code, { status: "DENIED", reason: bound.reason, operator: bound.operator || null });
      }
      if (bound.firstBind) await ledgerAppend({ actor: bound.operator, action: "OPERATOR_BOUND", detail: `session:${auth.sessionToken.slice(0, 8)}` });
      const inputs = scenarioInputs(body);
      const ctx = buildPmContextFromState(inputs);
      const plan = ctx.plans.find(p => p.id === planId);
      if (!plan) {
        await ledgerAppend({ actor: bound.operator, action: "CONSENT_DENIED", detail: `UNKNOWN_PLAN:${planId}` });
        return send(res, 404, { status: "DENIED", reason: "UNKNOWN_PLAN" });
      }
      const sh = scenarioHash(inputs);
      const minted = mintReviewToken({ sessionToken: auth.sessionToken, actor: bound.operator, planId, planHash: hashPlan(plan), scenarioHash: sh });
      const mission = await openMission(auth, sh, bound.operator, ctx);
      const stored = await ledgerAppend({ actor: bound.operator, action: "CONSENT_REVIEW_MINTED", detail: `${planId}:${minted.jti} params=${minted.planHash.slice(0, 12)}`, event: missions.next(mission, "plan") });
      send(res, 200, {
        status: "REVIEW_TOKEN", token: minted.token, phrase: minted.phrase, operator: bound.operator,
        expiresAt: new Date(minted.expiresAt * 1000).toISOString(), ttlSec: DEFAULT_TTL_SEC,
        planHash: minted.planHash, planParamHash: minted.planHash, planParameters: planParameters(plan), scenarioHash: minted.scenarioHash,
        traceId: mission.traceId, eventId: stored?.event?.event_id || null, approvalTtlSec: Math.round(approvalTtlMs() / 1000),
        plan: { id: plan.id, label: plan.label, estimatedCost: plan.estimatedCost, stockUsed: plan.stockUsed, conditionalJobs: plan.conditionalJobs }
      });
      return;
    }

    if (url.pathname === "/api/consent/confirm" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!(await enforceLimits(req, res, "consent"))) return;
      if (!ledgerStatus.ok) return send(res, 423, { status: "LEDGER_TAMPERED" });
      const idem = idempotencyKeyFor(req, res);
      if (!idem) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      const parsed = parseConsentToken(body?.token);
      if (!parsed) return send(res, 400, { status: "DENIED", reason: "MALFORMED_TOKEN" });
      const inputs = scenarioInputs(body);
      const sh = scenarioHash(inputs);
      if (idempotencyGate(res, auth, "consent-confirm", idem.key, fingerprintOf([body.token, body.phrase, sh]))) return;
      const ctx = buildPmContextFromState(inputs);
      const plan = ctx.plans.find(p => p.id === parsed.planId);
      let verified;
      try {
        verified = plan
          ? verifyConfirmToken(body.token, { sessionToken: auth.sessionToken, planHash: hashPlan(plan), scenarioHash: sh, phrase: body?.phrase })
          : { ok: false, reason: "UNKNOWN_PLAN" };
      } catch {
        verified = { ok: false, reason: "NONCE_STORE_UNAVAILABLE" };
      }
      if (!verified.ok) {
        await ledgerAppend({ actor: operatorFor(auth), action: "CONSENT_DENIED", detail: `${parsed.planId}:${verified.reason}`, traceId: currentTrace(auth) });
        idempotency.finish(missionKey(auth), "consent-confirm", idem.key, 403, null);
        return send(res, 403, { status: "DENIED", reason: verified.reason });
      }
      let mission = missions.current(missionKey(auth));
      if (!mission || mission.scenarioHash !== sh) {
        mission = await openMission(auth, sh, verified.actor, ctx);
        await ledgerAppend({ actor: verified.actor, action: "CONSENT_REVIEW_VERIFIED", detail: `${verified.planId}:${verified.jti}`, event: missions.next(mission, "plan") });
      }
      let kanban = null;
      const planPm = ctx.pm?.plans?.find(p => p.planId === verified.planId);
      if (planPm?.cpm) {
        kanban = buildRecoveryKanban({ plan, cpm: planPm.cpm, wsjfRank: ctx.pm.wsjfRank, operator: verified.actor, approvalJti: verified.jti });
      }
      const envelope = sealApprovalEnvelope({ planId: verified.planId, planParamHash: verified.planHash, scenarioHash: verified.scenarioHash, nonce: verified.jti, operator: verified.actor, sessionToken: auth.sessionToken, ttlSec: Math.round(approvalTtlMs() / 1000), idempotencyKey: idem.key });
      const approval = { planId: verified.planId, operator: verified.actor, at: new Date().toISOString(), jti: verified.jti, planHash: verified.planHash, scenarioHash: verified.scenarioHash, operationalRelease: false, expiresAt: new Date(envelope.expiresAt * 1000).toISOString(), envelope, traceId: mission.traceId, idempotencyKey: idem.key };
      setOperatorApproval(auth.sessionToken, approval, kanban);
      const stored = getOperatorApproval(auth.sessionToken);
      const accepted = await ledgerAppend({ actor: verified.actor, action: "CONSENT_ACCEPTED", detail: `${verified.planId}:${verified.jti} params=${verified.planHash.slice(0, 12)} ttl=${envelope.ttlSec}s`, event: missions.next(mission, "approval", idem.key) });
      let kanbanEvent = null;
      if (kanban) kanbanEvent = await ledgerAppend({ actor: verified.actor, action: "KANBAN_CREATED", detail: `${verified.planId}:${kanban.cards.length}`, event: missions.next(mission, "effect", `${idem.key}:board`) });
      const out = { status: "ACCEPTED", operationalRelease: false, jti: verified.jti, planId: verified.planId, operator: verified.actor, expiresAt: stored.expiresAt, scenarioHash: verified.scenarioHash, kanbanReady: Boolean(kanban), envelope, idempotencyKey: idem.key, traceId: mission.traceId, eventId: accepted?.event?.event_id || null, kanbanEventId: kanbanEvent?.event?.event_id || null };
      await programBridge.record({
        type: "CONSENT_ACCEPTED",
        actor: verified.actor,
        traceId: mission.traceId,
        detail: {
          planId: verified.planId,
          planLabel: plan?.label || verified.planId,
          impactedJobs: Array.isArray(ctx.impact?.jobs) ? ctx.impact.jobs.length : 0,
          impactedUnits: Number(ctx.impact?.units || 0) || 0,
          kanbanReady: Boolean(kanban)
        }
      });
      finishIdempotent(res, auth, "consent-confirm", idem.key, 200, out, out.eventId);
      return;
    }

    if (url.pathname === "/api/consent/revoke" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!ledgerTrusted(res)) return;
      if (!(await enforceLimits(req, res, "consent"))) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      const prior = revokeOperatorApproval(auth.sessionToken);
      const why = String(body?.reason || "operator-change").slice(0, 80);
      let outcome = null;
      if (prior) {
        await ledgerAppend({ actor: prior.operator, action: "CONSENT_INVALIDATED", detail: `${prior.planId}:${why}`, traceId: currentTrace(auth) });
        outcome = await closeMission(auth, "SUPERSEDED", why, prior.operator);
        await programBridge.record({
          type: "SECOND_SHOCK",
          actor: prior.operator,
          traceId: currentTrace(auth),
          detail: {
            stakeholderAlert: `Consent revoked (${why}). Program reopened — prior acceptance superseded.`,
            calendarNote: "Slip recovery milestones; re-issue consent before execution."
          }
        });
      }
      send(res, 200, { status: prior ? "REVOKED" : "NONE", planId: prior?.planId || null, missionOutcome: outcome });
      return;
    }

    if (url.pathname === "/api/consent/accept") {
      send(res, 410, { status: "GONE", message: "Single-step accept was removed. Use POST /api/consent/review then POST /api/consent/confirm." });
      return;
    }
    if (url.pathname === "/api/consent/mint") {
      send(res, 404, { status: "REMOVED", message: "Use POST /api/consent/review then /api/consent/confirm." });
      return;
    }

    if (url.pathname === "/api/pm/analyze" && req.method === "POST") {
      if (!guardRequest(req, res, { requireSession: true })) return;
      if (!(await enforceLimits(req, res, "pm"))) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      if (body?.scenarioId && body.scenarioId !== "AEROSPACE-40-LOT-CONFLICT") {
        return send(res, 400, { status: "INVALID_REQUEST", message: "Unknown scenario." });
      }
      const ctx = buildPmContextFromState(scenarioInputs(body));
      send(res, 200, { pm: ctx.pm, planCount: ctx.plans.length, synthetic: true });
      return;
    }

    if (url.pathname === "/api/kanban" && req.method === "GET") {
      if (!guardRequest(req, res)) return;
      const auth = validateOperatorSession(req, { requireCsrf: false });
      if (!auth.ok) return send(res, 401, { status: "UNAUTHORIZED", reason: auth.reason });
      if (!(await enforceLimits(req, res, "read"))) return;
      const approval = await requireLiveApproval(req, res, auth);
      if (!approval) return;
      const board = getKanbanBoard(auth.sessionToken);
      if (!board) return send(res, 403, { status: "BOARD_UNAVAILABLE" });
      send(res, 200, { board, approval });
      return;
    }

    if (url.pathname === "/api/kanban/move" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!ledgerTrusted(res)) return;
      if (!(await enforceLimits(req, res, "kanban"))) return;
      const approval = await requireLiveApproval(req, res, auth);
      if (!approval) return;
      const board = getKanbanBoard(auth.sessionToken);
      if (!board) return send(res, 403, { status: "BOARD_UNAVAILABLE" });
      const idem = idempotencyKeyFor(req, res);
      if (!idem) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      const cardId = String(body?.cardId || "").slice(0, 64);
      const column = String(body?.column || "").slice(0, 32);
      if (!cardId || !KANBAN_COLUMNS.includes(column)) return send(res, 400, { status: "INVALID_REQUEST" });
      if (idempotencyGate(res, auth, "kanban-move", idem.key, fingerprintOf([cardId, column, approval.jti]))) return;
      const card = board.cards.find(c => c.id === cardId);
      const prevColumn = card?.column;
      const moved = moveKanbanCard(board, cardId, column);
      if (!moved.ok) {
        idempotency.finish(missionKey(auth), "kanban-move", idem.key, 409, null);
        return send(res, 409, { status: "MOVE_DENIED", reason: moved.reason });
      }
      const stored = await ledgerAppend({ actor: approval.operator, action: "KANBAN_MOVE", detail: `${cardId}->${column}`, event: stageEvent(auth, "effect", idem.key) });
      if (!stored) {
        if (prevColumn) moveKanbanCard(board, cardId, prevColumn);
        idempotency.finish(missionKey(auth), "kanban-move", idem.key, 423, null);
        return send(res, 423, { status: "LEDGER_TAMPERED", message: "Kanban move was not recorded; board state rolled back." });
      }
      updateKanbanBoard(auth.sessionToken, board);
      let missionOutcome = null;
      if (board.cards.every(c => c.column === "done")) missionOutcome = await closeMission(auth, "RECOVERY_EXECUTED", `all ${board.cards.length} recovery cards done for ${approval.planId}`, approval.operator);
      await programBridge.record({
        type: "KANBAN_MOVE",
        actor: approval.operator,
        traceId: approval.traceId || currentTrace(auth),
        detail: { cardId, column, planId: approval.planId, missionOutcome: missionOutcome?.outcome || null }
      });
      finishIdempotent(res, auth, "kanban-move", idem.key, 200, { status: "OK", card: moved.card, idempotencyKey: idem.key, eventId: stored?.event?.event_id || null, missionOutcome }, stored?.event?.event_id || null);
      return;
    }

    if (url.pathname === "/api/meta-brief" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!(await enforceLimits(req, res, "meta-brief"))) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      if (body?.scenarioId !== "AEROSPACE-40-LOT-CONFLICT" || typeof body?.certificateText !== "string")
        return send(res, 400, { status: "INVALID_REQUEST", message: "Expected scenarioId and the scenario inputs (certificateText, assumptions, disruptions)." });
      const pack = buildBriefPayload(scenarioInputs(body));
      if (!pack.ctx.impact.blocked) return send(res, 409, { status: "NO_ACTIVE_INCIDENT", message: "No active certificate discrepancy to brief." });
      if (body.scenarioHash && body.scenarioHash !== pack.scenarioHash) return send(res, 409, { status: "SCENARIO_HASH_MISMATCH" });
      const adversarial = body.mode === "adversarial";
      const run = await withConcurrency("meta-brief", ROUTE_LIMITS["meta-brief"].concurrency, () => metaBrief(pack, { adversarial }));
      if (!run.ok) return send(res, 429, { status: "CONCURRENCY_LIMIT" }, { "Retry-After": String(run.retryAfter) });
      const result = run.result;
      const rawProse = result.rawModelProse;
      const rawScreened = result.rawModelScreened;
      if (rawProse) {
        stashRawModelAudit(auth.sessionToken, {
          rawModelProse: rawProse,
          rawModelScreened: rawScreened,
          scenarioHash: result.scenarioHash,
          mode: result.mode,
          briefStatus: result.status
        });
      }
      const { rawModelProse: _rp, rawModelScreened: _rs, ...publicResult } = result;
      publicResult.rawModelAuditAvailable = Boolean(rawProse);
      await ledgerAppend({ actor: operatorFor(auth), action: adversarial ? "META_BRIEF_ADVERSARIAL" : "META_BRIEF", detail: `${result.mode}:${result.status} blocked=${result.blockedCount || 0} tools=${(result.trace || []).length} arbitration=${JSON.stringify(result.arbitration?.tally || {})}`, traceId: currentTrace(auth) });
      send(res, 200, { ...publicResult, auditTip: auditLedger.tip });
      return;
    }

    if (url.pathname === "/api/ask" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!ledgerTrusted(res)) return;
      if (!(await enforceLimits(req, res, "ask"))) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      const question = String(body?.question || "").trim().slice(0, 300);
      if (!question || typeof body?.certificateText !== "string") return send(res, 400, { status: "INVALID_REQUEST", message: "Expected question and the scenario inputs." });
      const run = await withConcurrency("ask", ROUTE_LIMITS.ask.concurrency, () => answerQuestion(auth, question, scenarioInputs(body)));
      if (!run.ok) return send(res, 429, { status: "CONCURRENCY_LIMIT" }, { "Retry-After": String(run.retryAfter) });
      send(res, 200, run.result);
      return;
    }

    if (url.pathname === "/api/arbitration" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!(await enforceLimits(req, res, "pm"))) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      const inputs = scenarioInputs(body);
      const ctx = buildPmContextFromState(inputs);
      const approval = peekOperatorApproval(auth.sessionToken);
      const planId = approval?.scenarioHash === scenarioHash(inputs) ? approval.planId : String(body?.planId || "").slice(0, 32) || null;
      const result = arbitrateCellContention(ctx, { planId });
      if (result.contestedCells) {
        await ledgerAppend({ actor: operatorFor(auth), action: "ARBITRATION", detail: `plan=${result.planId} ${result.decisions.map(d => `${d.cell}:${d.status}:${d.winnerClaimId || "-"}`).join(" ")}`, traceId: currentTrace(auth) });
      }
      send(res, 200, { ...result, decisions: result.decisions.map(slimDecision), scenarioHash: scenarioHash(inputs), policy: "Britt Enterprise ConflictResolver port (weighted claims; MERGED / RESOLVED / ESCALATED / UNRESOLVED_CONFLICT)" });
      return;
    }

    if (url.pathname === "/api/mission" && req.method === "GET") {
      if (!guardRequest(req, res)) return;
      const auth = validateOperatorSession(req, { requireCsrf: false });
      if (!auth.ok) return send(res, 401, { status: "UNAUTHORIZED", reason: auth.reason });
      if (!(await enforceLimits(req, res, "read"))) return;
      const traces = missions.traces(missionKey(auth));
      const current = missions.current(missionKey(auth));
      const chains = traces.slice(-5).reverse().map(t => verifyMissionChain(auditLedger.entries, t));
      send(res, 200, { stages: MISSION_STAGES, currentTraceId: current?.traceId || null, missions: chains, schema: "forgefront.event.v1" });
      return;
    }

    if (url.pathname === "/api/mission/close" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!ledgerTrusted(res)) return;
      if (!(await enforceLimits(req, res, "consent"))) return;
      const body = await bodyJSON(req, res);
      if (!body) return;
      const inputs = scenarioInputs(body);
      const sh = scenarioHash(inputs);
      const openMission = missions.current(missionKey(auth));
      if (openMission && openMission.scenarioHash !== sh) {
        return send(res, 409, { status: "MISSION_SCENARIO_MISMATCH", message: "Open mission was started for a different scenario; close or supersede it before submitting new certificate inputs." });
      }
      const ctx = buildPmContextFromState(inputs);
      if (ctx.impact.blocked) return send(res, 409, { status: "STILL_BLOCKED", message: "The server still finds a certificate conflict for these inputs." });
      const prior = revokeOperatorApproval(auth.sessionToken);
      if (prior) await ledgerAppend({ actor: prior.operator, action: "CONSENT_COMPLETED", detail: `${prior.planId}:incident-closed`, traceId: currentTrace(auth) });
      const outcome = await closeMission(auth, "INCIDENT_CLOSED", "server re-check: all checked certificate fields match the master record", operatorFor(auth));
      send(res, 200, { status: outcome ? "CLOSED" : "NO_OPEN_MISSION", missionOutcome: outcome });
      return;
    }

    if (url.pathname === "/api/prove-it" && req.method === "POST") {
      const auth = guardRequest(req, res, { requireSession: true });
      if (!auth) return;
      if (!(await enforceLimits(req, res, "prove-it"))) return;
      const run = await withConcurrency("prove-it", ROUTE_LIMITS["prove-it"].concurrency, () => runProveIt({
        base: `http://127.0.0.1:${port}`,
        newSession: () => { const s = createOperatorSession("127.0.0.1"); if (!s.ok) throw new Error(s.reason); return s; },
        ledgerPath,
        flushLedger: () => ledgerQueue,
        verifyCopy: path => verifyPersistedLedger(null, { path }).then(({ ledger: _l, ...proof }) => proof),
        verifyLive: () => verifyLedgerNow(),
        ledgerEntries: () => auditLedger.entries,
        approvalCount, kanbanCount,
        expireApproval: token => expireOperatorApprovalForProof(token),
        nonceStorePath: nonceStore().path
      }));
      if (!run.ok) return send(res, 429, { status: "CONCURRENCY_LIMIT" }, { "Retry-After": String(run.retryAfter) });
      lastProveIt = run.result;
      await ledgerAppend({ actor: operatorFor(auth), action: "PROVE_IT", detail: `${run.result.passed}/${run.result.total} ${run.result.checks.map(c => `${c.id}:${c.pass ? "pass" : "FAIL"}`).join(" ")}`, traceId: currentTrace(auth) });
      send(res, 200, run.result);
      return;
    }

    if (url.pathname === "/favicon.ico" && req.method === "GET") {
      if (!guardRequest(req, res)) return;
      res.writeHead(204, baseHeaders);
      res.end();
      return;
    }

    if (req.method !== "GET") return send(res, 405, { error: "Method not supported" });
    if (!guardRequest(req, res)) return;
    const reqPath = url.pathname === "/" ? "/index.html" : url.pathname === "/program" ? "/vendor/command-center-v3/ForgeFront_PM.html" : url.pathname;
    const full = safeStaticPath(base, reqPath);
    if (!full) return send(res, 403, { error: "Forbidden" });
    const bytes = await readFile(full);
    const rel = reqPath.replace(/^\/+/, "");
    res.writeHead(200, { ...staticHeadersFor(rel), "Content-Type": types[extname(full)] || "application/octet-stream" });
    res.end(bytes);
  } catch (error) {
    if (res.headersSent) return res.end();
    const status = error?.code === "ENOENT" ? 404 : error?.message === "PAYLOAD_TOO_LARGE" ? 413 : error?.message === "REQUEST_TIMEOUT" ? 408 : 400;
    return send(res, status, { error: publicErrorMessage(error) });
  }
});

async function boot() {
  // Boot-time consent secret gate (R7-SL-01): production must have a strong configured
  // secret; a known-dev fallback or too-short value refuses to listen (fail closed).
  try {
    const src = consentSecretSource();
    if (process.env.NODE_ENV === "production" && src !== "configured") {
      console.error(`[consent] refusing to start: CONSENT_HMAC_SECRET required in production (source=${src})`);
      process.exit(1);
    }
    // Outside production, consentHmacSecret() itself throws CONSENT_HMAC_SECRET_WEAK
    // unless ALLOW_WEAK_CONSENT_SECRET=1 — force that check at boot, not on first request.
    if (src === "known-dev-fallback" || src === "too-short") consentHmacSecret();
  } catch (error) {
    console.error(`[consent] refusing to start: ${error.message}`);
    process.exit(1);
  }
  const loaded = await loadPersistedLedger();
  auditLedger = loaded.ledger;
  const nonces = configureNonceStore(process.env.CONSENT_NONCE_PATH || join(dirname(ledgerPath()), "consent-nonces.jsonl"));
  // The ledger is the second authoritative record of consumed nonces.
  for (const e of auditLedger.entries) if (e.action === "CONSENT_ACCEPTED") nonces.seed(String(e.detail).split(":")[1]?.split(" ")[0]);
  ledgerStatus = { ...loaded.proof, ok: !loaded.tampered };
  if (loaded.tampered) console.error(`[ledger] verification FAILED at boot: ${loaded.proof.reason}`);
  if (!auditLedger.entries.length && ledgerStatus.ok) {
    await ledgerAppend({ actor: "system", action: "SERVER_START", detail: `ForgeFront Factory Resilience ${buildInfo.round}${buildInfo.commit ? ` ${String(buildInfo.commit).slice(0, 12)}` : ""}` });
  } else if (ledgerStatus.ok) {
    await ledgerAppend({ actor: "system", action: "SERVER_RESTART", detail: `${buildInfo.round}` });
  }
  await verifyLedgerNow();
  setInterval(() => { verifyLedgerNow().catch(() => {}); }, LEDGER_VERIFY_INTERVAL_MS).unref();
  server.listen(port, "127.0.0.1", () => console.log(`ForgeFront Factory Resilience ${buildInfo.round} ready on http://127.0.0.1:${port}`));
}

boot();

export { hashPlan };
