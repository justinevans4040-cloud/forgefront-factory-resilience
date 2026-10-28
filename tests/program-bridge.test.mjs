import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProgramBridge } from "../src/program-bridge.mjs";

test("program bridge records conflict → consent → kanban cascade", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ffr-bridge-"));
  const path = join(dir, "program-bridge-state.json");
  const bridge = createProgramBridge({ path });
  await bridge.load();

  await bridge.record({
    type: "CERTIFICATE_CONFLICT",
    actor: "J",
    detail: { impactedJobs: 7, impactedUnits: 178 }
  });
  let view = bridge.view();
  assert.equal(view.snapshot.status, "DISRUPTION");
  assert.equal(view.snapshot.impactedJobs, 7);
  assert.match(view.snapshot.stakeholderAlert || "", /cert/i);

  await bridge.record({
    type: "CONSENT_ACCEPTED",
    actor: "J",
    detail: { planId: "hybrid", planLabel: "Priority split" }
  });
  view = bridge.view();
  assert.equal(view.snapshot.status, "PROGRAM_ACTIVE");
  assert.equal(view.snapshot.consentAccepted, true);
  assert.equal(view.snapshot.kanbanUnlocked, true);
  assert.equal(view.snapshot.activePlanId, "hybrid");

  await bridge.record({
    type: "KANBAN_MOVE",
    actor: "J",
    detail: { cardId: "c1", column: "in_progress" }
  });
  view = bridge.view();
  assert.equal(view.snapshot.status, "EXECUTING");

  const persisted = JSON.parse(await readFile(path, "utf8"));
  assert.equal(persisted.schema, "forgefront.program-bridge/v1");
  assert.ok(persisted.events.length >= 3);
});

test("RESET returns bridge to watching", async () => {
  const bridge = createProgramBridge({});
  await bridge.record({ type: "CERTIFICATE_CONFLICT", detail: { impactedJobs: 2 } });
  await bridge.record({ type: "RESET", detail: {} });
  assert.equal(bridge.view().snapshot.status, "WATCHING");
  assert.equal(bridge.view().snapshot.consentAccepted, false);
});
