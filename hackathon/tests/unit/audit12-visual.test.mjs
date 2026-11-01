import {certificateComparison} from '../../public/factory-layout.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {consentProgress,proofActionGate,proposalBanner} from '../../public/command-center.mjs';

const app = readFileSync(new URL('../../public/app.mjs', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../public/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');

test('typed consent reports exact progress as typed/total rather than remaining-only', () => {
  assert.deepEqual(consentProgress('APPROVE allocate_substitute', ''), {match: false, label: '0/27 typed', enabled: false});
  assert.deepEqual(consentProgress('APPROVE allocate_substitute', 'APPROVE allocate_substitut'), {match: false, label: '26/27 typed', enabled: false});
  assert.deepEqual(consentProgress('APPROVE allocate_substitute', 'APPROVE allocate_substitute'), {match: true, label: 'Exact phrase matched. Acceptance enabled.', enabled: true});
  assert.match(app, /consentProgress\(/);
});

test('Britt proposal banner states untracked-until-approval when zero tasks are tracked', () => {
  assert.equal(proposalBanner({tasks: []}, {board: {tasks: [{id: 't1'}, {id: 't2'}, {id: 't3'}]}}), '0 tracked · PROPOSED tasks stay untracked until you approve Britt’s proposal.');
  assert.match(proposalBanner({tasks: [{status: 'Blocked'}, {status: 'Blocked'}, {status: 'Blocked'}]}, {board: {tasks: [{id: 't1'}]}}), /Prior tracked work/);
  assert.match(app, /proposalBanner\(/);
});

test('proof actions gate later steps until prerequisites complete on the current ledger head', () => {
  const guide = {verified: null, exported: null, checkpoint: null};
  const state = {ledger: {head: 'h1'}};
  assert.deepEqual(proofActionGate(state, guide), {verify: true, 'encrypted-export': false, checkpoint: false});
  guide.verified = 'h1';
  assert.deepEqual(proofActionGate(state, guide), {verify: true, 'encrypted-export': true, checkpoint: false});
  guide.exported = 'h1';
  assert.deepEqual(proofActionGate(state, guide), {verify: true, 'encrypted-export': true, checkpoint: true});
  assert.match(app, /proofActionGate\(/);
});

test('completion primary labels the finished state instead of implying another required step', () => {
  assert.match(app, /complete:'Recovery complete'/);
  assert.doesNotMatch(app, /complete:'Review recovery proof'/);
});

test('factory SVG enlarges cert quantity tracks and labels PREVIEW - not applied', () => {
  assert.match(app, /PREVIEW - not applied/);
  assert.match(app, /certificateComparison\(qty,420\)/);
  assert.deepEqual(certificateComparison([120,80].map(value=>({quantity:{value}})),420).widths,[420,280]);
  assert.deepEqual(certificateComparison([200,80].map(value=>({quantity:{value}})),420).widths,[420,168]);
  assert.match(app, /y\+30,String\(e.quantity.value\),34/);
  assert.match(app, /DOES NOT/);
  assert.match(app, /MATCH/);
  assert.match(css, /OPENING STORY/);
});

test('inspector evidence uses fade padding and route health stays visually separate', () => {
  assert.match(css, /inspector-fade|#evidence:after|\.evidence-scroll/);
  assert.match(html, /MODEL CONNECTION/);
  assert.match(css, /\.route-preflight/);
  assert.match(app, /focusPanel\('model-output'\)|focusResult\('model-output'/);
});
