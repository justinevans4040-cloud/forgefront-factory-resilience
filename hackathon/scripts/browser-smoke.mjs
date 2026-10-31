import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { verifyCheckpoint } from '../src/packet.mjs';
import { createApp } from '../server.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=75000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await delay(100);}throw new Error('Timed out: '+label);}
const binaries=[process.env.CHROME_PATH,...[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(p=>[join(p,'Google','Chrome','Application','chrome.exe'),join(p,'Microsoft','Edge','Application','msedge.exe')])];
const binary=binaries.find(p=>p&&existsSync(p));if(!binary)throw new Error('Browser unavailable; smoke cannot pass');
const scratch=mkdtempSync(join(tmpdir(),'ffr-ui-smoke-'));const token=randomBytes(24).toString('hex');
const auditorToken=randomBytes(24).toString('hex');
const timeoutCheck=process.argv.includes('--timeout-check');let controlledCalls=0;
const app=createApp({models:{fetchImpl:timeoutCheck?async()=>{controlledCalls++;throw Object.assign(Error('controlled timeout'),{name:'AbortError'});}:globalThis.fetch,env:{...process.env,HACKATHON_OPERATORS_JSON:JSON.stringify([{id:'judge-auditor',role:'auditor',token:auditorToken}]),HACKATHON_ADMIN_TOKEN:token,HACKATHON_LEDGER_KEY:randomBytes(32).toString('hex'),HACKATHON_STATE_DIR:join(scratch,'state')}}});
const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
const browser=spawn(binary,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+join(scratch,'browser'),'about:blank'],{stdio:'ignore',windowsHide:true});
let ws;const errors=[];const checks=[];

const guided=process.argv.includes('--guided');
const mobileFlow=process.argv.includes('--mobile');
const liveBrowser=process.env.FFR_LIVE_BROWSER==='1'||process.argv.includes('--live');
const output=new URL('../evidence/run7/'+(mobileFlow?'browser-mobile/':liveBrowser?'browser/':'browser-offline/'),import.meta.url);mkdirSync(output,{recursive:true});
function save(name,contents){const file=new URL(name,output);if(existsSync(file))copyFileSync(file,new URL(name+'.bak',output));writeFileSync(file,contents);}
try{
 const portFile=join(scratch,'browser','DevToolsActivePort');await until(()=>existsSync(portFile),'browser launch',15000);const port=Number(readFileSync(portFile,'utf8').split('\n')[0]);
 const tabs=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve);ws.addEventListener('error',reject);});
 let next=0;const pending=new Map();ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')errors.push('Uncaught browser exception');if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push('Browser console error');if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry.text);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error('Browser evaluation failed');return r.result?.value;};
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const value=(selector,value)=>evaluate(`document.querySelector(${JSON.stringify(selector)}).value=${JSON.stringify(value)}`);
 await send('Runtime.enable');await send('Page.enable');await send('Log.enable');await send('Emulation.setDeviceMetricsOverride',{width:mobileFlow?390:1440,height:mobileFlow?844:1050,deviceScaleFactor:1,mobile:mobileFlow});await send('Page.navigate',{url:base});await until(()=>evaluate(`!!document.querySelector('#admin')`),'login');
 assert.equal(await evaluate('document.title'),'ForgeFront · Recovery room');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await evaluate(`document.activeElement.className`),'skip');checks.push('keyboard skip link');
 await value('#admin',token);await click('#login button');await until(()=>evaluate(`!document.querySelector('#room').hidden`),'authenticated room');checks.push('explicit authentication');
 assert.equal(await evaluate(`!!document.querySelector('#encrypted-export')`),true);
 assert.equal(await evaluate(`document.querySelector('#plaintext-options').open`),false);
 await value('#export-passphrase','synthetic smoke passphrase');await evaluate(`document.querySelector('#export-passphrase').dispatchEvent(new Event('input'))`);assert.ok(await evaluate(`document.querySelector('#passphrase-feedback').textContent.includes('meets')`));await click('#encrypted-export');await until(()=>evaluate(`document.querySelector('#notice').textContent.includes('Encrypted evidence packet exported')`),'encrypted export');assert.equal(await evaluate(`document.querySelector('#export-passphrase').value`),'');checks.push('default encrypted export without plaintext acknowledgement');
 await evaluate(`document.querySelector('#plaintext-options').open=true`);
 assert.equal(await evaluate(`document.querySelector('#plaintext-ack').checked`),false);assert.equal(await evaluate(`document.querySelector('#export').disabled&&document.querySelector('#report').disabled`),true);await evaluate(`document.querySelector('#plaintext-ack').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});assert.equal(await evaluate(`document.querySelector('#export').disabled`),false);checks.push('explicit plaintext download gate');
 if(guided){await click('#guide-start');await until(()=>evaluate(`document.querySelector('#guide-title').textContent.includes('Inspect the discrepancy')`),'guided start');await click('#guide-next');assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.includes('Spark Open')`));}
 await evaluate(`document.querySelector('#evidence').parentElement.open=true`);assert.ok(await evaluate(`document.querySelector('#evidence').textContent.includes('120 each')`));checks.push('source inspection');
 const contrast=await evaluate(`(()=>{
 const rgb=s=>[...s.matchAll(/[\\d.]+/g)].map(m=>Number(m[0]));
 const lum=c=>{const a=c.slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const failures=[];let checked=0,minimum=100;
 for(const e of document.querySelectorAll('body *')){
  if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||!e.getClientRects().length||e.closest('button:disabled,option,script,style,svg'))continue;
  const style=getComputedStyle(e);if(style.visibility==='hidden')continue;
  let parent=e,background=null;
  while(parent){const c=rgb(getComputedStyle(parent).backgroundColor);if(c.length===3||c[3]===1){background=c;break;}parent=parent.parentElement;}
  if(!background)continue;
  const measured=ratio(rgb(style.color),background);const required=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&Number(style.fontWeight)>=700)?3:4.5;
  checked++;minimum=Math.min(minimum,measured);if(measured<required)failures.push({tag:e.tagName,id:e.id,ratio:measured,required});
 }
 return {checked,minimum,failures};})()`);assert.deepEqual(contrast.failures,[]);assert.ok(contrast.checked>30);checks.push('visible text contrast measured');

 if(timeoutCheck){await value('#provider','wonder');await click('#investigate');await until(()=>evaluate(`!document.querySelector('#investigate').disabled`),'controlled timeout');assert.equal(controlledCalls,1);assert.ok(await evaluate(`document.querySelector('#notice').textContent.includes('retry explicitly')&&document.querySelector('#trace').textContent.includes('MODEL_TIMEOUT')&&document.querySelector('#narrative').textContent===''`));checks.push('CONTROLLED timeout visibly fails once with empty narrative and explicit retry');}
 const runInvestigation=async provider=>{await value('#provider',provider);await click('#investigate');assert.equal(await evaluate(`document.querySelector('#investigate').getAttribute('aria-busy')`),'true');await until(()=>evaluate(`!document.querySelector('#investigate').disabled`),'investigation '+provider);assert.ok(await evaluate(`document.querySelector('#run-summary').textContent.includes('${provider==='sample'?'SAMPLE_COMPLETE':'MODEL_STOP'}')`));};
 await runInvestigation(liveBrowser?(guided?'baseten':'wonder'):'sample');if(guided){assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.includes('Wonder')`));await runInvestigation('wonder');assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.includes('human decision')`));checks.push('guided live Spark and Wonder on same snapshot');}checks.push('investigation');
 async function approve(){await click('[data-option="allocate_substitute"]');await until(()=>evaluate(`!document.querySelector('#consent').hidden`),'review');const phrase=await evaluate(`document.querySelector('#confirm-phrase').textContent`);await value('#typed',phrase);await click('#confirm');await until(()=>evaluate(`document.querySelector('#decision-state').textContent==='Advisory acceptance recorded'`),'acceptance');}
 await approve();checks.push('typed acceptance');
 await click('#shock');await until(()=>evaluate(`document.querySelector('#decision-state').textContent.includes('Scenario changed')`),'shock invalidation');assert.equal(await evaluate(`document.querySelector('[data-option="split_capacity"]').disabled`),true);checks.push('second shock and stale proposal rejection');
 await runInvestigation(liveBrowser?'wonder':'sample');await approve();checks.push('reinvestigation and fresh acceptance');
 await click('#verify');await until(()=>evaluate(`document.querySelector('#notice').textContent.includes('Ledger verified')`),'ledger');await value('#export-passphrase','synthetic smoke passphrase');await evaluate(`document.querySelector('#export-passphrase').dispatchEvent(new Event('input'))`);assert.ok(await evaluate(`document.querySelector('#passphrase-feedback').textContent.includes('meets')`));await click('#encrypted-export');await until(()=>evaluate(`document.querySelector('#notice').textContent.includes('Encrypted evidence packet exported')`),'export');await evaluate(`document.querySelector('#plaintext-options').open=false`);checks.push('ledger verification and encrypted decision export');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});save('desktop.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(200);assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true);save('mobile.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));checks.push('mobile overflow check');
 const login=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}}).then(r=>r.json());
 const packet=await fetch(base+'/api/workflow/export',{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':login.session,'X-CSRF-Token':login.csrf},body:JSON.stringify({acknowledgePlaintext:'EXPORT PLAINTEXT'})}).then(r=>r.json());assert.equal(packet.decision.status,'accepted');assert.equal(packet.operationalRelease,false);assert.equal(packet.runs.length,(guided?3:2)+(timeoutCheck?1:0));assert.ok(packet.runs.filter(r=>!r.calls.some(c=>c.failure==='MODEL_TIMEOUT')).every(r=>r.proposalValid));save('packet.json',JSON.stringify(packet,null,2));
 const post=action=>fetch(base+'/api/workflow/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':login.session,'X-CSRF-Token':login.csrf},body:JSON.stringify(action==='report'?{acknowledgePlaintext:'EXPORT PLAINTEXT'}:{})}).then(r=>r.json());
 const checkpoint=await post('checkpoint');assert.equal(verifyCheckpoint(packet,checkpoint).ok,true);save('checkpoint.json',JSON.stringify(checkpoint,null,2));const report=await post('report');assert.ok(report.text.includes(packet.snapshot.snapshotDigest));save('report.md',report.text);await click('#checkpoint');await until(()=>evaluate(`!document.querySelector('#checkpoint').disabled`),'checkpoint download');await evaluate(`document.querySelector('#plaintext-options').open=true`);await click('#report');await until(()=>evaluate(`!document.querySelector('#report').disabled`),'readable download');if(guided)assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.includes('Recovery story complete')`));checks.push('independent checkpoint and readable report');
 console.log('Checking reset');await click('#reset');await until(()=>evaluate(`document.querySelector('#decision-state').textContent==='No acceptance recorded'`),'fresh reset');
 assert.equal(await evaluate(`document.querySelector('#model-output').hidden&&document.querySelector('#consent').hidden&&!document.querySelector('#plaintext-ack').checked&&document.querySelector('#export-passphrase').value===''&&document.querySelector('#comparison').children.length===0`),true);checks.push('reset clears stale model, consent, guide and export state');
 console.log('Checking accessibility');const accessibility=await evaluate(`(()=>{const failures=[];for(const e of document.querySelectorAll('input,select,button')){if(!e.getClientRects().length)continue;if(!e.textContent.trim()&&!e.getAttribute('aria-label')&&!document.querySelector('label[for="'+e.id+'"]'))failures.push(e.id||e.tagName);}for(const e of document.querySelectorAll('[tabindex]'))if(Number(e.tabIndex)>0)failures.push('positive tabindex');return {failures,language:document.documentElement.lang,main:document.querySelectorAll('main').length};})()`);
 assert.deepEqual(accessibility.failures,[]);assert.ok(accessibility.language);assert.equal(accessibility.main,1);checks.push('automated visible control names, document language and tab order checks');
 const logoutCookie=(await send('Network.getCookies',{urls:[base]})).cookies.map(c=>c.name+'='+c.value).join('; ');
 await click('#logout');await until(()=>evaluate(`!document.querySelector('#login').hidden`),'logout');
 assert.equal(await evaluate(`document.cookie.includes('ffr_session')`),false);
 assert.equal((await fetch(base+'/api/workflow/status',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':'stale',Cookie:logoutCookie},body:'{}'})).status,401);
 checks.push('HttpOnly session and explicit lock');
 await value('#admin',auditorToken);await click('#login button');await until(()=>evaluate(`!document.querySelector('#room').hidden`),'auditor login');assert.ok(await evaluate(`document.querySelector('#operator-identity').textContent.includes('judge-auditor')`));assert.equal(await evaluate(`document.querySelector('#investigate').disabled&&document.querySelector('#shock').disabled&&document.querySelector('#reset').disabled`),true);assert.equal(await evaluate(`document.querySelector('#export').disabled`),true);await click('#plaintext-ack');assert.equal(await evaluate(`document.querySelector('#export').disabled`),false);await click('#logout');await until(()=>evaluate(`!document.querySelector('#login').hidden`),'auditor logout');checks.push('named auditor UI and read-only controls');
 assert.deepEqual(errors,[]);save('summary.json',JSON.stringify({ok:true,live:liveBrowser,checks,consoleErrors:errors,contrast,accessibility},null,2));console.log(JSON.stringify({ok:true,checks,consoleErrors:errors}));
}finally{ws?.close();browser.kill();await app.close();}
