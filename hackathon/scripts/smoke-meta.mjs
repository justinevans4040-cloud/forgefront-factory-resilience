import {redactEvidence,writeEvidence} from './public-evidence.mjs';
import { mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createWonderClient } from '../src/models/wonder.mjs';
import { createSparkOpenClient } from '../src/models/spark-open.mjs';
import { resolveWonderApiKey, WONDER_ROUTE, SPARK_BASETEN_ROUTE, SPARK_FIREWORKS_ROUTE } from '../src/models/routes.mjs';

export function redact(value, env = process.env) {
  let text = String(value);
  for (const name of ['MUSE_API_KEY', 'MODEL_API_KEY', 'BASETEN_API_KEY', 'FIREWORKS_API_KEY']) {
    if (env[name]) text = text.split(env[name]).join('[REDACTED]');
  }
  return redactEvidence(text,env).replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]');
}

export async function runSmoke({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 60000 } = {}) {
  const nonce = `SMOKE_OK_${randomBytes(8).toString('hex')}`;
  const results = [];
  for (const [provider, route, authEnv] of [
    ['wonder', WONDER_ROUTE, 'MUSE_API_KEY'],
    ['spark-baseten', SPARK_BASETEN_ROUTE, 'BASETEN_API_KEY'],
    ['spark-fireworks', SPARK_FIREWORKS_ROUTE, 'FIREWORKS_API_KEY'],
  ]) {
    const key = provider === 'wonder' ? resolveWonderApiKey(env) : env[authEnv];
    const record = { provider, endpoint: route.endpoint, requestedModel: route.model, authEnv,
      keyPresent: Boolean(key?.trim()), passed: false, status: 'BLOCKED' };
    const started = performance.now();
    if (!record.keyPresent) record.error = `${authEnv} is unavailable to this process`;
    else {
      try {
        const client = provider === 'wonder'
          ? createWonderClient({ apiKey: key, fetchImpl })
          : createSparkOpenClient({ apiKey: key, route, fetchImpl });
        const response = await client.complete({ prompt: `Reply with exactly ${nonce} and nothing else.`, maxTokens: 1024, timeoutMs });
        record.returnedModel = response.modelId;
        record.requestId = response.requestId;
        record.text = response.text;
        record.passed = !response.sample && response.text.trim() === nonce && response.modelId === route.model;
        record.status = record.passed ? 'PASS' : 'FAIL';
        if (!record.passed) record.error = 'Response text or returned model did not match the requested contract';
      } catch (error) {
        record.status = 'FAIL';
        record.httpStatus = error.status ?? null;
        record.error = String(error.message);
      }
    }
    record.elapsedMs = Math.round(performance.now() - started);
    results.push(JSON.parse(redact(JSON.stringify(record), env)));
  }
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  const directory = new URL('../evidence/api-smoke/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const results = await runSmoke();
  for (const result of results) writeEvidence(new URL(`${result.provider}.json`, directory), JSON.stringify(result, null, 2) + '\n');
  writeEvidence(new URL('summary.json', directory), JSON.stringify({ passed: results.every(r => r.passed), results }, null, 2) + '\n');
  console.log(JSON.stringify(results.map(({ provider, status, error }) => ({ provider, status, error })), null, 2));
  process.exitCode = results.every(r => r.passed) ? 0 : 1;
}
