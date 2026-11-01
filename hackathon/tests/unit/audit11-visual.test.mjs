import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guidedSteps, guideStep} from '../../public/guide.mjs';

const html = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../public/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../public/app.mjs', import.meta.url), 'utf8');

test('guided shell keeps header and opening-story logo placements without narrative clutter', () => {
  assert.match(html, /class="brand-mark"/);
  assert.match(html, /id="opening-story"[\s\S]*?class="story-logo"/);
  assert.match(css, /body\[data-guided=true\]\[data-active-stage=incident\] #opening-story\{/);
  assert.match(css, /body\[data-guided=true\]\[data-active-stage=incident\] \.story-hero>\.eyebrow/);
  assert.match(app, /dataset\.activeStage==='shock'/);
});

test('workspace rail is always visible without a Workspaces disclosure', () => {
  assert.match(html, /<nav id="workspace-switcher" class="workspace-nav"/);
  assert.doesNotMatch(html, /<details id="workspace-switcher"/);
  assert.doesNotMatch(html, />Workspaces</);
  assert.doesNotMatch(app, /workspace-switcher'\)\.open/);
});

test('factory stage renders cinematic dock, QA gate, conveyor and shock preview bindings', () => {
  assert.match(app, /dock-bay/);
  assert.match(app, /qa-gate/);
  assert.match(app, /conveyor-belt/);
  assert.match(app, /preview-offline/);
  assert.match(html, /id="shock-preview"/);
  assert.match(app, /shock-cell'\)\.addEventListener\('change'/);
});

test('proof actions are separated into labelled fieldsets', () => {
  assert.equal((html.match(/class="proof-action"/g) || []).length, 3);
  assert.deepEqual([...html.matchAll(/<legend>([^<]+)<\/legend>/g)].map(m=>m[1]), ['1 · Verify ledger','2 · Seal encrypted packet','3 · Retain independent checkpoint']);
});

test('primary guided control invokes real investigation and never stalls on focus-only', () => {
  assert.match(app, /\$\('investigate'\)\.click\(\)/);
  assert.match(app, /\$\('shock'\)\.click\(\)/);
  assert.match(app, /\$\('britt-approve'\)\.click\(\)/);
  assert.match(app, /guide\.inspected=true/);
  assert.match(app, /if\(\['spark','wonder','sample','recover'\]\.includes\(step\.id\)\)/);
});

test('Back and completed-rail review stay read-only without mutating ledger state', () => {
  assert.match(app, /\$\('guide-back'\)\.addEventListener\('click'/);
  assert.match(app, /for\(const e of document\.querySelectorAll\('#stage-deck button,#stage-deck input,#stage-deck select'\)\)e\.disabled=true/);
  assert.match(app, /Review · '/);
  assert.match(app, /decisions and ledger remain intact/);
});

test('offline and live board itineraries expose every recovery step through guided progression', () => {
  const offline = guidedSteps('offline', true).map((s) => s.id);
  const live = guidedSteps('live', true).map((s) => s.id);
  assert.deepEqual(offline, ['sources', 'sample', 'accept', 'board', 'shock', 'recover', 'reaccept', 'board-revised', 'export', 'complete']);
  assert.deepEqual(live, ['sources', 'spark', 'wonder', 'accept', 'board', 'shock', 'recover', 'reaccept', 'board-revised', 'export', 'complete']);
  const state = {
    snapshot: {snapshotDigest: 'a'},
    analysis: {impacted: {impactedJobCount: 2, impactedUnits: 70}, recovery: {options: []}},
    decision: {status: 'none'},
    ledger: {ok: true, count: 1, head: 'h'},
    runs: [],
    board: {tasks: []},
  };
  const guide = {mode: 'offline', initialDigest: 'a', inspected: false, boardEnabled: true};
  assert.equal(guideStep(state, guide).id, 'sources');
  guide.inspected = true;
  assert.equal(guideStep(state, guide).id, 'sample');
});

test('Meta product routes keep Fireworks optional and never auto-call it from Britt drafting', async () => {
  const board = readFileSync(new URL('../../src/recovery-board.mjs', import.meta.url), 'utf8');
  assert.match(board, /PRIMARY_META_ROUTE_REQUIRED/);
  assert.match(board, /\['meta-model-api','baseten'\]/);
  assert.doesNotMatch(board, /fireworks/);
  const {checkProviders} = await import('../../scripts/provider-check.mjs');
  const seen = [];
  const result = await checkProviders({
    env: {MUSE_API_KEY: 'synthetic-wonder', BASETEN_API_KEY: 'synthetic-baseten', FIREWORKS_API_KEY: 'synthetic-backup'},
    fetchImpl: async (url, options) => {
      seen.push(String(url));
      const body = JSON.parse(options.body);
      const prompt = body.input ?? body.messages[0].content;
      const nonce = prompt.match(/SMOKE_OK_[a-f0-9]+/)[0];
      return new Response(JSON.stringify(body.input ? {model: body.model, output_text: nonce} : {model: body.model, choices: [{message: {content: nonce}}]}));
    },
  });
  assert.equal(result.passed, true);
  assert.ok(!seen.some((url) => url.includes('fireworks')));
});
