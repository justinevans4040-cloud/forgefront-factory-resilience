/**
 * Mission chain: typed event envelopes linking intent → plan → approval → effect → outcome.
 *
 * Every ledger entry carries an envelope {schema, event_id, trace_id, kind, parent_event_id,
 * idempotency_key}. The envelope is inside the hashed ledger body, so editing a link breaks
 * the hash chain. One mission (trace_id) is opened per operator session and scenario; a
 * scenario change, revoke or expiry closes it with an outcome event and the next action
 * opens a new mission.
 */
import { randomBytes } from "node:crypto";

export const EVENT_SCHEMA = "forgefront.event.v1";
export const MISSION_STAGES = ["intent", "plan", "approval", "effect", "outcome"];

const ACTION_KIND = {
  MISSION_INTENT: "intent",
  CONSENT_REVIEW_MINTED: "plan",
  CONSENT_ACCEPTED: "approval",
  KANBAN_CREATED: "effect",
  KANBAN_MOVE: "effect",
  MISSION_OUTCOME: "outcome",
  SERVER_START: "system",
  SERVER_RESTART: "system"
};
export const kindForAction = action => ACTION_KIND[action] || "audit";

const hex = n => randomBytes(n).toString("hex");
export const newEventId = () => `evt_${hex(10)}`;
export const newTraceId = () => `msn_${hex(8)}`;

export function makeEvent({ kind, traceId, parentEventId = null, idempotencyKey = null }) {
  return { schema: EVENT_SCHEMA, event_id: newEventId(), trace_id: traceId || "system", kind, parent_event_id: parentEventId, idempotency_key: idempotencyKey };
}

/** Per-session mission state (in memory; the durable record is the ledger). */
export class MissionTracker {
  constructor() { this.bySession = new Map(); this.history = new Map(); }

  current(sessionKey) {
    const m = this.bySession.get(sessionKey);
    return m && !m.closed ? m : null;
  }

  /** Open a mission for this scenario if none is open (or the open one is for another scenario). */
  ensure(sessionKey, scenarioHash) {
    const open = this.current(sessionKey);
    if (open && open.scenarioHash === scenarioHash) return { mission: open, opened: false, superseded: null };
    const superseded = open || null;
    if (superseded) superseded.closed = true;
    const mission = { traceId: newTraceId(), scenarioHash, stage: -1, lastEventId: null, closed: false, startedAt: new Date().toISOString() };
    this.bySession.set(sessionKey, mission);
    const list = this.history.get(sessionKey) || [];
    list.push(mission.traceId);
    if (list.length > 20) list.shift();
    this.history.set(sessionKey, list);
    return { mission, opened: true, superseded };
  }

  /** Build the envelope for the next event and advance the stage. Rejects out-of-order stages. */
  next(mission, kind, idempotencyKey = null) {
    const idx = MISSION_STAGES.indexOf(kind);
    if (idx === -1) return makeEvent({ kind, traceId: mission?.traceId, parentEventId: mission?.lastEventId || null });
    if (!mission) throw new Error("MISSION_REQUIRED");
    if (mission.closed) throw new Error("MISSION_CLOSED");
    if (idx > 0 && mission.stage < idx - 1 && !(kind === "outcome")) throw new Error(`MISSION_STAGE_SKIPPED:${kind}`);
    const event = makeEvent({ kind, traceId: mission.traceId, parentEventId: mission.lastEventId, idempotencyKey });
    mission.stage = Math.max(mission.stage, idx);
    mission.lastEventId = event.event_id;
    if (kind === "outcome") mission.closed = true;
    return event;
  }

  traces(sessionKey) { return this.history.get(sessionKey) || []; }
}

/**
 * Verify one mission's chain from ledger rows: stages in order, every parent link points at
 * an earlier event of the same trace, event ids unique, idempotency keys unique per effect.
 */
export function verifyMissionChain(rows, traceId) {
  const events = rows.filter(r => r.event?.trace_id === traceId);
  const problems = [];
  const seen = new Map();
  const keys = new Set();
  let maxStage = -1;
  for (const row of events) {
    const e = row.event;
    if (e.schema !== EVENT_SCHEMA) problems.push(`${e.event_id}:SCHEMA`);
    if (seen.has(e.event_id)) problems.push(`${e.event_id}:DUPLICATE_EVENT_ID`);
    if (e.parent_event_id && !seen.has(e.parent_event_id)) problems.push(`${e.event_id}:PARENT_MISSING`);
    const idx = MISSION_STAGES.indexOf(e.kind);
    if (idx >= 0) {
      if (idx > maxStage + 1 && e.kind !== "outcome") problems.push(`${e.event_id}:STAGE_SKIPPED:${e.kind}`);
      maxStage = Math.max(maxStage, idx);
    }
    if (e.idempotency_key && (e.kind === "approval" || e.kind === "effect")) {
      const k = `${e.kind}|${e.idempotency_key}`;
      if (keys.has(k)) problems.push(`${e.event_id}:IDEMPOTENCY_KEY_REUSED`);
      keys.add(k);
    }
    seen.set(e.event_id, row);
  }
  const stages = Object.fromEntries(MISSION_STAGES.map(stage => {
    const list = events.filter(r => r.event.kind === stage);
    return [stage, list.map(r => ({ event_id: r.event.event_id, parent_event_id: r.event.parent_event_id, idempotency_key: r.event.idempotency_key, action: r.action, detail: r.detail, at: r.at, actor: r.actor, entry_hash: r.entry_hash }))];
  }));
  const complete = MISSION_STAGES.every(s => stages[s].length > 0);
  return { traceId, ok: problems.length === 0, complete, problems, stages, eventCount: events.length };
}
