// Current eight-screen browser regression. Default run uses explicit Sample with zero provider requests.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {createApp} from '../server.mjs';
import {cleanupSmokeScratch} from './smoke-cleanup.mjs';
import {browserOptions} from './browser-options.mjs';
const publicHosting=process.argv.includes('--public-hosting');
const options=browserOptions(process.argv,{...process.env,FFR_LIVE_BROWSER:''});
if(options.liveBrowser)throw Error('Live provider smoke requires a separate explicitly authorized session; this regression is deterministic Sample only.');
const binaries=[process.env.CHROME_PATH,...[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(p=>[join(p,'Google','Chrome','Application','chrome.exe'),join(p,'Microsoft','Edge','Application','msedge.exe')])];
const binary=binaries.find(p=>p&&existsSync(p));if(!binary)throw Error('Chrome or Edge unavailable; browser regression cannot pass.');
const scratch=mkdtempSync(join(tmpdir(),'ffr-ui-smoke-'));
const output=resolve(process.env.FFR_SMOKE_OUTPUT||mkdtempSync(join(tmpdir(),'ffr-browser-evidence-')));mkdirSync(output,{recursive:true});
let providerCalls=0;
const app=createApp({...(publicHosting?{publicHosting:{}}:{}),models:{env:{HACKATHON_DEMO_MODE:'1',HACKATHON_STATE_DIR:join(scratch,'state'),HACKATHON_LEDGER_KEY:randomBytes(32).toString('hex'),HACKATHON_ADMIN_TOKEN:randomBytes(24).toString('hex')},fetchImpl:async()=>{providerCalls++;throw Error('Provider access prohibited during Sample browser regression');}}});
const address=await app.listen(0),base=`http://127.0.0.1:${address.port}`;
const browser=spawn(binary,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+join(scratch,'browser'),'about:blank'],{stdio:'ignore',windowsHide:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await delay(100);}throw Error('Timed out: '+label);}
let ws,send,evaluate;const checks=[],errors=[],requests=[],layouts=[];let keyboardActions=0;
const save=(name,value)=>writeFileSync(join(output,name),typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,2));
try {
 const portFile=join(scratch,'browser','DevToolsActivePort');await until(()=>existsSync(portFile),'browser launch');
 const port=Number(readFileSync(portFile,'utf8').split('\n')[0]);
 const tabs=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve);ws.addEventListener('error',reject);});
 let id=0;const pending=new Map();
 ws.addEventListener('message',({data})=>{
  const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(v=>v.value||v.description).join(' '));
  if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry.text);
  if(m.method==='Network.responseReceived'&&m.params.response.url.startsWith(base+'/api/'))requests.push({path:new URL(m.params.response.url).pathname,status:m.params.response.status});
 });
 send=(method,params={})=>new Promise((resolve,reject)=>{const call=++id;const timer=setTimeout(()=>{pending.delete(call);reject(Error('CDP timeout '+method));},15000);pending.set(call,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:call,method,params}));});
 evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;};
 const press=async(key,code,virtual,extra={})=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtual,...extra});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtual});};
 const tabTo=async selector=>{for(let i=0;i<160;i++){if(await evaluate(`document.activeElement===document.querySelector(${JSON.stringify(selector)})`)){assert.ok(await evaluate(`(()=>{const s=getComputedStyle(document.activeElement);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=2;})()`),'visible focus '+selector);return;}await press('Tab','Tab',9);}throw Error('Keyboard cannot reach '+selector);};
 const click=async selector=>{assert.ok(await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`),'control exists '+selector);if(options.keyboardOnly){await tabTo(selector);await press('Enter','Enter',13,{text:'\r'});keyboardActions++;}else await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);};
 const screen=async id=>{await click(`[data-step="${id}"]`);await until(()=>evaluate(`document.querySelector('#screenRoot')?.dataset.screen===${JSON.stringify(id)}&&!!document.querySelector('#screenRoot h1')`),'screen '+id);await delay(200);};
 const status=()=>evaluate(`(async()=>{const {kit}=await import('/ui/kit.mjs');return ${publicHosting?'kit.state.workflow':'kit.api.workflowStatus()'};})()`);
 const screenshot=async name=>save(name,Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
 const auditLayout=async(label)=>{const result=await evaluate(`(()=>{const failures=[];const ids=new Set();for(const e of document.querySelectorAll('[id]')){if(ids.has(e.id))failures.push('duplicate id '+e.id);ids.add(e.id);}for(const e of document.querySelectorAll('[aria-labelledby],[aria-describedby]'))for(const attr of ['aria-labelledby','aria-describedby'])for(const id of (e.getAttribute(attr)||'').split(/ +/).filter(Boolean))if(!document.getElementById(id))failures.push('missing aria target '+id);for(const e of document.querySelectorAll('button,input,select')){if(!e.getClientRects().length||e.closest('[hidden]'))continue;if(!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.labels?.length)failures.push('unnamed '+e.tagName);}for(const e of document.querySelectorAll('[tabindex]'))if(e.tabIndex>0)failures.push('positive tabindex');const r=document.querySelector('#screenRoot');return {failures,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,screenWidth:r.clientWidth,screenScrollWidth:r.scrollWidth,main:document.querySelectorAll('main').length,language:document.documentElement.lang};})()`);layouts.push({label,...result});assert.deepEqual(result.failures,[],label);assert.equal(result.main,1);assert.equal(result.language,'en');assert.ok(result.scrollWidth<=result.width+1,label+' document overflow');assert.ok(result.screenScrollWidth<=result.screenWidth+1,label+' screen overflow');};
 await send('Runtime.enable');await send('Log.enable');await send('Page.enable');await send('Network.enable');
 await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:join(output,'downloads')});
 await send('Emulation.setDeviceMetricsOverride',{width:options.mobileFlow?390:1920,height:options.mobileFlow?844:1080,deviceScaleFactor:1,mobile:options.mobileFlow});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Page.navigate',{url:base});
 await until(()=>evaluate(`document.querySelector('#dataStatus')?.textContent.includes('connected')`),'current incident data');
 assert.match(await evaluate('document.title'),/ForgeFront Factory Resilience/);assert.match(await evaluate('document.body.innerText'),/Demo scenario data/);
 await screenshot('incident.png');
 if(!publicHosting){for(const id of ['shop','settings']){await screen(id);await screenshot(id+'.png');}await screen('incident');}
 const initial=await status();assert.equal(initial.operationalRelease,false);checks.push('current strict-CSP shell and deterministic server data');
 const constrained=await evaluate(`[...document.querySelectorAll('.option-card.is-infeasible')].map(e=>e.innerText)`);for(const text of constrained){assert.match(text,/Cannot run/);assert.doesNotMatch(text,/Finish0h|Covers100 pieces/);}checks.push('infeasible options do not claim zero finish or complete coverage');
 await click('#evidenceList [data-evidence]');await until(()=>evaluate(`document.querySelector('#kitDialog')?.open`),'source record');assert.match(await evaluate(`document.querySelector('#kitDialog').innerText`),/Document|Record/);await click('#kitDialog [data-dialog-action="0"]');checks.push('source record opens exact document and record identity');
 await click('#modelProvider');if(options.keyboardOnly){await press('End','End',35);await press('Enter','Enter',13);}else await evaluate(`(()=>{const s=document.querySelector('#modelProvider');s.value='sample';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 assert.equal(await evaluate(`document.querySelector('#modelProvider').value`),'sample');
 await click('#primaryButton');await until(()=>evaluate(`document.querySelector('#screenRoot')?.dataset.screen==='findings'`),'Sample findings');
 const investigated=await status();assert.ok(investigated.runs.some(r=>r.proposalValid&&r.run.sample));checks.push('explicit Sample investigation completes with a validated server run');await screenshot('findings.png');
 await click('#screenRoot [data-primary]');await until(()=>evaluate(`document.querySelector('#screenRoot')?.dataset.screen==='decision'`),'Decision');
 await screenshot('decision.png');assert.ok(await evaluate(`Boolean(document.querySelector('[data-dec-authorize]'))`));await click('[data-dec-authorize]');
 await until(()=>evaluate(`document.querySelector('#kitDialog')?.open`),'authorize wall');await screenshot('authorize.png');assert.notEqual((await status()).decision.status,'accepted');
 await click('#kitDialog [data-dialog-action="0"]');assert.notEqual((await status()).decision.status,'accepted');checks.push('cancel authorization preserves unaccepted state');
 await click('[data-dec-authorize]');await click('#kitDialog [data-dialog-action="1"]');await until(()=>evaluate(`document.querySelector('#screenRoot')?.dataset.screen==='britt-replan'`),'authorized task screen');
 const accepted=await status();assert.equal(accepted.decision.status,'accepted');assert.equal(accepted.operationalRelease,false);assert.equal(accepted.board.tasks.length,0);checks.push('explicit decision authorization records nonce consent without operational release');
 await click('#screenRoot [data-primary]');await until(()=>evaluate(`document.querySelector('#kitDialog')?.open`),'task draft review');assert.equal((await status()).board.tasks.length,0);
 await click('#kitDialog [data-dialog-action="1"]');await until(async()=>((await status()).board.tasks.length>0),'approved board');checks.push('task draft stays untracked until separate human approval');
 await evaluate(`document.querySelectorAll('[data-toast-close]').forEach(e=>e.click())`);await screenshot('the-britt-plan.png');
 await click('#screenRoot [data-primary]');await until(()=>evaluate(`document.querySelector('#screenRoot')?.dataset.screen==='disrupt'`),'Disrupt');
 await click('[data-cell="CELL-MILL-2"]');await screenshot('disrupt.png');await click('#screenRoot [data-primary]');await until(()=>evaluate(`document.querySelector('#screenRoot')?.dataset.screen==='evidence'`),'changed capacity evidence');
 await screenshot('evidence.png');const changed=await status();assert.notEqual(changed.snapshot.snapshotDigest,initial.snapshot.snapshotDigest);assert.notEqual(changed.decision.status,'accepted');assert.ok(changed.board.tasks.every(t=>t.status==='Blocked'||t.status==='Done'));assert.equal(changed.analysis.recovery.options.filter(o=>o.feasible).length,0);checks.push('real second shock invalidates decision and board; fresh analysis has no feasible path');
 if(!publicHosting) for(const id of ['incident','findings','decision','shop']){
  await screen(id);
  const coherence=await evaluate(`(async()=>{const {kit}=await import('/ui/kit.mjs');return {digest:kit.state.workflow.snapshot.snapshotDigest,analysisDigest:kit.state.analysis.snapshotDigest,openHours:kit.state.workflow.snapshot.cells.reduce((sum,c)=>sum+kit.openCellHours(c),0)};})()`);
  assert.equal(coherence.digest,changed.snapshot.snapshotDigest);assert.equal(coherence.analysisDigest,coherence.digest);assert.equal(coherence.openHours,40);
  if(id==='shop')assert.match(await evaluate(`document.querySelector('[data-shop-cell="CELL-MILL-2"]').innerText`),/Offline.*0h open/s);
 }
 if(!publicHosting)checks.push('all post-shock views share the changed digest and 40 online cell hours');
 await screen('decision');assert.equal(await evaluate(`document.querySelectorAll('[data-dec-authorize]').length`),0);assert.match(await evaluate(`document.querySelector('#screenRoot').innerText`),/No runnable path/);checks.push('post-shock no-feasible state blocks fresh authorization');
 await screen('evidence');await click('[data-ev-open]');await until(()=>evaluate(`document.querySelector('#kitDialog')?.open`),'full evidence source');assert.match(await evaluate(`document.querySelector('#kitDialog').innerText`),/Document|Record|Evidence/);await click('#kitDialog [data-dialog-action="0"]');
 await click('[data-ev-export]');await until(()=>evaluate(`!!document.querySelector('#evidencePassphrase')`),'encrypted export dialog');
 if(options.keyboardOnly){await tabTo('#evidencePassphrase');await send('Input.insertText',{text:'Independent sample evidence passphrase'});}else await evaluate(`document.querySelector('#evidencePassphrase').value='Independent sample evidence passphrase'`);
 await click('#kitDialog [data-dialog-action="1"]');await until(()=>evaluate(`!document.querySelector('#kitDialog').open`),'encrypted export');
 await click('[data-ev-primary]');await until(()=>evaluate(`document.querySelector('#screenRoot')?.dataset.screen==='shop'`),'checkpoint and Shop');
 await until(()=>existsSync(join(output,'downloads','forgefront-encrypted-evidence.json'))&&existsSync(join(output,'downloads','forgefront-evidence-checkpoint.json')),'evidence downloads');
 const encrypted=JSON.parse(readFileSync(join(output,'downloads','forgefront-encrypted-evidence.json'),'utf8'));assert.ok(encrypted);assert.ok(!JSON.stringify(encrypted).includes('Independent sample evidence passphrase'));checks.push('verified encrypted full record and independent checkpoint downloaded');
 await evaluate(`document.querySelectorAll('[data-toast-close]').forEach(e=>e.click())`);
 for(const width of publicHosting?[]:[1440,390]){await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});for(const id of ['incident','findings','decision','britt-replan','disrupt','evidence','shop','settings']){await screen(id);await auditLayout(`${id}-${width}`);if(['incident','decision','shop'].includes(id))await screenshot(`${id}-${width}.png`);}}
 if(!publicHosting)checks.push('all eight current screens inspected at desktop and emulated mobile widths');
 if(publicHosting){await auditLayout('public-flow-shop');await delay(250);assert.ok(requests.length<=30,'public judge flow exceeded its 30/min budget: '+requests.length);assert.equal(requests.filter(r=>r.status===429).length,0);checks.push('actual public Sample flow completed under unchanged 30/min request quota with zero 429 responses');}
 assert.equal(providerCalls,0);assert.deepEqual(errors,[]);assert.deepEqual(await evaluate('window.__errs'),[]);assert.ok(requests.every(r=>r.status<400),JSON.stringify(requests.filter(r=>r.status>=400)));
 if(options.keyboardOnly){assert.ok(keyboardActions>=20);checks.push('keyboard-only controls including authorization, task approval and encrypted export');}
 const summary={ok:true,publicHosting,apiRequestCount:requests.length,rateLimitedResponses:requests.filter(r=>r.status===429).length,route:'explicit Sample; zero live model requests',mobile:'Chrome viewport emulation, not physical phone',keyboardOnly:options.keyboardOnly,keyboardActions,providerCalls,checks,consoleErrors:errors,layouts,requests};save('summary.json',summary);console.log(JSON.stringify(summary));
} catch(error) {
 save('failure.json',{ok:false,reason:error.stack,checks,errors,requests,layouts,providerCalls});
 if(send){try{save('failure.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));save('failure-ui.txt',await evaluate('document.body.innerText'));}catch{}}
 console.error(error.stack);process.exitCode=1;
} finally {
 ws?.close();if(browser.exitCode===null){if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch{}}else browser.kill();}
 app.server.closeAllConnections();await app.close();await cleanupSmokeScratch(scratch);console.log('Browser evidence: '+output);
}
