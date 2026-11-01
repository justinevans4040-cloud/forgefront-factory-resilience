import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('judge UI opens confidently and keeps offline Sample explicit',()=>{
 const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
 assert.match(html,/Start guided recovery/);assert.match(html,/Sample · offline walkthrough; no live AI/);assert.match(html,/Check selected route/);
 assert.doesNotMatch(html,/ADVISORY ONLY|ILLUSTRATIVE COSTS|OPERATIONAL RELEASE|unvalidated advisory|Start guided synthetic/i);
 const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');assert.match(app,/Recovery decision accepted/);assert.doesNotMatch(app,/Operational release remains false/);
});
test('route health expires and guidance never selects a replacement route',async()=>{
 const {routeHealthView}=await import('../../public/route-health.mjs');
 const health={baseten:{light:'RED',reason:'HTTP 503',checkedAt:1000},wonder:{light:'GREEN',reason:'Nonce and identity matched',checkedAt:1000}};
 const red=routeHealthView('baseten',health,2000);assert.match(red.message,/RED.*503/);assert.match(red.message,/Wonder.*GREEN/);assert.equal(red.light,'RED');
 assert.equal(routeHealthView('wonder',health,902000).light,'UNCHECKED');assert.equal(routeHealthView('sample',health,2000).light,'OFFLINE');
 assert.match(routeHealthView('fireworks',health,2000).message,/Check selected route/);
});

test('completed investigation presents a reviewable success and keeps wait copy concise',async()=>{
 const {investigationStatus}=await import('../../public/investigation-status.mjs');
 assert.match(investigationStatus({phase:'complete'}),/Ready for review/);
 const waiting=investigationStatus({phase:'running',elapsedMs:15000,call:{number:2,status:'waiting',remainingMs:30000,timeoutMs:45000}});assert.ok(waiting.length<300);assert.match(waiting,/Call 2/);
});

test('calculated option copy and offline narrative describe the recovery in product language',async()=>{
 const {buildDemoScenarioInput,createSnapshot}=await import('../../src/domain/scenario.mjs');const {analyzeSnapshot}=await import('../../src/domain/engine.mjs');const {createSampleClient}=await import('../../src/models/sample.mjs');const {buildInvestigationSystemPrompt}=await import('../../src/agent/prompts.mjs');
 const snapshot=createSnapshot(buildDemoScenarioInput()),analysis=analyzeSnapshot(snapshot);
 const copy=analysis.recovery.options.flatMap(o=>[...(o.assumptions??[]),...o.constraints]).join(' ');assert.doesNotMatch(copy,/illustrative|synthetic demo|OEM quotes/i);
 const sample=await createSampleClient().complete({analysis});assert.doesNotMatch(sample.text,/finishHours=|incrementalCostUsd=/);assert.match(sample.text,/83 hours/);assert.equal(sample.sample,true);
 assert.match(buildInvestigationSystemPrompt({snapshotDigest:snapshot.snapshotDigest,label:snapshot.label}),/Write concise, confident recovery language/);
});
