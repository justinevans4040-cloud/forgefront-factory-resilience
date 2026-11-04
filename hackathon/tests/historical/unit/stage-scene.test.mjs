import test from 'node:test';
import assert from 'node:assert/strict';
import {stageScene} from '../../public/stage-scene.mjs';
const state={decision:{status:'accepted'},board:{tasks:[{id:'old',status:'Blocked'}]},britt:{proposal:{board:{tasks:[{id:'t1',title:'Inspect source',owner:'operator',dueHours:7,dependsOn:[],status:'To do'}]}}},ledger:{count:17,head:'head'},snapshot:{cells:[{cellId:'CELL-A',online:true}]}};
test('task scene separates pending human work from tracked work using actual counts',()=>{
 const scene=stageScene('board',state,{});
 assert.equal(scene.kind,'tasks');assert.equal(scene.blocked,1);assert.equal(scene.tasks[0].title,'Inspect source');assert.equal(scene.pending,true);
 assert.equal(stageScene('board',{...state,britt:{}},{}).pending,false);
});
test('proof scene gates sealing against the current head, never stale verification',()=>{
 assert.deepEqual(stageScene('proof',state,{verified:'old',exported:'old'}).gates,[false,false,false]);
 assert.deepEqual(stageScene('proof',state,{verified:'head',exported:'head',checkpoint:'head'}).gates,[true,true,true]);
 assert.equal(stageScene('proof',state,{}).events,17);
});
test('factory scene selects a compact source comparison without changing decision scenes',()=>{
 assert.equal(stageScene('incident',state,{}).compact,true);
 assert.equal(stageScene('decision',state,{}).compact,false);
 assert.equal(stageScene('shock',state,{}).kind,'shock');
});
import {wrapSceneTitle} from '../../public/stage-scene.mjs';
test('scene titles wrap without losing any words or hiding task identity',()=>{
 const title='Check the certificate and receiving records before coordinating the accepted capacity plan';
 const lines=wrapSceneTitle(title,28);
 assert.equal(lines.join(' '),title);assert.ok(lines.length>1);assert.ok(lines.every(line=>line.length<=28));
});
import {readFileSync} from 'node:fs';
test('outage preview uses a separate silver hatch from applied stopped red',()=>{
 const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
 assert.match(app,/id:'preview-hatch'/);
 assert.match(css,/\.factory-node\.preview-offline rect\{[^}]*fill:url\(#preview-hatch\)/);
});
