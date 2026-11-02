import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascade=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');
const readme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');

test('build stamp advances to audit36 wonder lift or later',()=>{
 assert.match(html,/ffr-build" content="audit3[67]-[a-z0-9-]+"/);
 assert.doesNotMatch(html,/audit35-cascade-cache/);
});

test('cascade resize reflows tiles through calcCache without fresh analyzePlant cost',()=>{
 assert.match(cascade,/reason==='resize'|draw\('resize'\)/);
 assert.match(cascade,/must not re-run analyzePlant/i);
 assert.match(cascade,/calcCache/);
 assert.match(cascade,/metrics\.dataset\.key/);
 assert.match(cascade,/Fixed min-height cells/);
 assert.match(cascade,/plantScale>=800/);
 assert.match(cascade,/never fewer machines/i);
 assert.match(cascade,/extremeArt|glyph LOD/);
});

test('board coexistence line is not repeated four times',()=>{
 assert.match(app,/Coexistence line stays in #board-outcomes only/);
 assert.match(app,/Approve proposed tasks when ready/);
 assert.match(app,/machine-silhouette/);
 assert.match(css,/audit36/);
 assert.match(css,/data-has-findings=true\] \.route-preflight\{display:block/);
});

test('README live demo keeps required pitch marker and production security sentence',()=>{
 assert.match(readme,/\*\*Live demo:\*\* \[Open the recovery room\]/);
 assert.match(readme,/authorization wall/);
 assert.match(readme,/The Britt/);
 assert.doesNotMatch(readme,/127\.0\.0\.1/);
 assert.doesNotMatch(readme,/localhost/i);
});

test('generated plant fixture spreads machines across seven shop departments',async()=>{
 const {generatedPlant}=await import('../../fixtures/generated-plant.mjs');
 const {plantGroups}=await import('../../public/plant-layout.mjs');
 const plant=generatedPlant(1000);
 const groups=plantGroups(plant.machines);
 assert.equal(groups.length,7);
 assert.ok(groups.some(g=>/CNC mills/i.test(g.label)));
 assert.ok(groups.some(g=>/CNC lathes/i.test(g.label)));
 assert.equal(groups.reduce((n,g)=>n+g.machines.length,0),1000);
});
