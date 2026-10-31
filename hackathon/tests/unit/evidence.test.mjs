import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEvidenceRegistry } from "../../src/domain/evidence.mjs";
import { buildDemoScenarioInput, createSnapshot } from "../../src/domain/scenario.mjs";

describe("evidence registry", () => {
  it("serves entries for the current digest only", () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const registry = buildEvidenceRegistry(snapshot);
    assert.equal(registry.size, 3);
    const entry = registry.get("ev-cert-qty");
    assert.equal(entry.quantity.value, 120);
    assert.equal(entry.snapshotDigest, snapshot.snapshotDigest);
  });

  it("rejects cross-snapshot digest requests", () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const registry = buildEvidenceRegistry(snapshot);
    assert.throws(() => registry.get("ev-cert-qty", "other-digest"), /different snapshot/);
  });
});
