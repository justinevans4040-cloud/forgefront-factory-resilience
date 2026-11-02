import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeAnalysis} from '../../public/factory-layout.mjs';

const gate=readFileSync(new URL('../../scripts/visual-audit-gate.mjs',import.meta.url),'utf8');
const geometry=readFileSync(new URL('../../scripts/layout-geometry.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const pkg=readFileSync(new URL('../../package.json',import.meta.url),'utf8');

test('summarizeAnalysis keeps short copy and truncates long recovery analysis',()=>{
 assert.deepEqual(summarizeAnalysis('Short finding.'),{summary:'Short finding.',truncated:false,full:'Short finding.'});
 const long='Certificate quantity one hundred twenty does not match receiving count eighty. Use the calculated substitute path after human review. Waiting keeps the hold while verified substitute recovers capacity across the affected cells without inventing stock.';
 const result=summarizeAnalysis(long,160);
 assert.equal(result.truncated,true);
 assert.ok(result.summary.endsWith('…'));
 assert.ok(result.summary.length<=170);
 assert.equal(result.full,long.replace(/\s+/g,' ').trim());
});

test('visual audit gate walks guided steps at three desktop viewports and fails on clipping',()=>{
 assert.match(gate,/1366/);
 assert.match(gate,/1536/);
 assert.match(gate,/1920/);
 assert.match(gate,/measureLayout/);
 assert.match(gate,/borderThroughText/);
 assert.match(gate,/bareBritt/);
 assert.match(gate,/railClip/);
 assert.match(gate,/visualAuditGate/);
 assert.match(pkg,/"audit:visual"/);
});

test('geometry harness detects border-through-text, rail overflow and bare Britt',()=>{
 assert.match(geometry,/borderThroughText/);
 assert.match(geometry,/railClip/);
 assert.match(geometry,/bareBritt/);
 assert.match(geometry,/stageClip/);
});

test('investigation findings use Read full analysis modal and keep The Britt heading',()=>{
 assert.match(html,/<h2>The Britt investigates\.<\/h2>/);
 assert.match(html,/id="read-full-analysis"/);
 assert.match(html,/id="analysis-dialog"/);
 assert.match(app,/summarizeAnalysis/);
 assert.match(app,/read-full-analysis/);
 assert.match(css,/read-full-analysis/);
 assert.match(css,/border-left:4px solid #A8F04A/);
 assert.match(css,/investigation-extra\{display:none/);
});
