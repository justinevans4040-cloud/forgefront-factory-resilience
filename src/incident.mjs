export const INCIDENT_STATES = [
  "DETECTED",
  "TRIAGED",
  "AFFECTED_MAPPED",
  "OPTIONS_PRODUCED",
  "REVIEWED",
  "ACCEPTED_SCENARIO",
  "BLOCKED",
  "REOPENED",
  "CLOSED"
];

const TRANSITIONS = {
  DETECTED: ["TRIAGED", "BLOCKED", "CLOSED"],
  TRIAGED: ["AFFECTED_MAPPED", "BLOCKED", "CLOSED"],
  AFFECTED_MAPPED: ["OPTIONS_PRODUCED", "BLOCKED", "CLOSED"],
  OPTIONS_PRODUCED: ["REVIEWED", "BLOCKED", "REOPENED", "CLOSED"],
  REVIEWED: ["ACCEPTED_SCENARIO", "BLOCKED", "CLOSED"],
  ACCEPTED_SCENARIO: ["REOPENED", "CLOSED"],
  REOPENED: ["TRIAGED", "AFFECTED_MAPPED", "OPTIONS_PRODUCED", "REVIEWED", "CLOSED"],
  BLOCKED: ["TRIAGED", "DETECTED", "CLOSED"],
  CLOSED: ["DETECTED"]
};

export function createIncidentRecord(factory) {
  return {
    incidentId: `INC-${factory.scenarioId}`,
    state: "DETECTED",
    revision: 0,
    evidenceRevision: 0,
    events: []
  };
}

export function appendIncidentEvent(record, { actor, action, detail, evidenceRevision = null }) {
  const event = {
    at: new Date().toISOString(),
    actor: actor || "system",
    action,
    detail: detail || "",
    stateAfter: record.state,
    evidenceRevision: evidenceRevision ?? record.evidenceRevision
  };
  record.events.unshift(event);
  if (record.events.length > 200) record.events.pop();
  return event;
}

export function transitionIncident(record, nextState, meta = {}) {
  const allowed = TRANSITIONS[record.state] || [];
  if (!allowed.includes(nextState) && record.state !== nextState) {
    throw new Error(`Invalid transition ${record.state} → ${nextState}`);
  }
  record.state = nextState;
  record.revision += 1;
  if (meta.evidenceRevision != null) record.evidenceRevision = meta.evidenceRevision;
  appendIncidentEvent(record, {
    actor: meta.actor || "system",
    action: `STATE_${nextState}`,
    detail: meta.detail || "",
    evidenceRevision: record.evidenceRevision
  });
  return record;
}

export function syncIncidentFromEngine(record, { certificate, impact, plans, approval, staleApproval }) {
  let evidenceRevision = record.evidenceRevision;
  if (certificate?.status && certificate.status !== "FIELDS MATCHED") {
    if (record.state === "DETECTED") transitionIncident(record, "TRIAGED", { detail: "Certificate discrepancy detected." });
    if (record.state === "TRIAGED" && impact?.jobIds?.length) {
      transitionIncident(record, "AFFECTED_MAPPED", { detail: `${impact.jobIds.length} jobs traced to disputed lot.` });
    }
    if (record.state === "AFFECTED_MAPPED" && plans?.length) {
      transitionIncident(record, "OPTIONS_PRODUCED", { detail: `${plans.length} recovery options calculated.` });
    }
  } else if (certificate?.status === "FIELDS MATCHED" && record.state !== "CLOSED") {
    transitionIncident(record, "CLOSED", { detail: "No active document conflict." });
  }

  // Stay REOPENED (visible to the operator) until a new plan is accepted or the conflict clears.
  if (staleApproval && record.state === "ACCEPTED_SCENARIO") {
    transitionIncident(record, "REOPENED", { actor: "system", detail: "Prior scenario acceptance invalidated by evidence or constraint change; recovery options require re-review." });
  }

  if (approval && ["OPTIONS_PRODUCED", "REOPENED"].includes(record.state)) {
    transitionIncident(record, "REVIEWED", { actor: approval.operator, detail: "Operator reviewed recovery options." });
    transitionIncident(record, "ACCEPTED_SCENARIO", { actor: approval.operator, detail: `Scenario plan ${approval.planId} accepted — not material release.` });
  }

  return record;
}
