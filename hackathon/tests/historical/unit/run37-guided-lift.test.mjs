import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascade=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');
const readme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');

test('build stamp advanced past audit36 (superseded by later audits)',()=>{
 assert.match(html,/ffr-build" content="audit(3[789]|4[012345])-[a-z0-9-]+"/);
 assert.doesNotMatch(html,/audit36-wonder-lift/);
});

test('cascade pixel LOD caches route ends and never drops machines',()=>{
 assert.match(cascade,/data-css-flow|cssFlow/);
 assert.match(cascade,/cache\.mills/);
 assert.match(cascade,/Route endpoints resolved once/);
 assert.match(cascade,/never fewer machines/i);
 assert.match(cascade,/Backing-store density LOD|CSS spine LOD/);
 assert.match(cascade,/plantScale>=400/);
 assert.match(cascade,/OFFLINE/);
 assert.doesNotMatch(cascade,/slice\(0,\s*\d+\).*machines/);
});

test('guided Wonder P1 lifts cover cleared findings and 44px path Select',()=>{
 assert.match(css,/audit37/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/findings-reserve-active/);
 assert.match(html,/1 · CONNECTION/);
 assert.match(app,/CLEARED · Verified findings wiped/);
 assert.match(app,/rear-silhouette/);
 assert.match(app,/Select this path/);
});

test('README keeps Live demo order, The Britt and production authorization sentence',()=>{
 assert.match(readme,/\*\*Live demo:\*\* \[Open the recovery room\]/);
 assert.match(readme,/authorization wall/);
 assert.match(readme,/The Britt/);
 assert.match(readme,/\*\*A factory disruption/);
 assert.doesNotMatch(readme,/127\.0\.0\.1/);
 assert.doesNotMatch(readme,/localhost/i);
});

test('The Britt investigates heading stays exact in the recovery room',()=>{
 assert.match(html,/The Britt investigates\./);
 assert.doesNotMatch(html,/(?<!The )Britt investigates/);
});
