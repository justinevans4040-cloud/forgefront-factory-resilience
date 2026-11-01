import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../../public/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../public/app.mjs', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');

test('proposed Britt tasks keep visible UNTRACKED UNTIL APPROVAL badges', () => {
  assert.match(app, /PROPOSED · UNTRACKED UNTIL APPROVAL/);
  assert.match(app, /proposal-badge/);
  assert.doesNotMatch(css, /\.proposal-task \.proposal-badge\{display:none\}/);
  assert.match(css, /\.proposal-badge\{[^}]*display:(?:block|inline-block)/);
});

test('history review keeps route-health refresh disabled and blocks recovery-card consent', () => {
  assert.match(app, /\$\('provider-check'\)\.disabled=reviewIndex!==null/);
  assert.match(app, /setInterval\(\(\)=>\{if\(!requestBusy&&state\)renderRouteHealth\(\);\},1000\)/);
  assert.match(app, /card\.addEventListener\('click',event=>\{if\(reviewIndex!==null\|\|button\.disabled\)return/);
});

test('route health stays a separate pre-flight group from investigation task', () => {
  assert.match(html, /id="route-health-label">ROUTE HEALTH · PRE-FLIGHT/);
  assert.match(html, /class="investigation-task"/);
  assert.match(css, /\.route-preflight\{/);
  assert.match(css, /\.investigation-task\{/);
  assert.match(css, /#route-help\{[^}]*font-size:12px/);
});

test('shock preview stays silver dashed until applied, and stopped red stays exclusive', () => {
  assert.match(css, /\.factory-node\.preview-offline rect\{[^}]*stroke:#C5CCD4/);
  assert.match(css, /stroke-dasharray:6 4/);
  assert.match(app, /previewOffline\?'PREVIEW - not applied'/);
  assert.match(css, /#factory-svg \.factory-node\.material-stopped rect\{stroke:#ff6b70!important\}/);
});

test('proof actions keep ordered text status gates and passphrase feedback', () => {
  assert.match(app, /1 · Verify the anchored history · enabled now/);
  assert.match(app, /2 · Seal with separate passphrase · enabled now|2 · Waiting on verify/);
  assert.match(app, /3 · Retain independent checkpoint · enabled now|3 · Waiting on sealed packet/);
  assert.match(app, /passphraseFeedback/);
  assert.match(html, /id="passphrase-rules"/);
  assert.match(css, /\.proof-action\[data-complete=true\]/);
});

test('prior blocked work and untracked proposals remain visually distinct', () => {
  assert.match(css, /#prior-work\{[^}]*repeating-linear-gradient/);
  assert.match(css, /\.proposal-task\{[^}]*dashed/);
  assert.match(app, /BLOCKED prior tasks · separate from proposed replacements/);
});
