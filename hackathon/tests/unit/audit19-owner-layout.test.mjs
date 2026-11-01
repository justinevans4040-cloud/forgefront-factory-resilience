import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const geometry=readFileSync(new URL('../../scripts/layout-geometry.mjs',import.meta.url),'utf8');
const primary=readFileSync(new URL('../../scripts/primary-guide-smoke.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');

test('factory nodes draw at the reserved factoryPositions width, not a fixed 186 box',()=>{
 assert.match(app,/const node=\(x,y,title,sub,kind,parent,width/);
 assert.match(app,/box\(x,y,width,nodeH/);
 assert.match(app,/machineSlots\[i\]\.width/);
 assert.match(app,/slot\.width/);
 assert.match(app,/node\(slot\.x,jobY/);
 assert.doesNotMatch(app,/box\(x,y,186,nodeH/);
});

test('shock capacity preview stays in a reserved side column with a leader to the selected cell',()=>{
 assert.match(app,/const shockStage=stage==='shock'/);
 assert.match(app,/lineRight=shockStage\?640:876/);
 assert.match(app,/box\(658,machineY,226/);
 assert.match(app,/CAPACITY PREVIEW/);
 assert.match(app,/Apply → invalidate/);
 assert.match(app,/H 658/);
});

test('geometry harness fails independent text and node intersections without same-band siblings skipping',()=>{
 assert.match(geometry,/export function measureLayout/);
 assert.match(geometry,/hits\.push/);
 assert.doesNotMatch(geometry,/a\.band&&b\.band&&a\.band===b\.band&&a\.kind==='text'&&b\.kind==='text'\)continue/);
 assert.match(geometry,/closest\('g\.factory-node/);
 assert.match(geometry,/fill/);
 assert.match(geometry,/bodyPx/);
});

test('geometry walk covers recorded live-shaped five-task proposals',()=>{
 assert.match(primary,/--recorded-drafts|--live-proposals|five-task|recordedDrafts/);
 assert.match(primary,/measureLayout/);
 assert.match(primary,/r\.hits\.length\|\|r\.clipped\.length\|\|r\.pageScroll\|\|r\.fill<\.70\|\|r\.bodyPx<16/);
});

test('owner desktop shell keeps horizontal rail, stage CTA, and evidence cards without forced scroll',()=>{
 assert.match(css,/flex-direction:row!important/);
 assert.match(css,/height:40px!important/);
 assert.match(css,/#decision-bar\{position:absolute!important/);
 assert.match(css,/\.evidence-headline\{margin:0!important;font-size:17px!important/);
 assert.match(css,/#evidence,\.evidence-cards\{display:flex!important;flex-direction:column;gap:8px;max-height:none!important;overflow:visible!important/);
});
