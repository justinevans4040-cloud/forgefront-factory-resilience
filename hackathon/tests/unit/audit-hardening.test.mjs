import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkflow } from '../../src/workflow.mjs';
import { createStateCodec } from '../../src/security/state-codec.mjs';
import { verifyCheckpoint } from '../../src/packet.mjs';
import { redactSecrets } from '../../src/security/redact.mjs';
import { migrateLegacyState } from '../../src/security/migrate-state.mjs';
import { createHash, createHmac } from 'node:crypto';
import { createApp } from '../../server.mjs';
import { loadOperators } from '../../src/security/operators.mjs';

test('redaction removes JSON-escaped quotes and backslashes from secrets', () => {
  const secret = 'abc"def\\ghijkl';
  const cleaned = redactSecrets({ note: 'leak ' + secret }, [secret]);
  assert.equal(cleaned.note, 'leak [REDACTED]');
  assert.ok(!JSON.stringify(cleaned).includes('abc'));
});

test('weak ledger keys and admin tokens are rejected', () => {
  assert.throws(() => createStateCodec('short'), /STATE_KEY_REQUIRED/);
  assert.throws(() => createWorkflow({ directory: mkdtempSync(join(tmpdir(), 'ffr-weak-')), key: 'short' }), /Workflow requires/);
  assert.throws(() => loadOperators({ HACKATHON_ADMIN_TOKEN: 'x' }), /OPERATOR_CONFIGURATION_INVALID/);
});

test('workflow does not leave a swappable prior-anchor bak that restores after truncate', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ffr-rollback-'));
  const key = 'synthetic-key';
  const w = createWorkflow({ directory, key });
  w.shock('CELL-MILL-2');
  w.reset();
  assert.equal(existsSync(join(directory, 'anchor.json.bak')), false);
  const eventsPath = join(directory, 'events.jsonl');
  const lines = readFileSync(eventsPath, 'utf8').trim().split('\n');
  writeFileSync(eventsPath, lines.slice(0, -1).join('\n') + '\n');
  // Without bak, a truncated log against the current anchor fails closed.
  assert.throws(() => createWorkflow({ directory, key }), /LEDGER_TAMPERED/);
});

test('checkpoint verifier reports prefix retention honestly and rejects forged prefix events', () => {
  const w = createWorkflow({ directory: mkdtempSync(join(tmpdir(), 'ffr-checkpoint-')), key: 'synthetic-key' });
  w.shock('CELL-MILL-2');
  const checkpoint = w.exportCheckpoint();
  w.reset();
  const later = w.exportPacket();
  const ok = verifyCheckpoint(later, checkpoint);
  assert.equal(ok.ok, true);
  assert.equal(ok.trust, 'PREFIX_INCLUDES_RETAINED_CHECKPOINT_HEAD');
  const forged = structuredClone(later);
  const body = { ...forged.events[0] };
  delete body.eventHash;
  body.data = { ...body.data, operatorId: 'forged-op' };
  forged.events[0] = { ...body, eventHash: createHash('sha256').update(JSON.stringify(body)).digest('hex') };
  assert.equal(verifyCheckpoint(forged, checkpoint).ok, false);
});

test('unknown meta routes and prototype workflow paths return 404 without provider calls', async () => {
  let calls = 0;
  const app = createApp({
    models: {
      env: {
        HACKATHON_ADMIN_TOKEN: 'synthetic-admin',
        HACKATHON_LEDGER_KEY: 'synthetic-ledger',
        HACKATHON_STATE_DIR: mkdtempSync(join(tmpdir(), 'ffr-meta-route-')),
        MUSE_API_KEY: 'synthetic-wonder-key',
      },
      fetchImpl: async () => {
        calls += 1;
        return { ok: true, text: async () => JSON.stringify({ model: 'muse-wonder-1.0', output_text: 'x' }) };
      },
    },
  });
  const addr = await app.listen(0);
  const base = `http://127.0.0.1:${addr.port}`;
  try {
    const session = await fetch(base + '/api/meta/session', { method: 'POST', headers: { Authorization: 'Bearer synthetic-admin' } }).then((r) => r.json());
    const headers = { 'Content-Type': 'application/json', 'X-Session-Token': session.session, 'X-CSRF-Token': session.csrf };
    assert.equal((await fetch(base + '/api/meta/anything', { method: 'POST', headers, body: JSON.stringify({ provider: 'wonder', prompt: 'x' }) })).status, 404);
    assert.equal(calls, 0);
    assert.equal((await fetch(base + '/api/workflow/__proto__', { method: 'POST', headers, body: '{}' })).status, 404);
    assert.equal((await fetch(base + '/api/workflow/constructor', { method: 'POST', headers, body: '{}' })).status, 404);
  } finally {
    await app.close();
  }
});

test('migration refuses nested destinations and measures an unchanged source digest', () => {
  const root = mkdtempSync(join(tmpdir(), 'ffr-mig-'));
  const source = join(root, 'source');
  const nested = join(source, 'nested-dest');
  const destination = join(root, 'destination');
  const key = 'synthetic-key';
  mkdirSync(source);
  const body = { sequence: 1, type: 'decision_revoked', epochMs: 1, previousHash: 'GENESIS', data: { status: 'revoked', operationalRelease: false } };
  const event = { ...body, eventHash: createHash('sha256').update(JSON.stringify(body)).digest('hex') };
  const log = JSON.stringify(event) + '\n';
  writeFileSync(join(source, 'events.jsonl'), log);
  writeFileSync(join(source, 'anchor.json'), JSON.stringify({ count: 1, head: event.eventHash, signature: createHmac('sha256', key).update(event.eventHash).digest('hex') }));
  assert.throws(() => migrateLegacyState({ source, destination: nested, key }), /MIGRATION_REQUIRES_NEW_DESTINATION/);
  const result = migrateLegacyState({ source, destination, key });
  assert.equal(result.sourceUnchanged, true);
  assert.match(result.sourceDigest, /^[a-f0-9]{64}$/);
  assert.ok(!readFileSync(join(destination, 'events.jsonl'), 'utf8').includes('decision_revoked'));
});

test('escaped secrets are redacted from persisted model_call notes', () => {
  const secret = 'tok"en\\value12';
  const w = createWorkflow({ directory: mkdtempSync(join(tmpdir(), 'ffr-redact-')), key: 'synthetic-key', secrets: [secret] });
  w.recordModelCall({ type: 'model_call', note: 'leak ' + secret, operationalRelease: false });
  const packet = w.exportPacket();
  assert.ok(!JSON.stringify(packet).includes('tok'));
  assert.match(JSON.stringify(packet.events.at(-1).data), /REDACTED/);
});
