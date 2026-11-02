import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascadeJs=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');
const cascadeCss=readFileSync(new URL('../../public/cascade.css',import.meta.url),'utf8');
const status=readFileSync(new URL('../../public/investigation-status.mjs',import.meta.url),'utf8');
const readme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');
const designSystem=new URL('../../design/DESIGN_SYSTEM.md',import.meta.url);

test('build stamp advances to audit41 premium calm',()=>{
 assert.match(html,/ffr-build" content="audit41-premium-calm"/);
 assert.doesNotMatch(html,/audit40-wonder-uniform/);
 assert.doesNotMatch(html,/audit41-guided-nines/);
});

test('DESIGN_SYSTEM.md documents calm premium command center',()=>{
 assert.equal(existsSync(designSystem),true);
 const md=readFileSync(designSystem,'utf8');
 assert.match(md,/8px grid/i);
 assert.match(md,/one accent/i);
 assert.match(md,/The Britt/);
 assert.match(md,/Linear|Datadog|Grafana/i);
});

test('Wonder P1 guided lifts keep CONNECTION distinct from EVIDENCE without glow stacks',()=>{
 assert.match(html,/1 · CONNECTION/);
 assert.match(html,/2 · EVIDENCE · Investigate/);
 assert.match(html,/3 · EVIDENCE · Findings/);
 assert.match(css,/audit41 \/ round42/);
 assert.match(css,/border-left:4px solid #C5CCD4/);
 assert.match(css,/border-left:4px solid #A8F04A/);
 assert.match(css,/#factory-svg \.living-spine\{stroke-width:4/);
 assert.match(app,/PENDING · Evidence findings reserved/);
 assert.match(html,/The Britt investigates\./);
 assert.doesNotMatch(html,/(?<!The )Britt investigates/);
});

test('evidence headlines stay plain English and guided legend chips stay off',()=>{
 assert.match(app,/headline\.textContent=plain/);
 assert.doesNotMatch(app,/evidence-figure/);
 assert.match(app,/Guided mode: launcher only/);
 assert.match(status,/Choose a route, then Investigate\./);
 assert.doesNotMatch(status,/Sample stays offline/);
});

test('cascade keeps full department names with restrained glow',()=>{
 assert.match(cascadeJs,/plant-dept-label/);
 assert.match(cascadeJs,/full department names/);
 assert.doesNotMatch(cascadeJs,/slice\(0,16\)/);
 assert.match(cascadeJs,/if\(!ultra\)paintRecoveryArc/);
 assert.match(cascadeCss,/plant-dept-label/);
 assert.match(cascadeCss,/calm feasible glow/);
});

test('README Live demo stays a clear judge target without oversized type',()=>{
 assert.match(readme,/min-height:32px;padding:6px 4px[^>]*>[\s\S]*?font-size:24px;line-height:1\.35;color:#A8F04A/);
 assert.match(readme,/\*\*Live demo:\*\*/);
 assert.match(readme,/The Britt/);
 assert.doesNotMatch(readme,/127\.0\.0\.1/);
 assert.doesNotMatch(readme,/min-height:36px;padding:8px 4px[^>]*>[\s\S]*?font-size:36px/);
});
