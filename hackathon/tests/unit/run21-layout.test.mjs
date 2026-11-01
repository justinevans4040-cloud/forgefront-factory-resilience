import test from 'node:test';
import assert from 'node:assert/strict';
import {factoryPositions} from '../../public/factory-layout.mjs';
test('factory nodes occupy the available band without collisions for any count',()=>{
 for(const right of [640,876])for(const count of [1,2,3,5]){
  const p=factoryPositions(210,right,count,186);
  assert.equal(p.length,count);
  assert.equal(p[0].x,210);
  if(count>1)assert.equal(p.at(-1).x+p.at(-1).width,right);
  for(let i=1;i<count;i++)assert.ok(p[i].x>=p[i-1].x+p[i-1].width+12);
 }
});
import {stageScene} from '../../public/stage-scene.mjs';
test('task scene retains a detached live machine context alongside proposals',()=>{
 const state={board:{tasks:[]},britt:{proposal:{board:{tasks:[]}}},snapshot:{cells:[{cellId:'CELL-X',online:false,availableHours:0}]}};
 const scene=stageScene('board',state);
 assert.deepEqual(scene.cells,state.snapshot.cells);
 scene.cells[0].online=true;
 assert.equal(state.snapshot.cells[0].online,false);
});
import {assertNewIteration} from '../../scripts/design-director.mjs';
test('design reviews refuse an existing iteration before making a model request',()=>{
 assert.throws(()=>assertNewIteration(new URL('../../design/',import.meta.url),70),/already exists/);
 assert.doesNotThrow(()=>assertNewIteration(new URL('../../design/',import.meta.url),999999));
});
import {readFileSync} from 'node:fs';
test('tracked task inspectors size to their full content and decision status stays compact',()=>{
 const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
 assert.match(css,/#recovery-board \.board-column\{max-height:none!important;overflow:visible!important/);
 assert.match(css,/\.decision\{flex:0 0 auto!important/);
 assert.match(css,/summary:focus-visible/);
});
import {tileTitle} from '../../public/stage-scene.mjs';
test('task overview titles stay within three reserved lines while full text remains available',()=>{
 const long='Inspect and reconcile each source certificate record before coordinating the remaining available machine capacity and supplier receiving allocation';
 const lines=tileTitle(long,23,3);
 assert.equal(lines.length,3);assert.ok(lines.at(-1).endsWith('…'));assert.ok(lines.every(l=>l.length<=23));
 assert.deepEqual(tileTitle('Verify source',23,3),['Verify source']);
});
test('keyboard smoke inspects the visible incident before advancing its guided step',()=>{
 const smoke=readFileSync(new URL('../../scripts/browser-smoke.mjs',import.meta.url),'utf8');
 assert.ok(smoke.indexOf("checks.push('source inspection')")<smoke.indexOf("'offline guide start'"));
});

test('keyboard smoke opens route disclosure before reaching its provider selector',()=>{
 const smoke=readFileSync(new URL('../../scripts/browser-smoke.mjs',import.meta.url),'utf8');
 assert.ok(smoke.includes("closest('.route-preflight:not([open])')"));
});
