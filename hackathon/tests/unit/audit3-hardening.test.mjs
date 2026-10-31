import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkflow } from '../../src/workflow.mjs';
import { readablePacket } from '../../src/packet.mjs';

test('login_failed does not bootstrap snapshot_initialized; later work still seals a snapshot', () => {
  const options = { directory: mkdtempSync(join(tmpdir(), 'ffr-audit3-login-')), key: 'synthetic-ledger' };
  const w = createWorkflow(options);
  w.recordLoginFailure('127.0.0.1');
  const afterFailure = w.exportPacket();
  assert.equal(afterFailure.events.length, 1);
  assert.equal(afterFailure.events[0].type, 'login_failed');
  assert.equal(afterFailure.events[0].data.reason, 'INVALID_CREDENTIAL');
  assert.ok(!afterFailure.events.some((e) => e.type === 'snapshot_initialized'));
  w.shock('CELL-MILL-2');
  const types = w.exportPacket().events.map((e) => e.type);
  assert.ok(types.includes('snapshot_initialized'));
  assert.ok(types.includes('login_failed'));
  assert.ok(types.includes('snapshot_changed'));
});

test('readable report labels plaintext export in the opening banner', () => {
  const w = createWorkflow({ directory: mkdtempSync(join(tmpdir(), 'ffr-audit3-report-')), key: 'synthetic-ledger' });
  w.recordLoginFailure('client');
  const text = readablePacket(w.exportPacket());
  assert.match(text, /^# ForgeFront recovery evidence\nPLAINTEXT EXPORT;/);
});
