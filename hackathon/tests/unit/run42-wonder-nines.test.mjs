import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const designSystem=new URL('../../design/DESIGN_SYSTEM.md',import.meta.url);

test('build stamp advances to audit42 wonder nines',()=>{
 assert.match(html,/ffr-build" content="audit(42-wonder-nines|43-wonder-finish)"/);
 assert.doesNotMatch(html,/audit41-premium-calm/);
});

test('DESIGN_SYSTEM.md remains the calm premium contract',()=>{
 assert.equal(existsSync(designSystem),true);
 const md=readFileSync(designSystem,'utf8');
 assert.match(md,/8px grid/i);
 assert.match(md,/The Britt/);
});

test('Wonder P1: CONNECTION stays distinct from EVIDENCE via summary and chip',()=>{
 assert.match(html,/1 · CONNECTION/);
 assert.match(html,/2 · EVIDENCE · Investigate/);
 assert.match(html,/2 · EVIDENCE · Findings/);
 assert.match(app,/1 · CONNECTION · ready/);
 assert.match(app,/1 · CONNECTION/);
 assert.match(app,/preflightSummary\.textContent/);
 assert.match(css,/audit42 \/ round43/);
});

test('Wonder P1: proposed board and scene cards state UNTRACKED UNTIL APPROVAL',()=>{
 assert.match(app,/UNTRACKED UNTIL APPROVAL/);
 assert.match(app,/proposal-untracked/);
 assert.match(app,/short\+' · UNTRACKED'/);
 assert.match(app,/statusY,'UNTRACKED'/);
});

test('Wonder P1: Approve then Authorize sequence remains the decision progression',()=>{
 assert.match(app,/Next: Approve → Authorize this decision/);
 assert.match(html,/Authorize this decision/);
 assert.match(css,/authorize-sequence/);
 assert.match(html,/The Britt investigates\./);
 assert.doesNotMatch(html,/(?<!The )Britt investigates/);
});
