/**
 * Program bridge — Factory Resilience decisions → Command Center V3 Program tab.
 * Synthetic demo state only. Does not touch Ichabod LIVE solar-command or access tokens.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const MAX_EVENTS = 200;

export function createProgramBridge({ path } = {}) {
  const storePath = path || null;
  /** @type {{ events: object[], snapshot: object, updatedAt: string|null }} */
  let state = {
    schema: "forgefront.program-bridge/v1",
    product: "Command Center V3 · Project + Communications OS",
    events: [],
    snapshot: emptySnapshot(),
    updatedAt: null
  };

  function emptySnapshot() {
    return {
      projectName: "Factory Resilience · Aerospace shop recovery",
      status: "WATCHING",
      impactedJobs: 0,
      impactedUnits: 0,
      activePlanId: null,
      activePlanLabel: null,
      consentAccepted: false,
      kanbanUnlocked: false,
      stakeholderAlert: null,
      calendarNote: null,
      supplierNote: null,
      upstreamDownstream: null,
      lastEventType: null
    };
  }

  function applyEvent(evt) {
    const snap = { ...state.snapshot };
    const type = String(evt.type || "");
    const detail = evt.detail && typeof evt.detail === "object" ? evt.detail : {};
    snap.lastEventType = type;
    if (type === "INCIDENT_DETECTED" || type === "CERTIFICATE_CONFLICT") {
      snap.status = "DISRUPTION";
      snap.consentAccepted = false;
      snap.kanbanUnlocked = false;
      snap.activePlanId = null;
      snap.activePlanLabel = null;
      snap.impactedJobs = Number(detail.impactedJobs ?? snap.impactedJobs) || 0;
      snap.impactedUnits = Number(detail.impactedUnits ?? snap.impactedUnits) || 0;
      snap.stakeholderAlert = detail.stakeholderAlert || "Ops + quality + cell leads: material cert conflict under review.";
      snap.supplierNote = detail.supplierNote || "Hold inbound lot; request corrected heat/cert documentation.";
      snap.upstreamDownstream = detail.upstreamDownstream || "Upstream: mill/cert house. Downstream: Haas cells + shipping commitments.";
      snap.calendarNote = detail.calendarNote || "Block recovery window on shared ops calendar until consent.";
    } else if (type === "SECOND_SHOCK") {
      snap.status = "REOPENED";
      snap.consentAccepted = false;
      snap.kanbanUnlocked = false;
      snap.activePlanId = null;
      snap.activePlanLabel = null;
      snap.stakeholderAlert = "Second shock: prior acceptance superseded; re-review required.";
      snap.calendarNote = "Slip recovery milestones; notify stakeholders of reopen.";
    } else if (type === "CONSENT_ACCEPTED") {
      snap.status = "PROGRAM_ACTIVE";
      snap.consentAccepted = true;
      snap.kanbanUnlocked = true;
      snap.activePlanId = detail.planId || snap.activePlanId;
      snap.activePlanLabel = detail.planLabel || snap.activePlanLabel;
      snap.stakeholderAlert = detail.stakeholderAlert || `Scenario accepted (${snap.activePlanLabel || snap.activePlanId || "plan"}). Execution board unlocked — no auto material release.`;
      snap.calendarNote = detail.calendarNote || "Publish recovery milestones / due hours from CPM horizon.";
      snap.supplierNote = detail.supplierNote || "Launch supplier follow-ups tied to accepted plan assumptions.";
      snap.upstreamDownstream = detail.upstreamDownstream || "Coordinate upstream cert correction and downstream cell schedule moves.";
    } else if (type === "KANBAN_MOVE") {
      snap.status = "EXECUTING";
      snap.stakeholderAlert = detail.stakeholderAlert || `Recovery card moved to ${detail.column || "updated column"}.`;
      snap.calendarNote = detail.calendarNote || "Refresh action owners and due dates from board move.";
    } else if (type === "RESET") {
      Object.assign(snap, emptySnapshot());
    } else if (type === "CERTIFICATE_CLEARED") {
      snap.status = "WATCHING";
      snap.consentAccepted = false;
      snap.kanbanUnlocked = false;
      snap.stakeholderAlert = "Certificate cleared; mission closed. Program returns to watch mode.";
    }
    state.snapshot = snap;
    state.updatedAt = new Date().toISOString();
  }

  async function load() {
    if (!storePath) return state;
    try {
      const raw = await readFile(storePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schema === "forgefront.program-bridge/v1") state = parsed;
    } catch {
      /* first run */
    }
    return state;
  }

  async function persist() {
    if (!storePath) return;
    await mkdir(dirname(storePath), { recursive: true });
    await writeFile(storePath, JSON.stringify(state, null, 2), "utf8");
  }

  async function record(event) {
    const evt = {
      id: `pbe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      type: String(event.type || "UNKNOWN"),
      actor: String(event.actor || "system").slice(0, 64),
      detail: event.detail && typeof event.detail === "object" ? event.detail : {},
      traceId: event.traceId || null
    };
    applyEvent(evt);
    state.events = [...state.events, evt].slice(-MAX_EVENTS);
    await persist();
    return { event: evt, snapshot: state.snapshot, updatedAt: state.updatedAt };
  }

  function view() {
    return {
      schema: state.schema,
      product: state.product,
      updatedAt: state.updatedAt,
      snapshot: state.snapshot,
      events: state.events.slice(-50),
      ui: {
        programPath: "/vendor/command-center-v3/ForgeFront_PM.html",
        communicationsNote: "Communications adapters stay customer-configured; this bridge drives PM status + alert text from Resilience decisions."
      }
    };
  }

  return { load, record, view, storePath: () => storePath };
}

export function defaultBridgePath(baseDir) {
  return join(baseDir, "data", "program-bridge-state.json");
}
