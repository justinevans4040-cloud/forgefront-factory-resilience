import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascadeJs=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');
const cascadeCss=readFileSync(new URL('../../public/cascade.css',import.meta.url),'utf8');
const readme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');

test('build stamp advances to audit40 wonder uniform',()=>{
 assert.match(html,/ffr-build" content="audit(40-wonder-uniform|41-guided-nines|41-premium-calm|42-wonder-nines|43-wonder-finish|45-guided-nines)"/);
 assert.doesNotMatch(html,/audit39-cascade-restore/);
});

test('CONNECTION and EVIDENCE labels are explicit in the investigation rail',()=>{
 assert.match(html,/1 · CONNECTION/);
 assert.match(html,/2 · EVIDENCE · Investigate/);
 assert.match(html,/2 · EVIDENCE · Findings/);
 assert.match(html,/connection-ready-chip/);
 assert.match(html,/board-coexistence-banner/);
 assert.match(app,/1 · CONNECTION · ready|CONNECTION · identity ready/);
 assert.match(html,/The Britt investigates\./);
 assert.doesNotMatch(html,/(?<!The )Britt investigates/);
});

test('selected recovery path surfaces Approve then Authorize sequence',()=>{
 assert.match(app,/authorize-sequence/);
 assert.match(app,/Next: Approve → Authorize this decision/);
 assert.match(css,/authorize-sequence/);
 assert.match(app,/PROPOSED replacements UNTRACKED UNTIL APPROVAL/);
});

test('cascade caches recovery-arc geometry and enables CSS spine LOD earlier',()=>{
 assert.match(cascadeJs,/animate\.arcKey/);
 assert.match(cascadeJs,/plantScale>=400/);
 assert.match(cascadeCss,/data-css-flow/);
 assert.match(css,/audit40/);
});

test('README Live demo and cascade captions stay large for judge impact',()=>{
 assert.match(readme,/font-size:24px;line-height:1\.35;color:#A8F04A/);
 assert.match(readme,/Emerald mills → lathes/);
 assert.match(readme,/\*\*Live demo:\*\*/);
 assert.match(readme,/The Britt/);
 assert.doesNotMatch(readme,/127\.0\.0\.1/);
});
