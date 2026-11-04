import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../../public/',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const kit=read('ui/kit.mjs');
const screens=['incident','findings','decision','britt-replan','disrupt','evidence','shop','settings'];
test('current router resolves every screen, source module and theme with no browser Node imports or inline executable handlers',()=>{
 assert.deepEqual([...kit.matchAll(/id: '([^']+)', label:/g)].map(m=>m[1]),screens);
 for(const file of readdirSync(new URL('ui/',root)).filter(f=>f.endsWith('.mjs'))){
  const source=read('ui/'+file);assert.doesNotMatch(source,/Â|â€|�/,file+' invalid text encoding');assert.doesNotMatch(source,/(?:from|import)\s*[(]?\s*['"]node:/,file);assert.doesNotMatch(source,/\son[a-z]+=|eval\s*\(|new Function\s*\(/,file);
  const checked=spawnSync(process.execPath,['--check',fileURLToPath(new URL('ui/'+file,root))],{encoding:'utf8',windowsHide:true});assert.equal(checked.status,0,file+checked.stderr);
 }
 for(const id of screens){assert.ok(existsSync(new URL(`ui/screen-${id}.css`,root)));assert.match(read(`ui/screen-${id}.mjs`),/export (?:async )?function render/);}
});
test('unknown and missing amounts never become zero while recorded zero remains valid',()=>{
 for(const [name,pending] of [['fmtHours','time pending'],['fmtMoney','cost pending']]){
  const source=kit.split(`const ${name} = (value) => {`)[1].split('\n};')[0];
  const format=runInNewContext(`(value)=>{${source}}`,{Intl,Number,String,Math});
  for(const value of [null,undefined,'',NaN,Infinity])assert.equal(format(value),pending,`${name}(${String(value)})`);
  assert.equal(format(0),name==='fmtHours'?'0h':'$0');assert.equal(format(26),name==='fmtHours'?'26h':'$26');
 }
});
test('human authorization uses server review then nonce confirmation and no feasible option is invented',()=>{
 const decision=read('ui/screen-decision.mjs');assert.match(decision,/\/api\/workflow\/review/);assert.match(decision,/\/api\/workflow\/confirm/);assert.match(decision,/nonce: envelope.nonce/);assert.match(decision,/option.feasible === false/);assert.match(decision,/Cannot run/);
 const incident=read('ui/screen-incident.mjs');assert.match(incident,/option.feasible \? fmtHours/);assert.match(incident,/Not covered/);assert.match(incident,/provider: kit.state.modelProvider/);assert.match(incident,/Sample · deterministic, no live AI/);assert.match(kit,/modelProvider: 'baseten'/);
});
test('disruption is a real server mutation and evidence verifies the ledger before checkpoint or encrypted export',()=>{
 const disrupt=read('ui/screen-disrupt.mjs');assert.match(disrupt,/\/api\/workflow\/shock/);assert.match(disrupt,/\/api\/workflow\/investigation-start/);assert.match(disrupt,/replanChoice = null/);
 const evidence=read('ui/screen-evidence.mjs');for(const route of ['verify','checkpoint','encrypted-export'])assert.ok(evidence.includes('/api/workflow/'+route));assert.match(evidence,/if \(!verified.ok\)/);assert.match(evidence,/type="password"/);assert.doesNotMatch(evidence,/acknowledgePlaintext/);
});
test('current public UI labels demo and sample boundaries and retains exact source identities',()=>{
 assert.match(kit,/Demo scenario data/);assert.match(kit,/no operational release/);assert.match(kit,/alt="ForgeFront Systems"/);assert.match(read('index.html'),/ForgeFront Factory Resilience/);
 for(const screen of ['incident','findings','evidence']){const source=read(`ui/screen-${screen}.mjs`);assert.match(source,/documentId|\.doc\b/);assert.match(source,/recordId|\.record\b/);}
 assert.match(read('ui/theme.css'),/@media \(prefers-reduced-motion: reduce\)/);
});

test('offline cells expose zero open hours without rewriting recorded capacity',()=>{
 const method=kit.split('openCellHours(cell) {')[1].split('},')[0];
 const open=runInNewContext(`(cell)=>{${method}}`);
 const offline={online:false,availableHours:24},online={online:true,availableHours:40};
 assert.equal(open(offline),0);assert.equal(offline.availableHours,24);assert.equal(open(online),40);
});

test('shared refresh fetches one authoritative workflow and caches the reference plant',()=>{
 const source=kit.slice(kit.indexOf('async function refreshData'),kit.indexOf('async function loadTools'));
 assert.match(source,/state.analysis = workflow.analysis/);assert.match(source,/state.scenario = workflow.snapshot/);
 assert.match(source,/!state.plant \|\| options.refreshPlant === true/);
 assert.doesNotMatch(source,/api.get\('\/api\/(scenario|analysis)'\)/);
});
