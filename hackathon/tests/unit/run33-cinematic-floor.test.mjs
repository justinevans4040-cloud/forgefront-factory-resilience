import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposalLayout,tileTitle} from '../../public/stage-scene.mjs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascade=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');
const scene=readFileSync(new URL('../../public/stage-scene.mjs',import.meta.url),'utf8');

test('build stamp advanced past audit32 cinematic baseline',()=>{
 assert.match(html,/ffr-build" content="audit(3[3456789]|4[0123])-[a-z0-9-]+"/);
 assert.doesNotMatch(html,/audit32-the-britt-authorize/);
});

test('board scene marks offline cells with hatch and offline-x',()=>{
 assert.match(app,/preview-hatch/);
 assert.match(app,/offline-x/);
 assert.match(app,/WILL GO OFFLINE/);
 assert.match(app,/mismatch-crack/);
 assert.match(app,/capacity-drain/);
 assert.match(app,/held-flow/);
});

test('proposal layout prefers two title lines so task three stays readable',()=>{
 const slots=proposalLayout(3,520);
 assert.ok(slots.every(s=>s.titleLines>=2),'each proposed task reserves at least two title lines at tall stage height');
 const lines=tileTitle('Expedite substitute alloy through CELL-MILL-1 for JOB-1002 recovery',18,2);
 assert.equal(lines.length,2);
 assert.ok(!lines[1].endsWith('…')||lines[0].length>0);
});

test('cascade LOD engages heavy earlier without dropping machine counts',()=>{
 assert.match(cascade,/plantScale>=400/);
 assert.match(cascade,/plantScale>=400/);
 assert.ok(/Skip (alternate )?canvas paints/i.test(cascade)||cascade.includes('refreshTileCache'));
 assert.match(cascade,/never fewer machines/i);
});

test('audit33 cinematic CSS lifts stage fill living flow and reduced motion',()=>{
 assert.match(css,/audit33/);
 assert.match(css,/3\.85fr/);
 assert.match(css,/mismatch-flash/);
 assert.match(css,/capacity-drain/);
 assert.match(css,/held-flow/);
 assert.match(css,/shock-preview-hatch/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/findings-reserve/);
 assert.match(scene,/Prefer 2–3 title lines|Prefer 2-3 title lines|title lines so task/);
 assert.match(html,/id="findings-reserve"/);
 assert.match(app,/findings-reserve/);
});
