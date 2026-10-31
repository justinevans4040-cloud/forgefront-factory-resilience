import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendError } from '../../server.mjs';
import { ERROR_CODES } from '../../src/contracts.mjs';

function capture() {
  let status = null;
  let body = null;
  return {
    res: {
      writeHead(code) { status = code; },
      end(payload) { body = JSON.parse(payload); },
    },
    result: () => ({ status, body }),
  };
}

test('known tool and request codes keep public messages and mapped statuses', () => {
  const known = capture();
  sendError(known.res, Object.assign(new Error('unknown tool: approve_plan'), { code: ERROR_CODES.UNKNOWN_TOOL }));
  assert.equal(known.result().status, 400);
  assert.equal(known.result().body.error.message, 'unknown tool: approve_plan');

  const forbidden = capture();
  sendError(forbidden.res, Object.assign(new Error('Host not allowed'), { code: ERROR_CODES.FORBIDDEN, status: 403 }));
  assert.equal(forbidden.result().status, 403);
});

test('unexpected errors strip internal paths and stack details', () => {
  const unexpected = capture();
  sendError(unexpected.res, new Error('C:\\secret\\path\\internal-stack-detail'));
  assert.equal(unexpected.result().status, 500);
  assert.deepEqual(unexpected.result().body, { error: { code: 'INTERNAL', message: 'request failed' } });
  assert.equal(JSON.stringify(unexpected.result().body).includes('secret'), false);
});
