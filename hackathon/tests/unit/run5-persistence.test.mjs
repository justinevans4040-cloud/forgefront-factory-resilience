import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createWorkflow } from '../../src/workflow.mjs';
import { createModelClient } from '../../src/models/client.mjs';
const key='synthetic-recovery-key';
const fresh=()=>({directory:mkdtempSync(join(tmpdir(),'ffr-run5-')),key});
for(const stage of ['intent','event','anchor'])test('restart rolls forward verified crash after '+stage,()=>{
 const options=fresh();createWorkflow(options).reset();
 const script=`import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
 const stage=${JSON.stringify(stage)};const options=${JSON.stringify(options)};
 const rename=fs.renameSync,append=fs.appendFileSync;
 fs.renameSync=(a,b)=>{rename(a,b);if((stage==='intent'&&String(b).endsWith('intent.json'))||(stage==='anchor'&&String(b).endsWith('anchor.json')))process.exit(73);};
 fs.appendFileSync=(...args)=>{append(...args);if(stage==='event')process.exit(73);};syncBuiltinESMExports();
 const {createWorkflow}=await import(${JSON.stringify(new URL('../../src/workflow.mjs',import.meta.url).href)});createWorkflow(options).shock('CELL-MILL-2');`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'});
 assert.equal(child.status,73,child.stderr);
 const recovered=createWorkflow(options);assert.equal(recovered.status().snapshot.cells.find(c=>c.cellId==='CELL-MILL-2').online,false);
 assert.equal(recovered.verify().count,3);assert.equal(existsSync(join(options.directory,'anchor.json.bak')),false);
 assert.equal(createWorkflow(options).verify().head,recovered.verify().head);
});
test('completed intent cannot authorize truncation and prior anchor restoration',()=>{
 const options=fresh();const w=createWorkflow(options);w.reset();const anchor=readFileSync(join(options.directory,'anchor.json'));const log=readFileSync(join(options.directory,'events.jsonl'));
 w.shock('CELL-MILL-2');writeFileSync(join(options.directory,'anchor.json'),anchor);writeFileSync(join(options.directory,'events.jsonl'),log);
 assert.throws(()=>createWorkflow(options),/LEDGER_TAMPERED/);
});
test('encrypted pending consent survives restart, requires same named identity, expires and stays single-use',async()=>{
 const options=fresh();let tick=1000;options.now=()=>tick;let w=createWorkflow(options);
 const operator={id:'planner',role:'operator'};const r=await w.investigate(createModelClient('sample'),operator);const optionId=r.analysis.recovery.options.find(o=>o.feasible).optionId;
 const e=w.review(r.runId,optionId,'old-session',operator);assert.ok(!readFileSync(join(options.directory,'events.jsonl'),'utf8').includes(e.nonce));
 w=createWorkflow(options);assert.equal(w.status().pendingConsents.length,1);
 assert.throws(()=>w.confirm(e.nonce,`APPROVE ${optionId}`,'new-session',{id:'other',role:'operator'}),/CONSENT/);
 const accepted=w.confirm(e.nonce,`APPROVE ${optionId}`,'new-session',operator);assert.equal(accepted.status,'accepted');assert.ok(w.exportReport().text.includes('Confirmation actor digest: '+accepted.confirmationActor));
 w=createWorkflow(options);assert.equal(w.status().pendingConsents.length,0);assert.throws(()=>w.confirm(e.nonce,`APPROVE ${optionId}`,'new-session',operator),/CONSENT/);
 const e2=w.review(r.runId,optionId,'second-session',operator);tick+=300001;w=createWorkflow(options);assert.equal(w.status().pendingConsents.length,0);assert.throws(()=>w.confirm(e2.nonce,`APPROVE ${optionId}`,'third-session',operator),/CONSENT/);
});

test('partial encrypted append recovers only its exact authenticated suffix',()=>{
 const options=fresh();createWorkflow(options).reset();
 const script=`import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';const append=fs.appendFileSync;fs.appendFileSync=(path,line,options)=>{append(path,line.slice(0,Math.floor(line.length/2)),options);process.exit(73);};syncBuiltinESMExports();const {createWorkflow}=await import(${JSON.stringify(new URL('../../src/workflow.mjs',import.meta.url).href)});createWorkflow(${JSON.stringify(options)}).shock('CELL-MILL-2');`;
 assert.equal(spawnSync(process.execPath,['--input-type=module','-e',script]).status,73);
 assert.equal(createWorkflow(options).status().snapshot.cells.find(c=>c.cellId==='CELL-MILL-2').online,false);
});
test('corrupt intent fails closed rather than resetting or repairing history',()=>{
 const options=fresh();createWorkflow(options).reset();const intent=join(options.directory,'intent.json');writeFileSync(intent,'{}');assert.throws(()=>createWorkflow(options),/LEDGER_TAMPERED/);
});
