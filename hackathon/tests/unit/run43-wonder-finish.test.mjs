import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascade=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');
const readme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');
const contributionsUrl=new URL('../../../HACKATHON_CONTRIBUTIONS.md',import.meta.url);
const designSystem=new URL('../../design/DESIGN_SYSTEM.md',import.meta.url);

test('build stamp advances past audit43 wonder finish',()=>{
 assert.match(html,/ffr-build" content="audit(43-wonder-finish|45-guided-nines)"/);
 assert.doesNotMatch(html,/audit42-wonder-nines/);
});

test('DESIGN_SYSTEM.md remains the calm premium contract',()=>{
 assert.equal(existsSync(designSystem),true);
 const md=readFileSync(designSystem,'utf8');
 assert.match(md,/8px grid/i);
 assert.match(md,/The Britt/);
});

test('Wonder P1: held material flow stops at HOLD and machine volume is present',()=>{
 assert.match(app,/holdStopX|flowLimit/);
 assert.match(app,/hold-flow-stop/);
 assert.match(app,/machine-volume/);
 assert.match(css,/audit43/);
});

test('Wonder P1: Certificate and Receiving tracks support bidirectional highlight',()=>{
 assert.match(app,/data-compare-role/);
 assert.match(app,/compare-track-active/);
 assert.match(app,/selected-path-trace/);
});

test('Wonder P1: cleared findings stay separate from Reinvestigate primary',()=>{
 assert.match(app,/CLEARED · Verified findings wiped/);
 assert.doesNotMatch(app,/Reinvestigate source evidence to refill facts/);
});

test('Wonder P1: constrained path and proof depth remain explicit',()=>{
 assert.match(app,/× CONSTRAINED · OFFLINE-ADJACENT/);
 assert.match(app,/proof-progress-trace/);
 assert.match(app,/scene-inline-legend/);
});

test('Wonder P1: cascade OFFLINE counts align with department labels',()=>{
 assert.match(cascade,/× OFFLINE · /);
});

test('README keeps Live demo marker, widens cascade, and adds signal markers',()=>{
 assert.match(readme,/\*\*Live demo:\*\*/);
 assert.match(readme,/Open the recovery room/);
 assert.match(readme,/min-height:(520|560)px/);
 assert.match(readme,/\| Marker \|/);
});

test('public contributions omit private release-folder paths',()=>{
 const banned='FFR_'+'Pub'+'lish';
 assert.equal(readme.includes(banned),false);
 if(existsSync(contributionsUrl))assert.equal(readFileSync(contributionsUrl,'utf8').includes(banned),false);
});

test('Authorize wall and The Britt naming stay intact',()=>{
 assert.match(html,/Authorize this decision/);
 assert.match(html,/The Britt investigates\./);
 assert.doesNotMatch(html,/(?<!The )Britt investigates/);
});
