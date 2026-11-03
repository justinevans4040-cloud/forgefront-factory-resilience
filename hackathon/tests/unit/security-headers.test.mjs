import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server.mjs';
import { applySecurityHeaders } from '../../src/security/response-headers.mjs';

test('applySecurityHeaders sets baseline protections and HSTS only when secure', () => {
  const plain = { headers: {} };
  plain.setHeader = (name, value) => {
    plain.headers[name.toLowerCase()] = value;
  };
  applySecurityHeaders(plain, { secure: false });
  assert.match(plain.headers['content-security-policy'], /script-src 'self'/);
  assert.equal(plain.headers['x-frame-options'], 'DENY');
  assert.equal(plain.headers['permissions-policy'], 'camera=(), microphone=(), geolocation=(), payment=()');
  assert.equal(plain.headers['strict-transport-security'], undefined);

  const secure = { headers: {} };
  secure.setHeader = (name, value) => {
    secure.headers[name.toLowerCase()] = value;
  };
  applySecurityHeaders(secure, { secure: true });
  assert.match(secure.headers['strict-transport-security'], /max-age=31536000/);
});

test('authenticated API responses include security headers', async () => {
  const app = createApp({ models: { env: { HACKATHON_ADMIN_TOKEN: 'test-admin-ok' } } });
  const a = await app.listen(0);
  const base = `http://127.0.0.1:${a.port}`;
  try {
    const login = await fetch(`${base}/api/meta/session`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-admin-ok' },
    });
    assert.equal(login.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(login.headers.get('x-frame-options'), 'DENY');
    assert.match(login.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
  } finally {
    await app.close();
  }
});
