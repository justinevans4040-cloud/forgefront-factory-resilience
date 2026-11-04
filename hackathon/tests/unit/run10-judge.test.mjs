import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {publicFiles} from '../../scripts/public-set.mjs';

test('public evidence keeps newest numbered run and shared evidence, excluding all backups',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-scope-'));
 for(const dir of ['run4','run8','run9','run10','run11','api-smoke','browser','investigation','build-checks']){mkdirSync(join(root,'hackathon','evidence',dir),{recursive:true});writeFileSync(join(root,'hackathon','evidence',dir,'proof.txt'),'synthetic');writeFileSync(join(root,'hackathon','evidence',dir,'proof.BAK'),'backup');}
 const files=publicFiles(root);assert.ok(files.includes('hackathon/evidence/run11/proof.txt'));assert.ok(files.includes('hackathon/evidence/api-smoke/proof.txt'));assert.ok(files.includes('hackathon/evidence/build-checks/proof.txt'));assert.equal(files.some(f=>/run(?:4|8|9|10)\//.test(f)),false);assert.equal(files.some(f=>/\.bak$/i.test(f)),false);
});
test('all public document links remain inside the exact public set',async()=>{
 const {checkPublicLinks}=await import('../../scripts/judge-check.mjs');assert.deepEqual(checkPublicLinks(),[]);
 const root=mkdtempSync(join(tmpdir(),'ffr-links-'));mkdirSync(join(root,'hackathon'));writeFileSync(join(root,'README.md'),'[absent](hackathon/absent.md)');assert.equal(checkPublicLinks({root}).length,1);
});
test('both judge introductions expose current entry links and keep setup in the guide',async()=>{
 const {checkJudgePitch}=await import('../../scripts/judge-check.mjs');
 for(const file of ['../../../README.md','../../README.md'])assert.deepEqual(checkJudgePitch(readFileSync(new URL(file,import.meta.url),'utf8')),[]);
 const guide=readFileSync(new URL('../../RUN_GUIDE.md',import.meta.url),'utf8');assert.match(guide,/^##\s+.*local/im);assert.match(guide,/npm run demo --prefix hackathon/);
});

test.skip('historical prior UI: live wait displays bounded budget and explicit retry',()=>{
 assert.match(investigationStatus({phase:'running',elapsedMs:15000,route:'Muse Wonder'}),/45s remaining/);
 assert.match(investigationStatus({phase:'running',elapsedMs:70000}),/0s remaining/);
 assert.match(investigationStatus({phase:'failed'}),/No replacement.*retry explicitly/);
});
test('provider preflight uses fallback key, reports all routes and never echoes credentials',async()=>{
 const {checkProviders}=await import('../../scripts/provider-check.mjs');let calls=0;
 const env={MODEL_API_KEY:'synthetic-private-wonder',BASETEN_API_KEY:'synthetic-private-baseten',FIREWORKS_API_KEY:'synthetic-private-fireworks'};
 const fetchImpl=async(url,options)=>{calls++;const b=JSON.parse(options.body);const prompt=b.input??b.messages[0].content;const nonce=prompt.match(/SMOKE_OK_[a-f0-9]+/)[0];return new Response(JSON.stringify(b.input?{model:b.model,output_text:nonce}:{model:b.model,choices:[{message:{content:nonce}}]}));};
 const result=await checkProviders({includeBackup:true,env,fetchImpl});assert.equal(calls,3);assert.equal(result.passed,true);assert.ok(result.providers.every(p=>p.light==='GREEN'));for(const value of Object.values(env))assert.ok(!JSON.stringify(result).includes(value));
 const missing=await checkProviders({env:{},fetchImpl:()=>{throw Error('must not call');}});assert.equal(missing.passed,false);assert.ok(missing.providers.every(p=>p.light==='RED'));
 const backupOnly=await checkProviders({env:{MODEL_API_KEY:'synthetic-private-wonder',BASETEN_API_KEY:'synthetic-private-baseten'},fetchImpl});assert.equal(backupOnly.passed,true);assert.equal(backupOnly.providers.find(p=>p.provider==='spark-fireworks').light,'RED');assert.match(backupOnly.policy,/optional backup/i);
});
test('provider preflight timeout and HTTP errors stay red with one attempt per route',async()=>{
 const {checkProviders}=await import('../../scripts/provider-check.mjs');const env={MUSE_API_KEY:'synthetic',BASETEN_API_KEY:'synthetic',FIREWORKS_API_KEY:'synthetic'};let calls=0;
 const fetchImpl=async(url,{signal})=>{calls++;if(url.includes('meta.ai'))return new Response('{}',{status:429});return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('controlled deadline'),{name:'AbortError'})),{once:true}));};
 const result=await checkProviders({includeBackup:true,env,fetchImpl,timeoutMs:10});assert.equal(calls,3);assert.equal(result.passed,false);assert.ok(result.providers.every(p=>p.light==='RED'));assert.match(result.providers[0].reason,/HTTP 429/);assert.ok(result.providers.slice(1).every(p=>p.reason.includes('deadline')));
});

test.skip('historical prior UI: contrast calculation checks the former palette',async()=>{
 const {contrastRatio}=await import('../../public/accessibility.mjs');
 assert.equal(contrastRatio([0,0,0],[255,255,255]),21);
 assert.equal(contrastRatio([100,100,100],[100,100,100]),1);
 assert.ok(contrastRatio([174,187,174],[16,21,20])>=4.5);
 assert.ok(contrastRatio([218,251,154],[25,33,30])>=3);
 assert.throws(()=>contrastRatio([NaN,0,0],[0,0,0]));
});

test('owner-bound running job exposes only call timing and preserves single failure evidence',async()=>{
 const {createWorkflow}=await import('../../src/workflow.mjs');const {randomBytes}=await import('node:crypto');
 const directory=mkdtempSync(join(tmpdir(),'ffr-progress-'));const workflow=createWorkflow({directory,key:randomBytes(32).toString('hex')});let stop;
 const client={mode:'live',sample:false,route:{model:'verified-meta',provider:'controlled'},complete:()=>new Promise((resolve,reject)=>{stop=()=>reject(Object.assign(Error('private response'),{name:'AbortError'}));})};
 const {jobId}=workflow.startInvestigation(client,'owner');const waiting=workflow.investigationStatus(jobId,'owner');
 assert.equal(waiting.call.number,1);assert.equal(waiting.call.status,'waiting');assert.ok(waiting.call.remainingMs<=60000&&waiting.call.remainingMs>=0);assert.throws(()=>workflow.investigationStatus(jobId,'other'));
 stop();for(let i=0;i<20&&workflow.investigationStatus(jobId,'owner').status==='running';i++)await new Promise(r=>setTimeout(r,10));
 const done=workflow.investigationStatus(jobId,'owner');assert.equal(done.call.status,'stopped');assert.equal(done.result.calls.length,1);assert.equal(done.result.narrative,'');assert.equal(done.result.calls[0].failure,'MODEL_TIMEOUT');assert.ok(!JSON.stringify(done).includes('private response'));
});
test.skip('historical prior UI: per-call countdown distinguishes request and overall waits',()=>{
 const text=investigationStatus({phase:'running',elapsedMs:15000,call:{number:2,status:'waiting',remainingMs:32000,timeoutMs:47000}});
 assert.match(text,/Call 2.*32s remaining.*47s timeout/);assert.match(text,/Wonder can retry once/);
});

test('offline keyboard checks cannot inherit live provider access or guided live gates',async()=>{
 const {browserOptions}=await import('../../scripts/browser-options.mjs');
 assert.deepEqual(browserOptions(['--keyboard'],{FFR_LIVE_BROWSER:'1'}),{keyboardOnly:true,liveBrowser:false,guided:false,mobileFlow:false});
 assert.equal(browserOptions(['--live','--guided','--mobile'],{}).liveBrowser,true);
 assert.throws(()=>browserOptions(['--keyboard','--live'],{}),/Offline keyboard/);
 assert.throws(()=>browserOptions(['--keyboard','--guided'],{}),/Offline keyboard/);
});

test('judge-facing README pitches expose current entry links and keep setup in the guide',async()=>{
 const {checkJudgePitch}=await import('../../scripts/judge-check.mjs');
 for(const file of ['../../../README.md','../../README.md']){
  const s=readFileSync(new URL(file,import.meta.url),'utf8');
  assert.doesNotMatch(s,/Run locally/);assert.match(s,/Run it yourself/);
  assert.deepEqual(checkJudgePitch(s),[]);
 }
});

test('path scrub covers current numbered evidence including the newest public run',async()=>{
 const {fileURLToPath}=await import('node:url');
 const {readFileSync}=await import('node:fs');
 const repo=fileURLToPath(new URL('../../../',import.meta.url));
 const files=publicFiles(repo);
 const newest=Math.max(...files.map(f=>Number(f.match(/evidence\/run(\d+)\//)?.[1]??0)));assert.ok(newest>=12);assert.ok(files.some(f=>f.startsWith('hackathon/evidence/run'+newest+'/')));
 assert.ok(files.includes('hackathon/evidence/README.md'));
 const {auditPublicFiles}=await import('../../scripts/judge-check.mjs');
 const findings=auditPublicFiles().findings.filter(f=>f.file.startsWith('hackathon/evidence/run'+newest+'/')&&(f.kind==='profile'||f.kind==='fileUrl'||f.kind==='mirror'));
 assert.deepEqual(findings,[]);
 const run12Text=files.filter(f=>f.startsWith('hackathon/evidence/run12/')&&/\.(txt|json|md)$/i.test(f));
 for(const file of run12Text){
  const text=readFileSync(new URL('../../../'+file,import.meta.url),'utf8');
  assert.doesNotMatch(text,/C:[\\/]+Users/i);
  assert.doesNotMatch(text,/file:\/\/\/C:\//i);
  assert.doesNotMatch(text,new RegExp(['Iz','zy_'].join('')));
 }
 const {existsSync}=await import('node:fs');
 const reportName=['CO','DEX','_BUILD_RUN12_REPORT.md'].join('');
 const reportUrl=new URL('../../../'+reportName,import.meta.url);
 if(existsSync(reportUrl)){
  const report=readFileSync(reportUrl,'utf8');
  assert.doesNotMatch(report,/C:[\\/]+Users/i);
  assert.doesNotMatch(report,/file:\/\/\/C:\//i);
  assert.doesNotMatch(report,new RegExp(['Iz','zy_'].join('')));
 }
 const profile=['C:','Users','synthetic-owner'].join('\\');
 assert.match(profile,/C:[\\/]+Users/i);
 assert.match(['file:','','','C:/tmp'].join('/'),/file:\/\/\/C:\//i);
});
