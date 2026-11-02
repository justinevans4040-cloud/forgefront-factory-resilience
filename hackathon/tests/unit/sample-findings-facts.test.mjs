import { test } from 'node:test';
import assert from 'node:assert/strict';
import { investigate } from '../../src/agent/investigation.mjs';
import { createSnapshot, buildDemoScenarioInput } from '../../src/domain/scenario.mjs';
import { createSampleClient } from '../../src/models/sample.mjs';

const snapshot = createSnapshot(buildDemoScenarioInput());

test('offline Sample investigation surfaces exact registry verified facts', async () => {
  const result = await investigate({ snapshot, client: createSampleClient() });
  assert.equal(result.proposalValid, true);
  assert.ok(result.claims.accepted.length >= 2, 'expected certificate and receiving quantities');
  assert.equal(result.claims.rejected.length, 0);
  for (const claim of result.claims.accepted) {
    assert.equal(claim.reason, 'EXACT_SOURCE_MATCH');
    assert.ok(Number.isFinite(claim.value));
  }
});
