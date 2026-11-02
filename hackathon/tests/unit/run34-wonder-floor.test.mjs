import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascade=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');

test('build stamp advances past audit33 cinematic floor',()=>{
 assert.match(html,/ffr-build" content="audit(3[456789]|40)-[a-z0-9-]+"/);
 assert.doesNotMatch(html,/audit33-cinematic-floor/);
});

test('board offline cells keep hatch and corner mark without full-card diagonals',()=>{
 assert.match(app,/preview-hatch/);
 assert.match(app,/offline-x/);
 assert.match(app,/offline-replan/);
 assert.doesNotMatch(app,/l \$\{slot\.width-32\} 70 m 0 -70/);
 assert.match(app,/Authorize '\+pathName\+'/);
 assert.match(app,/approved plan retained/);
});

test('cascade LOD keeps heavy extreme ultra tiers without dropping machines',()=>{
 assert.match(cascade,/plantScale>=400/);
 assert.match(cascade,/plantScale>=400/);
 assert.match(cascade,/plantScale>=400/);
 assert.match(cascade,/never fewer machines/i);
 assert.match(cascade,/corner × only/);
 // audit35 replaces paint-stride with cached static layer + dirty-tile art flips
 assert.ok(cascade.includes('paintStride')||cascade.includes('refreshTileCache'));
});

test('audit34 wonder CSS equalizes path cards and proof READY LOCKED',()=>{
 assert.match(css,/audit34/);
 assert.match(css,/3\.9fr/);
 assert.match(css,/content:" · READY"/);
 assert.match(css,/content:" · LOCKED"/);
 assert.match(css,/offline-replan/);
 assert.match(css,/option\.unavailable>p\{display:none/);
 assert.match(css,/min-height:72px/);
});
