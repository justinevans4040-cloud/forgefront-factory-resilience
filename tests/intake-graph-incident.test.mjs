import test from "node:test";
import assert from "node:assert/strict";
import { createScenario, INCORRECT_CERT } from "../src/scenario.mjs";
import { buildPacketFromScenario, hashDocumentText } from "../src/intake.mjs";
import { buildConsequenceGraph } from "../src/graph.mjs";
import { createIncidentRecord, syncIncidentFromEngine, transitionIncident } from "../src/incident.mjs";
import { validateCertificate, traceImpact, buildRecoveryPlans } from "../src/engine.mjs";

test("document hash is stable", () => {
  const a = hashDocumentText(INCORRECT_CERT);
  const b = hashDocumentText(INCORRECT_CERT);
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test("baseline packet surfaces master heat conflict", () => {
  const factory = createScenario();
  const { reconciliation } = buildPacketFromScenario(factory);
  assert.equal(reconciliation.status, "REVIEW REQUIRED");
  assert.ok(reconciliation.contradictions.some(c => c.field === "heat"));
});

test("consequence graph traces seven proven jobs only", () => {
  const factory = createScenario();
  const cert = validateCertificate(factory, INCORRECT_CERT);
  const impact = traceImpact(factory, cert);
  const graph = buildConsequenceGraph(factory, impact);
  assert.equal(graph.provenImpact.jobIds.length, 7);
  assert.ok(graph.edges.every(e => e.source));
});

test("incident advances through triage to options without release language", () => {
  const factory = createScenario();
  const record = createIncidentRecord(factory);
  const cert = validateCertificate(factory, INCORRECT_CERT);
  const impact = traceImpact(factory, cert);
  const plans = buildRecoveryPlans(factory, impact);
  syncIncidentFromEngine(record, { certificate: cert, impact, plans });
  assert.equal(record.state, "OPTIONS_PRODUCED");
  syncIncidentFromEngine(record, {
    certificate: cert,
    impact,
    plans,
    approval: { planId: plans[0].id, operator: "OP1" }
  });
  assert.equal(record.state, "ACCEPTED_SCENARIO");
  assert.ok(record.events.every(e => !/release/i.test(e.detail) || /not material release/i.test(e.detail) || /invalidated/i.test(e.detail)));
});

test("stale approval reopens incident", () => {
  const factory = createScenario();
  const record = createIncidentRecord(factory);
  const cert = validateCertificate(factory, INCORRECT_CERT);
  const impact = traceImpact(factory, cert);
  const plans = buildRecoveryPlans(factory, impact);
  syncIncidentFromEngine(record, { certificate: cert, impact, plans, approval: { planId: plans[0].id, operator: "OP1" } });
  syncIncidentFromEngine(record, { certificate: cert, impact, plans, staleApproval: true });
  assert.equal(record.state, "REOPENED", "badge must show REOPENED, not stay ACCEPTED_SCENARIO");
  syncIncidentFromEngine(record, { certificate: cert, impact, plans });
  assert.equal(record.state, "REOPENED", "stays REOPENED until a new plan is accepted");
  syncIncidentFromEngine(record, { certificate: cert, impact, plans, approval: { planId: plans[1].id, operator: "OP1" } });
  assert.equal(record.state, "ACCEPTED_SCENARIO");
});

test("cleared certificate closes incident", () => {
  const factory = createScenario();
  const record = createIncidentRecord(factory);
  transitionIncident(record, "TRIAGED");
  const cert = { status: "FIELDS MATCHED" };
  syncIncidentFromEngine(record, { certificate: cert, impact: { blocked: false, jobIds: [] }, plans: [] });
  assert.equal(record.state, "CLOSED");
});
