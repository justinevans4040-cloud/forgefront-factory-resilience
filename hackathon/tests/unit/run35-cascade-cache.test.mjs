import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascade=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');

test('build stamp remains past audit34 and keeps cascade-cache features',()=>{
 assert.match(html,/ffr-build" content="audit3[567]-[a-z0-9-]+"/);
 assert.doesNotMatch(html,/audit34-wonder-floor/);
});

test('cascade uses cached tile centers and offscreen static layer without dropping machines',()=>{
 assert.match(cascade,/refreshTileCache/);
 assert.match(cascade,/OffscreenCanvas/);
 assert.match(cascade,/paintStaticLayer/);
 assert.match(cascade,/animate\.tileCache=null/);
 assert.match(cascade,/never fewer machines/i);
 assert.match(cascade,/Extreme plants rely on tile CSS\/hatch chips/);
 assert.match(cascade,/metricsTick/);
 assert.doesNotMatch(cascade,/paintStride/);
 assert.match(cascade,/plantScale>=400/);
 assert.match(cascade,/plantScale>=800/);
 assert.match(cascade,/plantScale>=1000/);
});

test('factory scene adds layered floor depth planes',()=>{
 assert.match(app,/factory-floor-rear/);
 assert.match(app,/factory-floor-apron/);
 assert.match(app,/factory-floor-glow-line/);
});

test('audit35 CSS enlarges findings targets and stage fill',()=>{
 assert.match(css,/audit35/);
 assert.match(css,/3\.95fr/);
 assert.match(css,/min-height:36px/);
 assert.match(css,/living-spine\{stroke-width:7/);
});
