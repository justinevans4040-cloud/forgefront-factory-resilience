import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {departmentStatus} from '../../public/cascade.mjs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascadeJs=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');
const cascadeCss=readFileSync(new URL('../../public/cascade.css',import.meta.url),'utf8');
const readme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');

test('build stamp advances to audit39 cascade restore',()=>{
 assert.match(html,/ffr-build" content="audit(39-cascade-restore|40-wonder-uniform)"/);
 assert.doesNotMatch(html,/audit38-wonder-finish/);
});

test('cascade restores reserved OFFLINE strip and living SVG mills-lathes arc',()=>{
 assert.match(cascadeJs,/plant-status-strip/);
 assert.match(cascadeJs,/paintRecoveryArc/);
 assert.match(cascadeJs,/plant-recovery-arc/);
 assert.match(cascadeJs,/opacity','0\.42'/);
 assert.match(cascadeCss,/audit39/);
 assert.match(cascadeCss,/plant-status-strip/);
 assert.match(cascadeCss,/plant-recovery-arc/);
 assert.match(cascadeCss,/plant-arc-spine/);
 assert.equal(departmentStatus({recovered:false,active:true,offlineCount:5,runningCount:0,members:5,hit:true}),'OFFLINE · 5');
 assert.match(departmentStatus({recovered:false,active:true,offlineCount:5,runningCount:7,members:12,hit:true}),/OFFLINE/);
});

test('ultra cascade stops rAF after wave unless FPS sampling',()=>{
 assert.match(cascadeJs,/needRaf=\(sample&&sample\.collecting\)\|\|\(active&&!recovered&&progress<1/);
});

test('guided scene adds receiving-to-job risk traces and 26px metrics',()=>{
 assert.match(app,/receiving-job-risk/);
 assert.match(app,/risk-job-trace/);
 assert.match(css,/audit39/);
 assert.match(css,/risk-job-trace/);
 assert.match(css,/investigation-metric strong/);
 assert.match(css,/font-size:26px/);
});

test('README keeps hero and cascade captions in brand order',()=>{
 assert.match(readme,/Hero: command center/);
 assert.match(readme,/emerald mills → lathes/i);
 assert.match(readme,/font-size:28px/);
 assert.match(readme,/Live demo — open the recovery room|Live demo:\*\*/);
 assert.match(readme,/\*\*Live demo:\*\*/);
 assert.match(readme,/The Britt/);
 assert.doesNotMatch(readme,/127\.0\.0\.1/);
});

test('The Britt investigates heading stays exact',()=>{
 assert.match(html,/The Britt investigates\./);
 assert.doesNotMatch(html,/(?<!The )Britt investigates/);
});
