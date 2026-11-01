import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const geometry=readFileSync(new URL('../../scripts/layout-geometry.mjs',import.meta.url),'utf8');
const primary=readFileSync(new URL('../../scripts/primary-guide-smoke.mjs',import.meta.url),'utf8');

test('factory scenes reserve independent callout, machine, job and option bands',()=>{
 assert.match(app,/data-layout-zone/);
 assert.match(app,/data-scene-band':'callout'/);
 assert.match(app,/data-scene-band':'bay'/);
 assert.match(app,/parent===orders\?'jobs':'machines'/);
 assert.match(app,/data-scene-band':'options'/);
 assert.match(app,/ResizeObserver/);
 assert.match(app,/CAPACITY PREVIEW/);
 assert.match(app,/shockStage\?104:Math\.max\(108/);
 assert.doesNotMatch(app,/const machineY=incidentStage\?190:150/);
});

test('shock capacity preview lives in the top callout band above stations, never beside them',()=>{
 assert.match(app,/box\(24,8,852,88/);
 assert.match(app,/Apply → invalidate acceptance/);
 assert.match(app,/Captions stay inside the node box/);
 assert.match(app,/const lineRight=876/);
 assert.doesNotMatch(app,/lineRight=shockStage\?640/);
});

test('proof cards use available scene height and paths expose shared selection hooks',()=>{
 assert.match(app,/height:height-140/);
 assert.match(app,/data-scene-option/);
 assert.match(app,/function highlightPath/);
});

test('geometry harness fails on intersecting text or node boxes and is wired into the guided smoke',()=>{
 assert.match(geometry,/export function measureLayout/);
 assert.match(geometry,/hits\.push/);
 assert.match(geometry,/closest\('g\.factory-node/);
 assert.doesNotMatch(geometry,/a\.band&&b\.band&&a\.band===b\.band&&a\.kind==='text'&&b\.kind==='text'\)continue/);
 assert.match(geometry,/fill/);
 assert.match(geometry,/bodyPx/);
 assert.match(primary,/measureLayout/);
 assert.match(primary,/--geometry/);
 assert.match(primary,/r\.hits\.length\|\|r\.clipped\.length\|\|r\.pageScroll\|\|r\.fill<\.70\|\|r\.bodyPx<16/);
});
