import { createScenario, INCORRECT_CERT, MATCHING_CERT } from "./scenario.mjs";
import { validateCertificate, traceImpact, buildRecoveryPlans, createReport, applyDisruptions } from "./engine.mjs";
import { buildPacketFromScenario, reconcilePacket, parseDocument } from "./intake.mjs";
import { buildConsequenceGraph } from "./graph.mjs";
import { createIncidentRecord, syncIncidentFromEngine } from "./incident.mjs";
import { analyzeProjectManagement } from "./pm/pm-analysis.mjs";
import { scenarioHash } from "./scenario-hash.mjs";
import {
  renderConsequenceSparkline,
  renderIncidentTimeline,
  renderDemoStory,
  renderPlanCompare,
  renderImpactConstellation,
  renderLedgerChain,
  renderPlantSchematic,
  renderOrderSparklines,
  renderTimeConductor,
  resolveDemoBeat,
  DEMO_BEATS
} from "./ui-viz.mjs";

const SAMPLE_LABEL = "Sample mode (no live Muse Spark key)";

const $ = id => document.getElementById(id);
const money = number => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(number);
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
/** Escape every value that lands in innerHTML — numbers included. */
const num = value => {
  if (value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value))) return "";
  return safe(value);
};
const state = {
  factory: createScenario(), text: INCORRECT_CERT, certificate: null, impact: null,
  plans: [], approval: null, selected: null, events: [],
  packet: null, graph: null, incident: createIncidentRecord(createScenario()),
  assumptions: { substituteStock: 96, expeditedLotHours: 20, machineOutageHours: 0 },
  secondShockApplied: false,
  consent: null,
  lastClaimBlocked: 0,
  operatorSession: null,
  pm: null,
  kanban: null,
  metaMode: "sample",
  metaModeLabel: SAMPLE_LABEL,
  brief: null,
  briefStale: false,
  pendingInvalidation: false,
  consentToken: null,
  operatorName: null,
  ledger: null,
  build: null,
  arbitration: null,
  mission: null,
  proveIt: null,
  lastAnswer: null,
  demoBeat: null,
  scrubLocked: false
};
/** Fresh idempotency key per user action (crypto.randomUUID on secure/loopback origins). */
const newIdempotencyKey = prefix => `${prefix}-${globalThis.crypto?.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("")}`;
const currentInputs = () => ({ certificateText: state.text, assumptions: state.assumptions, disruptions: state.factory.disruptions || {} });
const currentScenarioHash = () => scenarioHash(currentInputs());
const isSample = () => state.metaMode !== "live";
async function refreshProgramBridge() {
  const summary = $("programBridgeSummary");
  const pill = $("programPill");
  if (!summary) return;
  try {
    const data = await fetch("/api/program/bridge", { cache: "no-store" }).then(r => r.json());
    const snap = data.snapshot || {};
    if (pill) pill.textContent = `PROGRAM · ${String(snap.status || "IDLE")}`;
    summary.innerHTML = `
      <div class="program-bridge-grid">
        <div><span class="form-label">STATUS</span><strong>${safe(snap.status)}</strong></div>
        <div><span class="form-label">IMPACT</span><strong>${num(snap.impactedJobs)} jobs / ${num(snap.impactedUnits)} units</strong></div>
        <div><span class="form-label">PLAN</span><strong>${safe(snap.activePlanLabel || snap.activePlanId || "—")}</strong></div>
        <div><span class="form-label">KANBAN</span><strong>${snap.kanbanUnlocked ? "UNLOCKED" : "LOCKED"}</strong></div>
      </div>
      <p><strong>Stakeholder alert:</strong> ${safe(snap.stakeholderAlert || "—")}</p>
      <p><strong>Calendar:</strong> ${safe(snap.calendarNote || "—")}</p>
      <p><strong>Supplier:</strong> ${safe(snap.supplierNote || "—")}</p>
      <p><strong>Up / downstream:</strong> ${safe(snap.upstreamDownstream || "—")}</p>
      <p class="support-text">Updated ${safe(data.updatedAt || "never")} · ${safe(data.product || "Command Center V3")}</p>`;
  } catch {
    summary.textContent = "Program bridge unavailable.";
  }
}

async function notifyProgram(type, detail = {}) {
  try {
    await ensureOperatorSession();
    await fetch("/api/program/events", {
      method: "POST",
      headers: apiJsonHeaders(),
      body: JSON.stringify({ type, detail })
    });
  } catch { /* bridge is advisory to the engine UI */ }
  await refreshProgramBridge();
}

const apiJsonHeaders = () => {
  const s = state.operatorSession;
  if (!s) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    "X-Session-Token": s.sessionToken,
    "X-CSRF-Token": s.csrfToken,
    "X-Scenario-Hash": currentScenarioHash()
  };
};
async function ensureOperatorSession() {
  if (state.operatorSession) return state.operatorSession;
  const res = await fetch("/api/session");
  if (!res.ok) throw new Error("session unavailable");
  state.operatorSession = await res.json();
  return state.operatorSession;
}
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const addEvent = message => {
  state.events.unshift({ at: new Date().toISOString(), message });
  if (state.events.length > 40) state.events.pop();
};
const renderEvents = () => {
  const tip = String(state.ledger?.tip || "");
  $("eventLog").innerHTML = state.events.map((row, i) => {
    const hashBit = tip
      ? tip.slice((i * 2) % Math.max(tip.length - 6, 1), ((i * 2) % Math.max(tip.length - 6, 1)) + 6)
      : String(i).padStart(4, "0");
    return `<li><time>${safe(new Date(row.at).toLocaleTimeString())}</time><code class="ledger-hash">${safe(hashBit)}</code> ${safe(row.message)}</li>`;
  }).join("");
};
/** Invalidate a prior acceptance: client state, server approval (revoke) and ledger entry. */
const resetDecision = (why = "evidence or assumptions changed", { serverRevoke = true } = {}) => {
  if (state.approval) {
    const prior = state.approval;
    addEvent(`Scenario acceptance of ${prior.planId} by ${prior.operator} invalidated (${why}); server approval revoked and logged.`);
    state.pendingInvalidation = true;
    if (serverRevoke) {
      ensureOperatorSession()
        .then(() => fetch("/api/consent/revoke", { method: "POST", headers: apiJsonHeaders(), body: JSON.stringify({ reason: why }) }))
        .then(() => { refreshLedger(); refreshMission(); })
        .catch(() => {});
    }
  }
  state.approval = null;
  state.selected = null;
  state.kanban = null;
  state.consentToken = null;
};
async function refreshKanbanFromServer() {
  if (!state.approval) return;
  await ensureOperatorSession();
  const res = await fetch("/api/kanban", { headers: apiJsonHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (["CONSENT_EXPIRED", "APPROVAL_STALE", "CONSENT_REQUIRED"].includes(data.status)) {
      addEvent(data.status === "CONSENT_EXPIRED" ? `Scenario approval for ${state.approval.planId} expired; review and confirm again.` : `Server rejected the board: ${data.status}.`);
      state.approval = null;
      state.kanban = null;
      state.pendingInvalidation = data.status !== "CONSENT_REQUIRED";
      recalculate();
    }
    return;
  }
  const data = await res.json();
  state.kanban = data.board;
}
function recalculate(reason = "") {
  const previous = state.certificate?.status;
  const staleApproval = state.pendingInvalidation;
  state.pendingInvalidation = false;
  if (reason && state.brief) markBriefStale();
  if (reason && state.lastAnswer) {
    state.lastAnswer = null;
    if ($("askOutput")) $("askOutput").innerHTML = `<div class="ask-answer">Scenario changed — the previous answer was cleared. Ask again for the current evidence.</div>`;
  }
  state.factory.certificate = state.text;
  state.certificate = validateCertificate(state.factory, state.text);
  state.impact = traceImpact(state.factory, state.certificate);
  state.plans = state.impact.blocked ? buildRecoveryPlans(state.factory, state.impact, state.assumptions) : [];
  state.pm = state.impact.blocked
    ? analyzeProjectManagement({
        factory: state.factory,
        certificate: state.certificate,
        impact: state.impact,
        plans: state.plans
      })
    : null;
  if (state.approval && !state.kanban) refreshKanbanFromServer().then(() => renderKanbanBoard()).catch(() => {});
  const docs = [
    parseDocument("material_certificate", state.text, "DOC-CERT-UI"),
    parseDocument("purchase_order", state.factory.packetDocuments?.purchase_order || "", "DOC-PO-UI"),
    parseDocument("inventory_receipt", state.factory.packetDocuments?.inventory_receipt || "", "DOC-INV-UI")
  ];
  const lot = state.factory.lots.find(l => l.id === state.factory.incomingLotId);
  state.packet = reconcilePacket(docs, lot);
  state.graph = buildConsequenceGraph(state.factory, state.impact, state.packet);
  state.incident = syncIncidentFromEngine(state.incident, {
    certificate: state.certificate,
    impact: state.impact,
    plans: state.plans,
    approval: state.approval,
    staleApproval
  });
  if (reason) addEvent(reason);
  if (previous && state.certificate.status !== previous) addEvent(`Certificate finding changed: ${previous} → ${state.certificate.status}.`);
  render();
  scheduleArbitration();
}

function renderMetrics() {
  $("metricOrders").textContent = state.factory.jobs.length;
  $("metricAffected").textContent = state.impact.orderCount;
  $("metricAffectedCaption").textContent = state.impact.blocked ? "Jobs linked to disputed material" : "No jobs held by this certificate";
  $("metricExposure").textContent = money(state.impact.exposureValue);
  $("metricPlans").textContent = state.plans.length;
  const hero = $("heroStatus");
  if (hero) {
    hero.classList.toggle("is-clear", !state.impact.blocked);
    hero.classList.toggle("is-alarm", Boolean(state.impact.blocked));
    const strong = hero.querySelector("strong");
    const small = hero.querySelector("small");
    if (strong) strong.textContent = state.impact.blocked ? "REVIEW REQUIRED" : "DOCUMENT FIELDS MATCH";
    if (small) small.textContent = state.impact.blocked ? "Lot quarantine planning" : "No discrepancy in checked fields";
  }
  for (const [id, alarm] of [
    ["metricAffected", state.impact.blocked && state.impact.orderCount > 0],
    ["metricExposure", state.impact.blocked && state.impact.exposureValue > 0]
  ]) {
    const node = $(id)?.closest(".plant-metric") || $(id)?.closest(".band-item");
    if (node) node.classList.toggle("is-alarm", Boolean(alarm));
  }
}
function renderPacket() {
  const el = $("packetContradictions");
  if (!el || !state.packet) return;
  $("packetStatus").textContent = state.packet.status;
  $("packetStatus").className = "pill " + (state.packet.status === "FIELDS MATCHED" ? "pill-green" : state.packet.status === "UNKNOWN" ? "pill-amber" : "pill-red");
  if (!state.packet.contradictions.length) {
    el.innerHTML = '<p class="support-text">PO, certificate, and inventory records agree on reconciled fields for this packet.</p>';
    return;
  }
  el.innerHTML = state.packet.contradictions.map(row => `
    <div class="contradiction">
      <div class="contradiction-head"><strong>${safe(row.id)}</strong> <span class="finding-status ${safe(row.severity)}">${safe(row.severity)}</span></div>
      <p>${safe(row.summary)}</p>
      <ul>${row.evidence.map(e => `<li><code>${safe(e.docType)}</code> ${safe(e.key)} = ${safe(e.value)} ${e.pointer?.line ? `(line ${num(e.pointer.line)})` : e.pointer?.sourceRef ? `(${safe(e.pointer.sourceRef)})` : ""}</li>`).join("")}</ul>
    </div>`).join("");
}

function renderIncident() {
  const badge = $("incidentState");
  if (!badge) return;
  const labels = {
    CLOSED: ["CLOSED · CHECKED FIELDS MATCH", "PO, heat and grade match the master record. This closes the document conflict only; it is not a full material acceptance or AS9100 audit."],
    REOPENED: ["REOPENED · RE-REVIEW REQUIRED", "A prior scenario acceptance was invalidated by changed evidence or constraints. Review a recovery option again."],
    ACCEPTED_SCENARIO: ["ACCEPTED SCENARIO", "An operator accepted a scenario plan (two-step consent). No physical material release."]
  };
  const [text, tip] = labels[state.incident.state] || [state.incident.state.replace(/_/g, " "), "Incident lifecycle state"];
  badge.textContent = text;
  badge.title = tip;
  badge.dataset.state = state.incident.state;
  badge.className = "pill pill-incident";
}

function renderFindings() {
  const status = $("certStatus");
  status.textContent = state.certificate.status;
  status.className = "pill " + (state.certificate.status === "FIELDS MATCHED" ? "pill-green" : "pill-red");
  const enriched = state.certificate.fields || state.certificate.findings;
  $("findings").innerHTML = enriched.map(row =>
    `<div class="finding">
      <div class="finding-name">${safe(row.label)} <span class="finding-status ${safe(row.status)}">${safe(row.status)}</span>
      ${row.polarity ? `<span class="polarity-${num(row.polarity === "verified_true" ? "true" : row.polarity === "verified_false" ? "false" : "unknown")}">${safe(row.polarity)}</span>` : ""}</div>
      <div class="finding-details">Expected: ${safe(row.expected)}<br>Observed: ${safe(row.observed || "not found")}</div>
      <div class="finding-quote">${row.evidence ? `Line ${num(row.evidence.line)}: ${safe(row.evidence.quote)}` : "No document evidence"}</div>
      ${row.nextAction ? `<div class="epistemic-action">Next: ${safe(row.nextAction)}</div>` : ""}
    </div>`).join("");
}
function renderNetwork() {
  const { impact, graph } = state;
  $("impactPill").textContent = impact.blocked ? "ACTIVE IMPACT MAP" : "NO ACTIVE BLOCK";
  const graphEl = $("graphSummary");
  if (graphEl && graph) {
    graphEl.textContent = `${graph.nodes.length} traced nodes · ${graph.provenImpact.jobIds.length} proven job holds · ${graph.possibleImpact.jobIds.length} possible (unlinked)`;
  }
  $("impactPill").className = "pill " + (impact.blocked ? "pill-red" : "pill-green");
  $("networkMap").innerHTML = `<div class="net-grid">
    <div class="net-node ${impact.blocked ? "warning" : "success"}"><strong>${safe(impact.lotId)}</strong><small>${impact.blocked ? "DOCUMENT CONFLICT" : "FIELDS MATCH"}</small></div>
    <div class="net-arrow">→</div>
    <div class="net-node ${impact.blocked ? "warning" : "success"}"><strong>${num(impact.orderCount)} / 40</strong><small>AFFECTED JOBS</small></div>
    <div class="net-arrow">→</div>
    <div class="net-node ${impact.blocked ? "warning" : "success"}"><strong>${num(impact.affectedMachines.length)} / 4</strong><small>PRODUCTION CELLS</small></div>
  </div>`;
  $("impactCaption").textContent = impact.blocked
    ? `${impact.units} units of material allocated across ${impact.orderCount} jobs. All linked work is held in the scenario until review of qualifying evidence.`
    : "Checked PO, heat, and grade match the scenario record. This is not a complete material acceptance or AS9100 audit.";
  $("jobRows").innerHTML = (impact.blocked ? impact.jobs : state.factory.jobs.slice(0, 7)).map(job => `
    <tr><td><strong>${safe(job.id)}</strong><small>${safe(job.order)}</small></td><td>${safe(state.factory.machines.find(m => m.id === job.machineId)?.label?.split("·")[0]?.trim() || job.machineId)}</td><td>${num(job.units)}</td><td>${safe(job.priority.toUpperCase())}</td><td><span class="${impact.blocked ? "tag-red" : "tag-green"}">${impact.blocked ? "REVIEW" : "NO FLAG"}</span></td></tr>`
  ).join("");
}

function pmSnippet(planId) {
  const row = state.pm?.plans?.find(p => p.planId === planId);
  if (!row?.cpm) return "";
  return `<div class="pm-snippet">
    <div title="Change in the shop-wide critical path (longest machine queue) vs. the no-incident baseline">CPM finish Δ (shop) <strong>${safe(String(row.cpm.finishDeltaHours))}h</strong></div>
    <div title="Change in when the last impacted job finishes vs. baseline">Impacted-job finish Δ <strong>${safe(String(row.cpm.impactedFinishDeltaHours ?? "—"))}h</strong></div>
    <div>CPI <em class="synthetic-mini">synthetic</em> <strong>${safe(String(row.evm?.costPerformanceIndex ?? "—"))}</strong> · New critical jobs <strong>${num((row.cpm.newlyCriticalJobIds || []).length)}</strong></div>
  </div>`;
}

function renderPmPanel() {
  const el = $("pmPanel");
  if (!el) return;
  if (!state.pm?.active) {
    el.innerHTML = '<p class="support-text">Project-management analytics activate when a material conflict triggers recovery planning.</p>';
    return;
  }
  const top = state.pm.wsjfRank.slice(0, 3).map(r => `${safe(r.jobId)} (${r.wsjfScore})`).join(", ");
  const lowest = state.pm.plans.find(p => !p.error && p.planId === state.plans[0]?.id);
  const cells = lowest?.littlesLaw || state.pm.baseline.littlesLaw;
  const baseById = new Map(state.pm.baseline.littlesLaw.map(c => [c.machineId, c]));
  el.innerHTML = `
    <p class="support-text">Synthetic CPM / EVM / WSJF and measured Little's Law — all numbers from the deterministic engine (PMP Mastery logic port). EVM rates are synthetic, not actual financials.</p>
    <div class="pm-wsjf"><strong>Fix first (WSJF):</strong> ${top}</div>
    <div class="pm-table-scroll"><table id="pmPlanTable"><thead><tr><th>Plan</th><th title="Shop-wide critical path (longest machine queue) vs baseline">CPM finish Δ (shop)</th><th title="Last impacted job finish vs baseline">Impacted-job finish Δ</th><th>Incremental late h</th><th>CPI (synthetic)</th><th>EAC (synthetic)</th><th>Critical path len</th></tr></thead>
    <tbody>${state.pm.plans.filter(p => !p.error).map(p => `<tr>
      <td>${safe(p.label)}</td>
      <td>${num(p.cpm.finishDeltaHours)}h</td>
      <td>${num(p.cpm.impactedFinishDeltaHours)}h</td>
      <td>${num(p.evm.scheduleImpactHours)}</td>
      <td>${num(p.evm.costPerformanceIndex)}</td>
      <td>${safe(money(p.evm.estimateAtCompletion))}</td>
      <td>${num(p.cpm.criticalPathIds.length)}</td>
    </tr>`).join("")}</tbody></table></div>
    <div class="form-label pm-flow-title">CELL FLOW · LITTLE'S LAW (L = λW) MEASURED FROM THE ${safe((lowest?.label || "baseline").toUpperCase())} SCHEDULE</div>
    <div class="pm-table-scroll"><table id="littlesLawTable"><thead><tr><th>Cell</th><th>Jobs</th><th title="Completed jobs / observation window">Throughput λ (jobs/h)</th><th title="Mean completion − material arrival">Flow time W (h)</th><th title="Baseline flow time">Baseline W (h)</th><th title="Time-averaged jobs in system, event sweep">Avg in system L</th><th>Queue wait (h)</th><th>Utilization</th><th title="|L − λ·W| — should be ≈ 0">|L − λW|</th></tr></thead>
    <tbody>${cells.map(c => `<tr data-cell="${safe(c.machineId)}">
      <td>${safe(c.label?.split("·")[0]?.trim() || c.machineId)}</td>
      <td>${num(c.wipJobs)}</td>
      <td>${num(c.throughputJobsPerHour.toFixed(3))}</td>
      <td>${num(c.averageTimeInSystemHours.toFixed(1))}</td>
      <td>${num((baseById.get(c.machineId)?.averageTimeInSystemHours ?? 0).toFixed(1))}</td>
      <td>${num(c.averageItemsInSystem.toFixed(2))}</td>
      <td>${num(c.averageQueueWaitHours.toFixed(1))}</td>
      <td>${num(c.utilizationPct)}%</td>
      <td>${num(c.littleCheck)}</td>
    </tr>`).join("")}</tbody></table></div>
    <p class="support-text pm-footnote">L is integrated independently from the job arrival/departure timeline; λ and W are measured separately. The last column verifies Little's Law on the synthetic schedule.</p>`;
}

function renderKanbanBoard() {
  const el = $("kanbanBoard");
  if (!el) return;
  if (!state.approval) {
    el.innerHTML = '<p class="support-text">Kanban recovery board unlocks after two-step operator consent (review token → typed confirmation). The server gates it until then.</p>';
    return;
  }
  if (!state.kanban) {
    el.innerHTML = '<p class="support-text">Loading recovery board…</p>';
    return;
  }
  const cols = state.kanban.columns || ["todo", "in_progress", "blocked", "done"];
  el.innerHTML = cols.map(col => {
    const label = col.replace(/_/g, " ");
    const cards = state.kanban.cards.filter(c => c.column === col);
    return `<div class="kanban-col"><div class="kanban-col-title">${safe(label)}</div>
      ${cards.map(card => `<div class="kanban-card" data-card="${safe(card.id)}">
        <strong>${safe(card.title)}</strong>
        <small>${safe(card.ownerRole)} · due <span class="due-hour">${num(Number.isFinite(Number(card.dueHour)) ? Number(card.dueHour) : "—")}</span>h</small>
        <div class="kanban-actions">
          ${cols.filter(c => c !== col).map(c => `<button type="button" class="btn btn-ghost kanban-move" data-card="${safe(card.id)}" data-col="${safe(c)}">→ ${safe(c.replace(/_/g, " "))}</button>`).join("")}
        </div>
      </div>`).join("")}
    </div>`;
  }).join("");
  for (const btn of el.querySelectorAll(".kanban-move")) {
    btn.addEventListener("click", () => moveKanbanCard(btn.dataset.card, btn.dataset.col));
  }
}

async function moveKanbanCard(cardId, column) {
  await ensureOperatorSession();
  const key = newIdempotencyKey("move");
  const res = await fetch("/api/kanban/move", {
    method: "POST",
    headers: { ...apiJsonHeaders(), "Idempotency-Key": key },
    body: JSON.stringify({ cardId, column })
  });
  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    await refreshKanbanFromServer();
    renderKanbanBoard();
    addEvent(`${state.approval?.operator || "Operator"} moved a Kanban card to ${column.replace(/_/g, " ")} (effect ${String(data.eventId || "").slice(0, 12)}…, idempotency key ${key.slice(0, 13)}…).${data.missionOutcome ? ` Mission outcome: ${data.missionOutcome.outcome}.` : ""}`);
    renderEvents();
    refreshLedger();
    refreshMission();
    await refreshProgramBridge();
  } else {
    const data = await res.json().catch(() => ({}));
    addEvent(`Kanban move denied: ${data.reason || data.status || res.status}.`);
    if (["CONSENT_EXPIRED", "APPROVAL_STALE"].includes(data.status)) { state.approval = null; state.kanban = null; state.pendingInvalidation = true; recalculate(); }
    renderEvents();
  }
}

function selectPlanCard(planId) {
  if (!state.plans.some(p => p.id === planId)) return;
  state.selected = planId;
  for (const card of document.querySelectorAll("[data-plan-card]")) {
    const on = card.dataset.planCard === planId;
    card.classList.toggle("selected", on);
    card.setAttribute("aria-pressed", on ? "true" : "false");
    const btn = card.querySelector("[data-plan]");
    if (btn) {
      btn.classList.toggle("btn-primary", on);
      btn.classList.toggle("btn-outline", !on);
    }
  }
}

function renderPlans() {
  if (!state.impact?.blocked) {
    $("planCards").innerHTML = '<div class="approval-state accepted">The checked document fields match. No recovery planning required for this certificate scenario. You can inject a discrepancy to begin an incident.</div>';
    return;
  }
  if (!state.plans.length) {
    $("planCards").innerHTML = "";
    return;
  }
  if (!state.selected || !state.plans.some(p => p.id === state.selected)) {
    state.selected = state.plans[0].id;
  }
  $("planCards").innerHTML = state.plans.map((plan, idx) => {
    const recommended = idx === 0;
    const selected = plan.id === state.selected;
    return `
    <article class="plan ${recommended ? "recommended" : ""} ${selected ? "selected" : ""}" data-plan-card="${safe(plan.id)}" role="button" tabindex="0" aria-pressed="${selected ? "true" : "false"}" aria-label="Select recovery option: ${safe(plan.label)}">
      <span class="plan-rank">${recommended ? "LOWEST ESTIMATED COST · RECOMMENDED" : `OPTION 0${num(idx + 1)}`}</span>
      <h3>${safe(plan.label)}</h3><p>${safe(plan.description)}</p>
      <div class="plan-cost">${num(money(plan.estimatedCost))}</div>
      <div class="plan-data">
        <div>Jobs still conditional <strong>${num(plan.conditionalJobs)}</strong></div>
        <div>Qualified units allocated <strong>${num(plan.stockUsed)}</strong></div>
        <div>Incremental late hours <strong>${num(plan.incrementalLateHours.toFixed(1))}</strong></div>
        <div title="Every late job in the 40-job shop under this plan, not only impacted jobs">Late jobs (shop-wide) <strong>${num(plan.lateJobs)}</strong></div>
      </div>
      ${(plan.id === "reallocate" || plan.id === "hybrid") && plan.stockAvailable === 0 ? `<div class="plan-note">${num(state.factory.disruptions?.substituteLotQuestioned ? "Substitute lot on hold — 0 qualified units available" : "Qualified substitute stock set to 0 units")}, so no stock can be reallocated.</div>` : ""}
      ${pmSnippet(plan.id)}
      <button class="btn ${selected ? "btn-primary" : "btn-outline"}" type="button" data-plan="${safe(plan.id)}">Review this option →</button>
    </article>`;
  }).join("");
  for (const card of document.querySelectorAll("[data-plan-card]")) {
    card.addEventListener("click", e => {
      if (e.target.closest("[data-plan]")) return;
      selectPlanCard(card.dataset.planCard);
    });
    card.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      selectPlanCard(card.dataset.planCard);
    });
  }
  for (const button of document.querySelectorAll("[data-plan]")) {
    button.addEventListener("click", e => {
      e.stopPropagation();
      selectPlanCard(button.dataset.plan);
      openApproval(button.dataset.plan);
    });
  }
}
function renderApproval() {
  const el = $("approvalState");
  if (!state.approval) {
    el.className = "approval-state";
    el.textContent = "No recovery strategy accepted. A human operator must review every proposed response.";
  } else {
    const plan = state.plans.find(p => p.id === state.approval.planId);
    el.className = "approval-state accepted";
    const exp = state.approval.expiresAt ? new Date(state.approval.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
    const env = state.approval.envelope;
    el.textContent = `Recorded scenario acceptance by ${state.approval.operator}: ${plan?.label || "unknown plan"} · consent ${String(state.approval.consentJti || "").slice(0, 8)}… · approval expires ${exp} · bound to scenario ${String(state.approval.scenarioHash || "").slice(0, 10)}…${env ? ` · envelope: plan params ${String(env.planParamHash).slice(0, 10)}…, TTL ${Math.round(env.ttlSec / 60)} min, single-use nonce, HMAC-sealed` : ""}. Physical material remains subject to independent release approval.`;
  }
}
function syncActionPlanSelect() {
  const sel = $("actionPlanSelect");
  if (!sel) return;
  const plans = state.plans || [];
  const prev = sel.value || state.selected || "";
  sel.innerHTML = plans.length
    ? plans.map(p => `<option value="${safe(p.id)}">${safe(p.id)} — ${safe(p.label)}</option>`).join("")
    : `<option value="">(no blocked plans)</option>`;
  if (prev && plans.some(p => p.id === prev)) sel.value = prev;
  else if (state.selected) sel.value = state.selected;
}

function renderOverviewViz() {
  const beat = state.scrubLocked && state.demoBeat
    ? state.demoBeat
    : resolveDemoBeat(state).active;
  if (!state.scrubLocked) state.demoBeat = beat;
  renderConsequenceSparkline($("consequenceSparkline"), state.impact, state.plans?.length || 0);
  renderIncidentTimeline($("incidentTimeline"), state.events);
  renderDemoStory($("demoStoryRail"), state);
  renderTimeConductor($("timeConductor"), state, beat);
  renderPlantSchematic($("plantSchematic"), state.factory, state.impact, beat);
  const plansForCompare = (state.plans || []).map(p => ({ ...p, _selected: p.id === state.selected }));
  renderPlanCompare($("planCompare"), plansForCompare, state.impact, state.factory, state.selected);
  renderOrderSparklines($("orderSparklines"), state.plans, state.factory, state.impact, detail => {
    const drill = $("orderDrill");
    if (!drill) return;
    const job = (state.factory.jobs || []).find(j => j.id === detail.jobId);
    const plan = (state.plans || []).find(p => p.id === detail.planId);
    drill.textContent = [
      `ORDER ${detail.jobId}`,
      `STRATEGY ${detail.planId} (${plan?.label || "—"})`,
      `LATE_H ${detail.lateHours}`,
      `ALLOC ${detail.status || "—"}`,
      job ? `CELL ${job.machineId} · UNITS ${job.units} · PRI ${job.priority} · DUE_H ${job.dueHour}` : ""
    ].filter(Boolean).join("\n");
  });
  const jobList = state.impact?.jobs || state.factory?.jobs || [];
  renderImpactConstellation($("impactConstellation"), state.impact, jobList);
  renderLedgerChain($("ledgerChain"), state.events, state.ledger);
  syncActionPlanSelect();
}
function render() {
  $("clock").textContent = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  renderClaimMeter();
  renderMetrics(); renderPacket(); renderIncident(); renderFindings(); renderNetwork(); renderPlans(); renderPmPanel(); renderApproval(); renderKanbanBoard(); renderEvents();
  renderOverviewViz();
}
let consentTimer = null;
function stopConsentTimer() { if (consentTimer) { clearInterval(consentTimer); consentTimer = null; } }
async function openApproval(planId) {
  const plan = state.plans.find(item => item.id === planId);
  if (!plan) return;
  state.selected = plan.id;
  state.consentToken = null;
  stopConsentTimer();
  $("approvalDescription").textContent = `${plan.label}: estimated scenario cost ${money(plan.estimatedCost)}; ${plan.stockUsed} qualified substitute units allocated and ${plan.conditionalJobs} jobs conditional. This records a scenario planning decision only, never release of physical material.`;
  $("operatorInput").value = state.operatorName || "";
  $("operatorInput").readOnly = Boolean(state.operatorName);
  $("approvalPhrase").value = "";
  $("approvalPhrase").placeholder = `APPROVE ${plan.id}`;
  $("confirmApproval").disabled = true;
  $("issueToken").disabled = false;
  $("consentHint").textContent = state.operatorName
    ? "ARM: issuing a server-signed review token…"
    : "ARM: enter your operator name, then press ARM. The server recomputes this plan and binds the token to your session, the plan hash and the current scenario.";
  $("approveDialog").showModal();
  if (state.operatorName) await issueConsentToken();
}
async function issueConsentToken() {
  const plan = state.plans.find(p => p.id === state.selected);
  const operator = $("operatorInput").value.trim();
  if (!plan) return;
  if (!operator) { $("operatorInput").focus(); return; }
  $("issueToken").disabled = true;
  try {
    await ensureOperatorSession();
    const res = await fetch("/api/consent/review", { method: "POST", headers: apiJsonHeaders(), body: JSON.stringify({ planId: plan.id, operator: operator.slice(0, 64), ...currentInputs() }) });
    const data = await res.json();
    if (data.status !== "REVIEW_TOKEN") {
      $("consentHint").textContent = data.reason === "OPERATOR_BOUND"
        ? `This session is bound to operator "${data.operator}". Use that name.`
        : `Review denied: ${data.reason || data.status}`;
      $("issueToken").disabled = false;
      return;
    }
    state.operatorName = data.operator;
    $("operatorInput").value = data.operator;
    $("operatorInput").readOnly = true;
    state.consentToken = data;
    $("confirmApproval").disabled = false;
    const pp = data.planParameters || {};
    $("envelopePreview").hidden = false;
    $("envelopePreview").innerHTML = `Consent envelope you are about to seal: plan <code>${safe(data.plan?.id)}</code> · server-recomputed plan-parameter hash <code>${safe(String(data.planParamHash || "").slice(0, 16))}…</code> (cost ${safe(money(pp.estimatedCost ?? 0))}, ${safe((pp.allocations || []).length)} job allocations, ${safe(pp.lateJobs ?? "?")} late jobs) · scenario <code>${safe(String(data.scenarioHash || "").slice(0, 12))}…</code> · approval TTL ${safe(Math.round((data.approvalTtlSec || 900) / 60))} min (policy max 15) · single-use nonce persisted on use · mission <code>${safe(data.traceId || "")}</code>`;
    refreshMission();
    addEvent(`Review token issued to ${data.operator} for ${plan.label} (server-recomputed plan hash ${data.planHash.slice(0, 8)}…, expires in ${data.ttlSec}s).`);
    renderEvents();
    const tick = () => {
      const left = Math.max(0, Math.round((Date.parse(data.expiresAt) - Date.now()) / 1000));
      if (!left) {
        stopConsentTimer();
        state.consentToken = null;
        $("confirmApproval").disabled = true;
        $("issueToken").disabled = false;
        $("consentHint").textContent = "Review token expired. Issue a new token to continue.";
        return;
      }
      $("consentHint").textContent = `COMMIT: type exactly "${data.phrase}" then press COMMIT. Single-use token expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}.`;
    };
    stopConsentTimer();
    tick();
    consentTimer = setInterval(tick, 1000);
    $("approvalPhrase").focus();
  } catch {
    $("consentHint").textContent = "Consent service unavailable.";
    $("issueToken").disabled = false;
  }
}
async function confirmConsent() {
  const plan = state.plans.find(p => p.id === state.selected);
  const token = state.consentToken;
  if (!plan || !token) return;
  const phrase = $("approvalPhrase").value.trim();
  $("confirmApproval").disabled = true;
  await ensureOperatorSession();
  const idemKey = newIdempotencyKey("confirm");
  const confirm = await fetch("/api/consent/confirm", {
    method: "POST",
    headers: { ...apiJsonHeaders(), "Idempotency-Key": idemKey },
    body: JSON.stringify({ token: token.token, phrase, ...currentInputs() })
  }).then(r => r.json()).catch(() => ({ status: "ERROR" }));
  if (confirm.status !== "ACCEPTED") {
    const reason = confirm.reason || confirm.status;
    $("consentHint").textContent = `Consent denied by server: ${reason}.${reason === "PHRASE_MISMATCH" ? " Type the exact phrase." : " Issue a new token."}`;
    if (reason === "PHRASE_MISMATCH") $("confirmApproval").disabled = false;
    else { state.consentToken = null; stopConsentTimer(); $("issueToken").disabled = false; }
    addEvent(`Consent denied for ${plan.label}: ${reason}.`);
    renderEvents();
    refreshLedger();
    return;
  }
  stopConsentTimer();
  state.consentToken = null;
  state.approval = { planId: confirm.planId, operator: confirm.operator, at: new Date().toISOString(), consentJti: confirm.jti, expiresAt: confirm.expiresAt, scenarioHash: confirm.scenarioHash, envelope: confirm.envelope, idempotencyKey: confirm.idempotencyKey, traceId: confirm.traceId };
  $("envelopePreview").hidden = true;
  addEvent(`${confirm.operator} accepted the ${plan.label} planning scenario (two-step consent ${confirm.jti.slice(0, 8)}…, approval expires ${new Date(confirm.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}). No physical material released.`);
  $("approveDialog").close();
  if (confirm.kanbanReady) await refreshKanbanFromServer();
  recalculate();
  refreshLedger();
  refreshMission();
  await refreshProgramBridge();
}
function setCertificate(text, message) {
  const clears = !traceImpact(state.factory, validateCertificate(state.factory, text)).blocked;
  const wasBlocked = Boolean(state.impact?.blocked);
  if (text !== state.text || state.approval) resetDecision("certificate evidence changed", { serverRevoke: !clears });
  state.text = text;
  $("certText").value = text;
  recalculate(message);
  if (clears && wasBlocked) closeMissionOnServer();
}

/** Certificate now matches: the server re-checks it and records the mission outcome. */
async function closeMissionOnServer() {
  try {
    await ensureOperatorSession();
    const data = await fetch("/api/mission/close", { method: "POST", headers: apiJsonHeaders(), body: JSON.stringify(currentInputs()) }).then(r => r.json());
    if (data.missionOutcome) addEvent(`Mission ${data.missionOutcome.traceId} closed: ${data.missionOutcome.outcome} (server re-checked the certificate).`);
    renderEvents();
    refreshLedger();
    refreshMission();
  } catch { /* the engine view is unaffected */ }
}
function updateAssumptions() {
  resetDecision("operator changed production assumptions");
  state.assumptions = {
    substituteStock: Number($("stockRange").value),
    expeditedLotHours: Number($("etaRange").value),
    machineOutageHours: Number($("outageRange").value)
  };
  $("stockVal").textContent = state.assumptions.substituteStock;
  $("etaVal").textContent = state.assumptions.expeditedLotHours;
  $("outageVal").textContent = state.assumptions.machineOutageHours;
  recalculate("Recovery simulation recalculated after operator adjusted production assumptions.");
}

/* ---------- Meta Muse Spark brief ---------- */
function renderClaimMeter() {
  const el = $("claimBlockedCount");
  if (!el) return;
  el.textContent = state.briefStale ? "—" : String(state.lastClaimBlocked);
  $("claimMeter")?.classList.toggle("has-blocks", !state.briefStale && state.lastClaimBlocked > 0);
}
function applyMetaModeLabels() {
  const sample = isSample();
  $("metaPill").textContent = sample ? "MUSE SPARK 1.3 · SAMPLE MODE" : "MUSE SPARK 1.3 · LIVE";
  $("metaPill").className = "pill " + (sample ? "pill-amber" : "pill-green");
  $("metaBtn").textContent = sample ? `Generate brief · ${SAMPLE_LABEL}` : "Generate Muse Spark brief (live, tool-calling) ↗";
  $("metaModeNote").textContent = sample
    ? `${SAMPLE_LABEL}: the same read-only engine tools run and every sentence is claim-checked, but the wording is a template — no model is called. The live Muse Spark path switches on when MODEL_API_KEY is set.`
    : "Live Muse Spark: the model calls read-only engine tools, then every sentence is claim-checked against server-side evidence before display.";
}
function markBriefStale() {
  state.brief = null;
  state.briefStale = true;
  const out = $("aiOutput");
  if (out) out.textContent = "Scenario changed — the previous brief no longer matches the evidence and was cleared. Generate a new brief.";
  if ($("aiTrace")) $("aiTrace").innerHTML = "";
  if ($("aiBlocked")) $("aiBlocked").innerHTML = "";
}
async function requestBrief(mode = "brief") {
  const output = $("aiOutput");
  const button = mode === "adversarial" ? $("adversarialBtn") : $("metaBtn");
  if (!state.impact.blocked) { output.textContent = "No active certificate discrepancy to brief."; return; }
  button.disabled = true;
  const label = mode === "adversarial" ? "Adversarial self-test" : isSample() ? SAMPLE_LABEL : "Live Muse Spark";
  output.textContent = mode === "adversarial"
    ? "Adversarial self-test: sending known-bad sentences through the claim checker (no model call)…"
    : isSample()
      ? `${SAMPLE_LABEL}: running read-only engine tools and building the template brief — no model call…`
      : "Live Muse Spark: model is calling read-only engine tools…";
  addEvent(mode === "adversarial" ? "Operator ran the adversarial claim-checker self-test." : `Operator requested a scenario brief (${label}).`);
  renderEvents();
  try {
    await ensureOperatorSession();
    const response = await fetch("/api/meta-brief", {
      method: "POST", headers: apiJsonHeaders(),
      body: JSON.stringify({ scenarioId: state.factory.scenarioId, ...currentInputs(), scenarioHash: currentScenarioHash(), mode })
    });
    const result = await response.json();
    state.lastClaimBlocked = result.blockedCount ?? 0;
    state.briefStale = false;
    state.brief = { ...result, requestedAt: new Date().toISOString() };
    renderClaimMeter();
    const modeLabel = result.modeLabel || label;
    if (result.status === "BLOCKED") {
      output.textContent = `${modeLabel} • OUTPUT SCREEN: model attempted forbidden approval/release language (${(result.screenViolations || []).join(", ")}).`;
    } else if (result.status === "COMPLETE" || result.status === "PARTIAL") {
      const decision = result.decisionText || result.text || "(every sentence was blocked)";
      const cite = t => safe(t).replace(/\[evidence:([^\]]+)\]/g, (_, id) => {
        const href = id.startsWith("pm:") ? "#pm" : id.includes("ledger") || id.includes("audit") ? "#decision" : id.includes("job") || id.includes("order") || /^WO-|^J\d/i.test(id) ? "#impact" : "#evidence";
        return `<a class="cite cite-chip" href="${safe(href)}" data-evidence="${safe(id)}" title="Evidence ${safe(id)}">[${safe(id)}]</a>`;
      });
      let advisory = "";
      if (result.advisoryText || (result.advisoryDroppedCount ?? 0) > 0) {
        advisory = `<div class="ai-mode ai-advisory-label">AI advisory (template-rendered, not a decision)</div>`;
        if (result.advisoryText) advisory += `<div class="ai-text ai-advisory-panel">${cite(result.advisoryText)}</div>`;
        if ((result.advisoryDroppedCount ?? 0) > 0) {
          advisory += `<div class="ai-text ai-advisory-panel support-text">${num(result.advisoryDroppedCount)} unverified advisory item(s) dropped (fail closed).</div>`;
        }
      }
      const rawPanel = $("aiRawPanel");
      const rawOut = $("aiRawOutput");
      if (rawPanel && rawOut) {
        if (result.rawModelAuditAvailable) {
          rawPanel.hidden = false;
          rawOut.textContent = "Expand to load raw model output from GET /api/audit/raw-model-output (UNVERIFIED, audit only).";
          rawPanel.removeAttribute("open");
        } else {
          rawPanel.hidden = true;
          rawOut.textContent = "";
        }
      }
      output.innerHTML = `<div class="ai-mode">${safe(modeLabel)} • DECISION (evidence-bound claims)</div>
        <div class="ai-text ai-decision-panel">${cite(decision)}</div>
        ${advisory}
        <div class="ai-foot">Schema: ${safe(result.allowlistArchitecture || "allowlist")} · claims ${num(result.claimAudit?.structuredClaims ?? "?")} · advisory dropped ${num(result.advisoryDroppedCount ?? 0)} · sentences removed ${num(state.lastClaimBlocked)} · registry ${num(result.registrySize)} facts · scenario ${safe(String(result.scenarioHash || "").slice(0, 10))}…</div>`;
    } else {
      output.textContent = `${modeLabel}: ${result.message || "explanation unavailable."}`;
    }
    $("aiTrace").innerHTML = (result.trace || []).length
      ? `<div class="form-label">TOOL TRACE (${num(result.trace.length)} read-only engine calls)</div><ol>${result.trace.map(t => `<li><code>${safe(t.tool)}(${safe(JSON.stringify(t.args || {}))})</code>${t.why ? ` — ${safe(t.why)}` : ""} <small>${num((t.evidenceIds || []).length)} evidence ids</small></li>`).join("")}</ol>`
      : "";
    $("aiBlocked").innerHTML = (result.blocked || []).length
      ? `<div class="form-label">BLOCKED SENTENCES</div><ul>${result.blocked.map(b => `<li><span class="finding-status CONFLICT">${safe(b.reason)}</span> ${safe(b.sentence)}${b.detail ? ` <small>(${safe(b.detail.join(", "))})</small>` : ""}</li>`).join("")}</ul>`
      : "";
    renderArbitration();
    addEvent(result.status === "COMPLETE" || result.status === "PARTIAL"
      ? `${modeLabel} brief displayed: ${state.lastClaimBlocked} sentence(s) blocked, ${(result.trace || []).length} tool call(s).`
      : `${modeLabel}: brief unavailable or blocked.`);
    refreshLedger();
  } catch {
    output.textContent = `${label}: the brief service could not be reached. The independent scenario engine is still available.`;
    addEvent(`${label} brief request failed.`);
  } finally { button.disabled = false; renderEvents(); }
}

/* ---------- Audit ledger ---------- */
function renderLedger() {
  const l = state.ledger;
  const chip = $("ledgerStatus");
  const banner = $("ledgerIntegrityBanner");
  if (!chip || !l) return;
  const at = l.checkedAt ? new Date(l.checkedAt).toLocaleTimeString() : "—";
  chip.className = "ledger-status " + (l.ok ? "ok" : "bad");
  chip.dataset.ok = l.ok ? "1" : "0";
  chip.textContent = l.ok
    ? `Audit ledger verified ✓ · ${l.length} entries · head ${String(l.tip || "").slice(0, 10)}… · HMAC-keyed, head-anchored · re-checked from disk ${at} (auto every ${Math.round((l.verifyIntervalMs || 30000) / 1000)}s)`
    : `Audit ledger FAILED verification (${l.reason}) · checked ${at}`;
  if (banner) {
    banner.hidden = l.ok;
    banner.textContent = l.ok ? "" : `Audit ledger tamper detected (${l.reason}) — hash chain / HMAC / head anchor failed verification. Consent is disabled; treat recorded decisions as untrusted.`;
  }
}
async function refreshLedger(verify = false) {
  try {
    const data = verify
      ? await fetch("/api/audit/verify").then(r => r.json())
      : (await fetch("/api/health").then(r => r.json())).ledgerIntegrity;
    if (data) { state.ledger = data; renderLedger(); }
    return data;
  } catch { return null; }
}

async function fetchRawModelAudit() {
  await ensureOperatorSession();
  const r = await fetch("/api/audit/raw-model-output", { headers: apiJsonHeaders() });
  return r.ok ? r.json() : null;
}

async function exportAuditRawModelFile() {
  addEvent("Operator exported UNVERIFIED raw model output (separate audit file).");
  const data = await fetchRawModelAudit();
  if (!data) {
    addEvent("Raw model audit export failed — no capture for this session.");
    renderEvents();
    return;
  }
  const bytes = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(bytes);
  const a = document.createElement("a");
  a.href = url;
  a.download = `raw-model-output-UNVERIFIED-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  renderEvents();
}

async function exportReport() {
  addEvent("Operator exported a scenario evidence report.");
  const audit = await refreshLedger(true);
  const report = createReport(state.factory, state.certificate, state.impact, state.plans, state.approval, state.events, {
    auditLedger: audit,
    claimAudit: { lastBlockedCount: state.lastClaimBlocked, stale: state.briefStale },
    metaBrief: state.brief ? {
      modeLabel: state.brief.modeLabel, mode: state.brief.mode, verifiedLive: state.brief.verifiedLive, model: state.brief.model,
      decisionText: state.brief.decisionText,
      advisoryText: state.brief.advisoryText,
      text: [state.brief.decisionText, state.brief.advisoryText].filter(Boolean).join("\n\n"),
      advisoryDroppedCount: state.brief.advisoryDroppedCount ?? 0,
      blocked: state.brief.blocked, citations: state.brief.citations, trace: state.brief.trace,
      registryHash: state.brief.registryHash, scenarioHash: state.brief.scenarioHash,
      rawModelAuditAvailable: Boolean(state.brief.rawModelAuditAvailable)
    } : { modeLabel: state.metaModeLabel, note: "No brief generated for the current scenario." },
    build: state.build,
    projectManagement: state.pm,
    kanban: state.kanban
  });
  await refreshMission();
  report.resilience = {
    missionChain: state.mission,
    arbitration: { shockContention: state.arbitration, aiVsEngine: state.brief?.arbitration || null },
    proveIt: state.proveIt,
    lastAnswer: state.lastAnswer ? { question: state.lastAnswer.question, provenance: state.lastAnswer.provenance, provenanceLabel: state.lastAnswer.provenanceLabel, ladder: state.lastAnswer.ladder, text: state.lastAnswer.text, museReason: state.lastAnswer.museReason || null, eventId: state.lastAnswer.eventId } : null,
    consentEnvelope: state.approval?.envelope || null
  };
  const bytes = new Blob([JSON.stringify(report, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(bytes);
  const a = document.createElement("a");
  a.href = url; a.download = `forgefront-factory-evidence-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  renderEvents();
}
function applySecondShock() {
  if (state.secondShockApplied) {
    addEvent("Second disruption already active in this session.");
    renderEvents();
    return;
  }
  resetDecision("second shock: substitute lot questioned + horizontal cell outage");
  state.secondShockApplied = true;
  state.factory = applyDisruptions(state.factory, { substituteLotQuestioned: true, machineOutageHours: 12 });
  state.assumptions.machineOutageHours = 12;
  state.assumptions.substituteStock = 0;
  $("outageRange").value = 12;
  $("stockRange").value = 0;
  $("outageVal").textContent = 12;
  $("stockVal").textContent = 0;
  recalculate("Second shock: substitute lot questioned and horizontal cell outage injected — recovery options recomputed.");
  notifyProgram("SECOND_SHOCK", {
    impactedJobs: state.impact?.jobs?.length || 0,
    impactedUnits: state.impact?.units || 0
  });
}

async function submitPdf(body, path) {
  const route = $("pdfRoute");
  route.textContent = "Extracting PDF text layer…";
  try {
    await ensureOperatorSession();
    const result = await fetch(path, { method: "POST", headers: apiJsonHeaders(), body: JSON.stringify(body) }).then(r => r.json());
    const fields = result.decision ? ["po", "heat", "grade"].map(k => `${k}=${result.decision[k] || "—"}`).join(" ") : "";
    route.textContent = `PDF route: ${result.route}${result.reason ? ` (${result.reason})` : ""} · ${result.extraction?.method || ""}${fields ? ` · ${fields}` : ""}`;
    route.title = result.message || "";
    if (result.certificateText) setCertificate(result.certificateText, `PDF intake (${result.source || "upload"}, ${result.route}) extracted certificate text — ${result.extraction?.compressed ? "compressed" : "uncompressed"} text layer.`);
    else { addEvent(`PDF intake flagged: ${result.reason || result.route}${result.message ? ` — ${result.message}` : ""}`); renderEvents(); }
    refreshLedger();
  } catch {
    route.textContent = "PDF intake failed";
  }
}

/* ---------- Ask: deterministic-first resolution ladder ---------- */
const PROV_LABEL = { engine: "ENGINE", cache: "CACHE", "muse-spark": "MUSE SPARK" };
async function askQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return;
  const out = $("askOutput");
  $("askBtn").disabled = true;
  out.innerHTML = `<div class="ask-answer">Resolving: engine → cache → Muse Spark…</div>`;
  try {
    await ensureOperatorSession();
    const r = await fetch("/api/ask", { method: "POST", headers: apiJsonHeaders(), body: JSON.stringify({ question: q, ...currentInputs() }) }).then(x => x.json());
    state.lastAnswer = r;
    const prov = r.provenance || "engine";
    const ladder = (r.ladder || []).map(l => `<li class="${l.outcome === "answered" || l.outcome === "hit" || l.outcome === "answered-with-removals" ? "hit" : "skip"}" title="${safe(l.detail)}">${safe(l.rung)} · ${safe(l.outcome)}</li>`).join("");
    const why = prov === "muse-spark" ? `<div class="support-text">Why Muse Spark here (<code>${safe(r.museReason || "")}</code>): ${safe(r.museWhy || "")} The engine facts it used are cited inline; this reason is logged to the ledger.</div>` : prov === "cache" ? `<div class="support-text">Served from a verified ${safe(r.modeLabel || "")} answer (${safe(r.cachedFrom || "")}); no model call.</div>` : `<div class="support-text">Answered by resolver <code>${safe(r.resolver || "")}</code> straight from engine outputs — recomputed, never cached.</div>`;
    out.innerHTML = `<div class="ask-answer" data-provenance="${safe(prov)}"><span class="prov prov-${safe(prov)}">${safe(PROV_LABEL[prov] || prov)}</span><strong>${safe(r.provenanceLabel || "")}</strong>
      <div class="ai-text">${safe(r.text || "(no sentence survived the claim checker)").replace(/\[evidence:([^\]]+)\]/g, '<span class="cite">$1</span>')}</div>
      ${why}<ol class="ladder">${ladder}</ol>${(r.blocked || []).length ? `<div class="support-text">${num(r.blocked.length)} sentence(s) removed by the claim checker.</div>` : ""}</div>`;
    addEvent(`Question answered by ${PROV_LABEL[prov] || prov}${prov === "muse-spark" ? ` (${r.museReason})` : prov === "engine" ? ` (${r.resolver})` : ""}: "${q.slice(0, 60)}".`);
    renderEvents();
    refreshLedger();
  } catch {
    out.innerHTML = `<div class="ask-answer">The ask service could not be reached. The engine view is unaffected.</div>`;
  } finally { $("askBtn").disabled = false; }
}

/* ---------- Conflict arbitration ---------- */
let arbitrationTimer = null;
function scheduleArbitration() {
  clearTimeout(arbitrationTimer);
  arbitrationTimer = setTimeout(refreshArbitration, 250);
}
async function refreshArbitration() {
  if (!state.impact?.blocked) { state.arbitration = null; renderArbitration(); return; }
  try {
    await ensureOperatorSession();
    state.arbitration = await fetch("/api/arbitration", { method: "POST", headers: apiJsonHeaders(), body: JSON.stringify({ ...currentInputs(), planId: state.approval?.planId || null }) }).then(r => r.json());
    renderArbitration();
  } catch { /* panel keeps its last state */ }
}
function arbCard(d) {
  const ranked = Object.entries(d.scores || {}).sort((a, b) => b[1] - a[1]);
  const bars = ranked.map(([id, score]) => `<div class="arb-bar ${id === d.winnerClaimId || d.status === "MERGED" ? "" : "loser"}"><span>${safe(id)}</span><span class="track"><span class="fill" data-w="${num(Math.round(score * 100))}"></span></span><span>${num(score.toFixed(3))}</span></div>`).join("");
  const head = d.kind === "shock-contention"
    ? `<strong>${safe(d.cell)}</strong> · next slot at ${safe(d.slotStartHour)}h · shocks: ${safe((d.shocksInvolved || []).join(" vs "))} · plan ${safe(d.planId)}`
    : `<strong>AI vs engine</strong>${d.checkReason ? ` · ${safe(d.checkReason)}` : ""} · “${safe(String(d.sentence || "").replace(/\[evidence:[^\]]+\]/g, "").trim().slice(0, 110))}”`;
  const win = d.status === "RESOLVED" || d.status === "MERGED"
    ? (d.kind === "shock-contention" ? ` → next job <strong>${safe(d.value?.nextJob)}</strong>` : d.status === "MERGED" ? " → model agrees with engine" : " → engine value kept, model sentence removed")
    : d.status === "ESCALATED" ? ` → ${safe(d.authority || "human operator")}` : " → no winner recorded";
  return `<div class="arb-card" data-status="${safe(d.status)}"><span class="arb-status arb-${safe(d.status)}">${safe(d.status.replace("_CONFLICT", ""))}</span> ${head}${win}<div class="arb-bars">${bars}</div><div class="support-text">${safe(d.rationale)}</div></div>`;
}
function renderArbitration() {
  const el = $("arbitrationPanel");
  if (!el) return;
  const cells = state.arbitration?.decisions || [];
  const ai = (state.brief?.arbitration?.decisions || []).filter(d => !state.briefStale);
  const shocks = (state.arbitration?.shocks || []).map(s => s.label).join(" · ") || "none";
  const cellHtml = cells.length ? cells.map(arbCard).join("") : `<div class="support-text">No cell is contested by two shocks right now (active shocks: ${safe(shocks)}). Add a horizontal-cell outage or apply the second shock to see contention.</div>`;
  const tally = state.brief?.arbitration?.tally || {};
  const aiHtml = ai.length
    ? `<div class="arb-tally">Last brief: ${Object.entries(tally).map(([k, v]) => `${safe(k)} ${num(v)}`).join(" · ")}</div>${num(ai.slice(0, 8).map(arbCard).join(""))}`
    : `<div class="support-text">Generate a brief (or the adversarial brief) to arbitrate model sentences against engine evidence.</div>`;
  el.innerHTML = `<div class="form-label">SHOCK CONTENTION · ${safe(cells.length)} CONTESTED CELL(S) · ACTIVE SHOCKS: ${safe(shocks)}</div>${cellHtml}<div class="form-label">AI CLAIM VS ENGINE</div>${aiHtml}`;
  // CSP forbids inline style attributes; set bar widths through the CSSOM instead.
  for (const bar of el.querySelectorAll(".fill[data-w]")) bar.style.width = `${bar.dataset.w}%`;
}

/* ---------- Mission chain ---------- */
async function refreshMission() {
  try {
    await ensureOperatorSession();
    state.mission = await fetch("/api/mission", { headers: apiJsonHeaders() }).then(r => r.json());
    renderMission();
  } catch { /* keep last */ }
}
function renderMission() {
  const el = $("missionPanel");
  const missions = state.mission?.missions || [];
  if (!el) return;
  if (!missions.length) { el.textContent = "No mission yet. Reviewing a recovery plan opens one."; return; }
  el.innerHTML = missions.slice(0, 3).map((m, i) => {
    const stages = (state.mission.stages || []).map(stage => {
      const evs = m.stages[stage] || [];
      const last = evs.at(-1);
      return `<div class="stage ${evs.length ? "done" : ""}" data-stage="${safe(stage)}"><div class="stage-name">${safe(stage)}</div>${last ? `<div>${safe(last.action)}${evs.length > 1 ? ` ×${num(evs.length)}` : ""}</div><code>${safe(last.event_id)}</code>${last.idempotency_key ? `<div title="idempotency key">🔑 ${safe(String(last.idempotency_key).slice(0, 14))}…</div>` : ""}` : "<div>—</div>"}</div>`;
    }).join("");
    const outcome = m.stages.outcome?.at(-1)?.detail || (m.traceId === state.mission.currentTraceId ? "open" : "—");
    return `<div class="mission-card" data-trace="${safe(m.traceId)}" data-complete="${m.complete ? "1" : "0"}"><div class="mission-meta ${m.ok ? "ok" : "bad"}">${i === 0 ? "Latest" : "Earlier"} mission <code>${safe(m.traceId)}</code> · ${num(m.eventCount)} events · chain ${m.ok ? "verified (order, parent links, unique keys)" : `PROBLEMS: ${safe(m.problems.join(", "))}`} · ${m.complete ? "complete" : "in progress"} · outcome: ${safe(outcome)}</div><div class="stage-row">${stages}</div></div>`;
  }).join("");
}

/* ---------- Prove it ---------- */
async function runProveIt() {
  const btn = $("proveItBtn");
  const list = $("proveItResults");
  btn.disabled = true;
  list.innerHTML = "<li>Running five live checks against this server…</li>";
  try {
    await ensureOperatorSession();
    const r = await fetch("/api/prove-it", { method: "POST", headers: apiJsonHeaders(), body: "{}" }).then(x => x.json());
    state.proveIt = r;
    list.dataset.status = r.status || "";
    list.innerHTML = (r.checks || []).map(c => `<li class="${c.pass ? "pass" : "fail"}" data-check="${safe(c.id)}"><span class="verdict">${c.pass ? "PASS" : "FAIL"}</span><strong>${safe(c.title)}</strong> <small>${num(c.ms)} ms</small><ul>${c.evidence.map(e => `<li>${safe(e)}</li>`).join("")}</ul></li>`).join("")
      || `<li class="fail">${safe(r.status || "unavailable")}</li>`;
    if (r.preflight && !r.preflight.liveLedgerOk) list.insertAdjacentHTML("afterbegin", `<li class="fail" data-check="preflight"><span class="verdict">NOTE</span><strong>Live ledger already fails verification (${safe(r.preflight.liveLedgerReason)})</strong><ul><li>Consent and Kanban stay locked until the ledger is restored; checks that need a consent decision will fail for this reason.</li></ul></li>`);
    addEvent(`Prove it: ${r.passed}/${r.total} live checks passed (${r.status}).`);
    renderEvents();
    refreshLedger();
  } catch {
    list.innerHTML = `<li class="fail">Prove-it service unavailable.</li>`;
  } finally { btn.disabled = false; }
}

function install() {
  state.incident = createIncidentRecord(state.factory);
  $("certText").value = state.text;
  $("injectBtn").addEventListener("click", () => {
    setCertificate(INCORRECT_CERT, "Deliberate heat-number discrepancy injected into supplier certificate.");
    notifyProgram("CERTIFICATE_CONFLICT", {
      impactedJobs: state.impact?.jobs?.length || 0,
      impactedUnits: state.impact?.units || 0
    });
  });
  $("secondShockBtn")?.addEventListener("click", applySecondShock);
  $("correctBtn").addEventListener("click", () => {
    setCertificate(MATCHING_CERT, "Matching certificate example loaded for reevaluation.");
    notifyProgram("CERTIFICATE_CLEARED", {});
  });
  $("analyseBtn").addEventListener("click", () => setCertificate($("certText").value, "Operator submitted certificate text for independent field checks."));
  $("resetBtn").addEventListener("click", () => {
    resetDecision("scenario reset");
    state.factory = createScenario();
    state.secondShockApplied = false;
    state.assumptions = { substituteStock: 96, expeditedLotHours: 20, machineOutageHours: 0 };
    $("stockRange").value = 96; $("etaRange").value = 20; $("outageRange").value = 0;
    $("stockVal").textContent = 96; $("etaVal").textContent = 20; $("outageVal").textContent = 0;
    setCertificate(INCORRECT_CERT, "Synthetic demonstration reset to original state.");
    notifyProgram("RESET", {});
  });
  for (const id of ["stockRange", "etaRange", "outageRange"]) $(id).addEventListener("input", updateAssumptions);
  $("exportBtn").addEventListener("click", exportReport);
  $("exportAuditRawBtn")?.addEventListener("click", exportAuditRawModelFile);
  $("aiRawPanel")?.addEventListener("toggle", async () => {
    const panel = $("aiRawPanel");
    const rawOut = $("aiRawOutput");
    if (!panel?.open || !rawOut) return;
    rawOut.textContent = "Loading from /api/audit/raw-model-output …";
    const data = await fetchRawModelAudit();
    if (!data) {
      rawOut.textContent = "No raw model capture for this session.";
      return;
    }
    const screened = data.phraseScreen?.commentaryWithheld ? "\n\n[phrase screen: decision language detected in raw prose]" : "";
    rawOut.textContent = `${data.label}\n${data.warning}\n\n${data.rawModelProse}${screened}`;
  });
  $("metaBtn").addEventListener("click", () => requestBrief("brief"));
  $("adversarialBtn").addEventListener("click", () => requestBrief("adversarial"));
  $("askBtn").addEventListener("click", () => askQuestion($("askInput").value));
  $("askInput").addEventListener("keydown", ev => { if (ev.key === "Enter") askQuestion($("askInput").value); });
  for (const chip of document.querySelectorAll(".ask-chip")) chip.addEventListener("click", () => { $("askInput").value = chip.dataset.q; askQuestion(chip.dataset.q); });
  $("proveItBtn").addEventListener("click", runProveIt);
  $("ledgerVerifyBtn").addEventListener("click", async () => {
    const r = await refreshLedger(true);
    addEvent(r?.ok ? `Audit ledger re-verified from disk: ${r.length} entries, chain + HMAC + head anchor OK.` : `Audit ledger verification FAILED: ${r?.reason || "unavailable"}.`);
    renderEvents();
  });
  $("cancelApproval").addEventListener("click", () => { stopConsentTimer(); $("approveDialog").close(); });
  $("issueToken").addEventListener("click", issueConsentToken);
  $("confirmApproval").addEventListener("click", confirmConsent);
  $("samplePdfBtn")?.addEventListener("click", () => submitPdf({ sample: "conflict" }, "/api/pdf-intake/sample"));
  $("pdfUpload")?.addEventListener("change", async ev => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (file.size > 512_000) {
      $("pdfRoute").textContent = "PDF too large (max 512KB)";
      ev.target.value = "";
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    await submitPdf({ pdfBase64: btoa(binary) }, "/api/pdf-intake");
    ev.target.value = "";
  });
  ensureOperatorSession().catch(() => addEvent("Operator session could not be established."));
  applyMetaModeLabels();
  fetch("/api/health").then(r => r.json()).then(data => {
    state.metaMode = data.metaBriefMode === "live" ? "live" : "sample";
    state.metaModeLabel = data.metaModeLabel || SAMPLE_LABEL;
    state.build = { tag: data.build, round: data.buildRound, commit: data.buildCommit };
    applyMetaModeLabels();
    $("modelStatus").textContent = state.metaMode === "live"
      ? `Meta Muse Spark: live · tool-calling brief`
      : `Meta Muse Spark: ${SAMPLE_LABEL}`;
    // Pass 2: surface R18 consistently (server buildRound may still echo sealed lineage).
    const roundLabel = String(data.buildRound || "r18").toLowerCase() === "r17" ? "R18" : String(data.buildRound || "r18").toUpperCase();
    $("buildTag").textContent = `BUILD ${roundLabel}${data.buildCommit ? ` · ${String(data.buildCommit).slice(0, 7)}` : ""}`;
    state.ledger = data.ledgerIntegrity;
    renderLedger();
  }).catch(() => { $("modelStatus").textContent = "Meta gateway status unavailable"; });
  setInterval(() => {
    refreshLedger();
    if (state.approval?.expiresAt && Date.parse(state.approval.expiresAt) <= Date.now()) refreshKanbanFromServer().then(() => render());
  }, 30_000);
  refreshProgramBridge();
  installPageRouter();

  addEvent("Synthetic aerospace scenario loaded with forty work orders.");
  recalculate("Incoming material certificate analyzed; original master records retained.");
}

const PAGE_META = {
  overview: { title: "Plant view", crumb: "PLANT VIEW" },
  evidence: { title: "Material evidence", crumb: "MATERIAL EVIDENCE" },
  impact: { title: "Impact network", crumb: "IMPACT NETWORK" },
  recovery: { title: "Strategy gapper", crumb: "STRATEGY GAPPER" },
  pm: { title: "Project metrics", crumb: "PROJECT METRICS" },
  kanban: { title: "Kanban board", crumb: "KANBAN BOARD" },
  program: { title: "Program + Comms", crumb: "PROGRAM + COMMS" },
  arbitration: { title: "Conflict arbitration", crumb: "CONFLICT ARBITRATION" },
  decision: { title: "Proposed action", crumb: "PROPOSED ACTION" },
  mission: { title: "Mission chain", crumb: "MISSION CHAIN" },
  proveit: { title: "Prove it", crumb: "PROVE IT" }
};

const BEAT_PAGE = {
  disruption: "overview",
  analysis: "decision",
  options: "recovery",
  consent: "decision",
  ledger: "decision"
};

function parseHash() {
  const raw = (location.hash || "#overview").replace(/^#/, "");
  const [pagePart, beatPart] = raw.split("/");
  const page = PAGE_META[pagePart] ? pagePart : "overview";
  const beat = DEMO_BEATS.includes(beatPart) ? beatPart : null;
  return { page, beat };
}

function installPageRouter() {
  document.documentElement.classList.add("page-scroll-lock");
  const pages = [...document.querySelectorAll(".page[data-page]")];
  const navLinks = [...document.querySelectorAll(".page-index .index-link, .side-nav .side-link")];
  const workspace = document.querySelector(".workspace");
  const pageIndex = document.querySelector(".page-index");
  if (!pages.length) return;

  const showPage = rawId => {
    const id = PAGE_META[rawId] ? rawId : "overview";
    const meta = PAGE_META[id];
    for (const page of pages) {
      const on = page.dataset.page === id;
      page.classList.toggle("is-active", on);
      if (on) page.removeAttribute("hidden");
      else page.setAttribute("hidden", "");
    }
    for (const link of navLinks) {
      const href = (link.getAttribute("href") || "").replace(/^#/, "").split("/")[0];
      link.classList.toggle("active", href === id);
    }
    const crumb = $("crumbPage");
    if (crumb) crumb.textContent = meta.crumb;
    document.title = `${meta.title} | Factory Resilience | ForgeFront Systems`;
    if (workspace) workspace.scrollTop = 0;
    const activePage = pages.find(p => p.dataset.page === id);
    if (activePage) activePage.scrollTop = 0;
    if (id === "program") refreshProgramBridge().catch(() => {});
  };

  const applyBeat = beat => {
    if (!DEMO_BEATS.includes(beat)) return;
    state.demoBeat = beat;
    state.scrubLocked = true;
    const page = BEAT_PAGE[beat] || "overview";
    const next = `#${page}/${beat}`;
    if (location.hash !== next) {
      location.hash = `${page}/${beat}`;
    } else {
      showPage(page);
      renderOverviewViz();
    }
  };

  for (const pane of [pageIndex, workspace, ...pages].filter(Boolean)) {
    pane.addEventListener("wheel", e => {
      const el = pane;
      const top = el.scrollTop;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      const atTop = top <= 0 && e.deltaY < 0;
      const atBottom = top >= max - 1 && e.deltaY > 0;
      if (atTop || atBottom) e.preventDefault();
    }, { passive: false });
  }

  const fromHash = () => {
    const { page, beat } = parseHash();
    showPage(page);
    if (beat) {
      state.demoBeat = beat;
      state.scrubLocked = true;
    } else {
      state.scrubLocked = false;
    }
    renderOverviewViz();
  };

  window.addEventListener("hashchange", fromHash);
  for (const link of navLinks) {
    link.addEventListener("click", e => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();
      const id = href.slice(1).split("/")[0];
      state.scrubLocked = false;
      const beat = state.demoBeat && DEMO_BEATS.includes(state.demoBeat) ? state.demoBeat : resolveDemoBeat(state).active;
      const next = `#${id}/${beat}`;
      if (next !== location.hash) location.hash = `${id}/${beat}`;
      else fromHash();
    });
  }

  const scrubber = $("tcScrubber");
  if (scrubber) {
    scrubber.addEventListener("input", () => {
      const beat = DEMO_BEATS[Number(scrubber.value)] || "disruption";
      applyBeat(beat);
    });
  }
  for (const btn of document.querySelectorAll("#tcMarks [data-beat], .tc-marks [data-beat]")) {
    btn.addEventListener("click", () => {
      const beat = btn.getAttribute("data-beat");
      if (beat) applyBeat(beat);
    });
  }

  $("actionPlanSelect")?.addEventListener("change", () => {
    const id = $("actionPlanSelect").value;
    if (id && state.plans.some(p => p.id === id)) {
      state.selected = id;
      renderPlans();
      renderOverviewViz();
    }
  });

  fromHash();
}
install();
