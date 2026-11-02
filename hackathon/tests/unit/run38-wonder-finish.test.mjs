import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {departmentStatus} from '../../public/cascade.mjs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const cascadeCss=readFileSync(new URL('../../public/cascade.css',import.meta.url),'utf8');
const readme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');
const hackathonReadme=readFileSync(new URL('../../README.md',import.meta.url),'utf8');

test('build stamp advances to audit38 wonder finish',()=>{
 assert.match(html,/ffr-build" content="audit(3[89]|40)-[a-z0-9-]+"/);
 assert.doesNotMatch(html,/audit37-guided-lift/);
});

test('Wonder P1 scene lifts cover cert feed, board sequence and constrained fade',()=>{
 assert.match(css,/audit38/);
 assert.match(app,/cert-recv-feed|cert-recv-trace/);
 assert.match(app,/board-sequence-spine/);
 assert.match(app,/proposal-sequence-line/);
 assert.match(app,/path-fade-constrained/);
 assert.match(app,/shock-hatch-sweep/);
 assert.match(app,/far-silhouette/);
 assert.match(app,/OFFLINE-ADJACENT · two online cells/);
 assert.match(app,/UNTRACKED UNTIL APPROVAL · Awaiting approval/);
 assert.match(css,/cert-recv-flow|shock-hatch-sweep|proposal-sequence-line/);
 assert.match(html,/EVIDENCE ·/);
});

test('cascade OFFLINE status keeps counts and intensified CSS spine',()=>{
 assert.match(cascadeCss,/audit38/);
 assert.match(cascadeCss,/repeating-linear-gradient\(90deg,#56ff9a00/);
 assert.equal(departmentStatus({recovered:false,active:true,offlineCount:40,runningCount:0,members:40,hit:true}),'OFFLINE · 40');
 assert.equal(departmentStatus({recovered:false,active:true,offlineCount:120,runningCount:0,members:120,hit:true}),'OFFLINE · 120');
 assert.match(departmentStatus({recovered:false,active:true,offlineCount:12,runningCount:88,members:100,hit:true}),/OFF 12\/100/);
});

test('README cascade caption enlarges three judge signals',()=>{
 assert.match(readme,/font-size:2[48]px/);
 assert.match(readme,/Emerald mills → lathes|emerald mills → lathes/i);
 assert.match(readme,/Silver × OFFLINE|silver × OFFLINE/i);
 assert.match(readme,/Live counters|lost hours/i);
 assert.match(hackathonReadme,/font-size:22px/);
 assert.match(hackathonReadme,/live counters/);
 assert.match(readme,/\*\*Live demo:\*\*/);
 assert.match(readme,/The Britt/);
 assert.doesNotMatch(readme,/127\.0\.0\.1/);
});

test('The Britt investigates heading stays exact',()=>{
 assert.match(html,/The Britt investigates\./);
 assert.doesNotMatch(html,/(?<!The )Britt investigates/);
});
