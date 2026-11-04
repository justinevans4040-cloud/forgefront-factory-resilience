import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createToolDispatcher, listToolDefinitions } from "../../src/agent/tools.mjs";
import { buildDemoScenarioInput, createSnapshot } from "../../src/domain/scenario.mjs";

describe("read-only agent tools", () => {
  it("exposes only the five allowlisted tool names", () => {
    const names = listToolDefinitions().map((t) => t.function.name);
    assert.deepEqual(names, [
      "get_incident",
      "read_evidence",
      "list_impacted_jobs",
      "compare_recovery_options",
      "get_capacity",
    ]);
  });

  it("returns incident and evidence bound to the snapshot digest", async () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const tools = createToolDispatcher(snapshot);
    const incident = await tools.invoke("get_incident");
    assert.equal(incident.snapshotDigest, snapshot.snapshotDigest);
    assert.equal(incident.incident.incidentId, "inc-cert-alloy-hold");

    const evidence = await tools.invoke("read_evidence", { evidenceId: "ev-recv-qty" });
    assert.equal(evidence.quantity.value, 3);
    assert.equal(evidence.snapshotDigest, snapshot.snapshotDigest);
  });

  it("rejects unknown tools and write-style names", async () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const tools = createToolDispatcher(snapshot);
    await assert.rejects(() => tools.invoke("shell"), /unknown tool/);
    await assert.rejects(() => tools.invoke("approve_plan"), /unknown tool/);
  });

  it("rejects bad schemas and unknown evidence ids", async () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const tools = createToolDispatcher(snapshot);
    await assert.rejects(
      () => tools.invoke("read_evidence", {}),
      /missing required argument/,
    );
    await assert.rejects(
      () => tools.invoke("read_evidence", { evidenceId: "nope", extra: true }),
      /unexpected argument/,
    );
    await assert.rejects(
      () => tools.invoke("read_evidence", { evidenceId: "missing-id" }),
      /unknown evidence id/,
    );
  });

  it("compare_recovery_options returns computed feasible options", async () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const tools = createToolDispatcher(snapshot);
    const result = await tools.invoke("compare_recovery_options");
    assert.ok(result.feasibleCount >= 1);
    assert.equal(result.options.length, 3);
  });
});
