import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.mjs';
const admin = process.env.HACKATHON_ADMIN_TOKEN || randomBytes(32).toString('hex');
const app = createApp({ models: { env: { ...process.env, HACKATHON_ADMIN_TOKEN: admin,HACKATHON_LEDGER_KEY:randomBytes(32).toString('hex'),HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-diagnostic-smoke-')) } } });
const address = await app.listen();
const base = `http://127.0.0.1:${address.port}`;
const login = await fetch(`${base}/api/meta/session`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` } });
const { session, csrf } = await login.json();
const results = [];
for (const provider of ['wonder', 'baseten', 'fireworks']) {
  const response = await fetch(`${base}/api/meta/respond`, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-Session-Token': session, 'X-CSRF-Token': csrf,
  }, body: JSON.stringify({ provider, prompt: 'Say hello in one brief sentence.' }) });
  const body = await response.json();
  results.push({ provider, httpStatus: response.status, liveOutputConfirmed: response.ok && body.mode === 'live' && Boolean(body.text),
    mode: body.mode ?? null, requestedModel: body.requestedModel ?? null,
    error: body.error?.message ?? null });
}
const evidence = { server: base, health: (await fetch(`${base}/health`)).status, results };
await writeFile(new URL('../evidence/api-smoke/server.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
console.log('Server remains running; ephemeral admin session credentials are not logged.');
