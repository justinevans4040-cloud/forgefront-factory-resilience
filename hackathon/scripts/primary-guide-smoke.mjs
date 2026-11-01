import {cleanupSmokeScratch} from './smoke-cleanup.mjs';
import {browserOptions} from './browser-options.mjs';
import {contrastRatio} from '../public/accessibility.mjs';
import {redactEvidence,writeEvidence,evidenceRun} from './public-evidence.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { verifyCheckpoint } from '../src/packet.mjs';
import { createApp } from '../server.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=75000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await delay(100);}throw new Error('Timed out: '+label);}
const mockLive=process.argv.includes('--mock-live'),baseline=process.argv.includes('--baseline');
const {keyboardOnly,liveBrowser,guided,mobileFlow}=browserOptions([...process.argv,...(mockLive?['--live','--guided']:[])],process.env);
const binaries=[process.env.CHROME_PATH,...[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(p=>[join(p,'Google','Chrome','Application','chrome.exe'),join(p,'Microsoft','Edge','Application','msedge.exe')])];
const binary=binaries.find(p=>p&&existsSync(p));if(!binary)throw new Error('Browser unavailable; smoke cannot pass');
const scratch=mkdtempSync(join(tmpdir(),'ffr-ui-smoke-'));const token=randomBytes(24).toString('hex');
const auditorToken=randomBytes(24).toString('hex');
const routeRedCheck=process.argv.includes('--route-red-check');const slowCheck=process.argv.includes('--slow-check');const timeoutCheck=slowCheck||process.argv.includes('--timeout-check');let controlledCalls=0;
const mockFetch=async(url,options)=>{const body=JSON.parse(options.body),prompt=typeof body.input==='string'?body.input:body.messages.map(m=>m.content).join('\n');let reply;if(prompt.includes('Draft recovery tasks for human approval.')){const c=JSON.parse(prompt.split('Context: ')[1]);const {sampleDraft}=await import('../src/recovery-board.mjs');reply=sampleDraft(c);}else if(prompt.includes('Next call get_incident with empty arguments.'))reply={action:'tool',name:'get_incident',arguments:{}};else if(prompt.includes('Next call compare_recovery_options with empty arguments.'))reply={action:'tool',name:'compare_recovery_options',arguments:{}};else reply={action:'final',optionId:'allocate_substitute',narrative:'Use the calculated substitute path after human review.',claims:[{evidenceId:'ev-cert-qty',value:120,unit:'each',documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'}]};return new Response(JSON.stringify(body.input?{model:body.model,output_text:JSON.stringify(reply)}:{model:body.model,choices:[{message:{content:JSON.stringify(reply)}}]}));};
const app=createApp({models:{fetchImpl:mockLive?mockFetch:routeRedCheck?async()=>{controlledCalls++;return new Response('{}',{status:503});}:timeoutCheck?async()=>{controlledCalls++;if(slowCheck)await delay(13500);throw Object.assign(Error('controlled timeout'),{name:'AbortError'});}:globalThis.fetch,env:{...process.env,...(mockLive?{MUSE_API_KEY:'test-only-wonder',BASETEN_API_KEY:'test-only-baseten'}:{}),FIREWORKS_API_KEY:'',HACKATHON_DEMO_MODE:'1',HACKATHON_OPERATORS_JSON:JSON.stringify([{id:'judge-auditor',role:'auditor',token:auditorToken}]),HACKATHON_ADMIN_TOKEN:token,HACKATHON_LEDGER_KEY:randomBytes(32).toString('hex'),HACKATHON_STATE_DIR:join(scratch,'state')}}});
if(baseline){const handler=app.server.listeners('request')[0];app.server.removeAllListeners('request');app.server.on('request',(req,res)=>{if(req.url==='/app.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(readFileSync(new URL('../public/app.mjs.run13.bak',import.meta.url)));}else handler(req,res);});}
const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
const browser=spawn(binary,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+join(scratch,'browser'),'about:blank'],{stdio:'ignore',windowsHide:true});
let ws;const errors=[];const checks=[];

let keyboardActions=0;
const group='primary-'+(baseline?(mockLive?'baseline-mocked':'baseline-offline'):mockLive?'browser-mocked':liveBrowser?'browser':'browser-offline');
const output=new URL('../evidence/'+evidenceRun()+'/'+group+'/',import.meta.url);mkdirSync(output,{recursive:true});
function save(name,contents){writeEvidence(new URL(name,output),contents);}
try{
 const portFile=join(scratch,'browser','DevToolsActivePort');await until(()=>existsSync(portFile),'browser launch',15000);const port=Number(readFileSync(portFile,'utf8').split('\n')[0]);
 const tabs=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve);ws.addEventListener('error',reject);});
 let next=0;const pending=new Map();ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')errors.push('Uncaught browser exception');if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push('Browser console error');if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry.text);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error('Browser evaluation failed');return r.result?.value;};
 const press=async(key,code,virtual,extra={})=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtual,...extra});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtual});};
 const tabTo=async selector=>{
  for(let i=0;i<220;i++){
   if(await evaluate(`document.activeElement===document.querySelector(${JSON.stringify(selector)})`)){
    const visible=await evaluate(`(()=>{const s=getComputedStyle(document.activeElement);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=2;})()`);assert.ok(visible,'visible keyboard focus: '+selector);return;
   }
   await press('Tab','Tab',9);
  }
  throw Error('Keyboard could not reach '+selector);
 };
 const ensureStage=async selector=>{
 const stage=await evaluate(`document.querySelector(${JSON.stringify(selector)})?.closest('[data-stage]')?.dataset.stage`);
 if(!stage)return;
 const hidden=await evaluate(`document.querySelector('[data-stage="'+${JSON.stringify(stage)}+'"]')?.hidden`);
 if(hidden){const rail='[data-view="'+stage+'"]';if(keyboardOnly){await tabTo(rail);await press('Enter','Enter',13,{text:'\r'});keyboardActions++;}else await evaluate(`document.querySelector(${JSON.stringify(rail)}).click()`);}
 };
 const click=async selector=>{if(keyboardOnly&&['#investigate','#shock','#britt-approve','#confirm','#encrypted-export'].includes(selector)&&await evaluate(`document.body.dataset.guided==='true'&&getComputedStyle(document.querySelector(${JSON.stringify(selector)})).display==='none'`))selector='#guide-next';await ensureStage(selector);if(!keyboardOnly)return evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await tabTo(selector);await press('Enter','Enter',13,{text:'\r'});keyboardActions++;};
 const value=async(selector,value)=>{
  await ensureStage(selector);
  if(!keyboardOnly)return evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});element.value=${JSON.stringify(value)};element.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await tabTo(selector);
  if(await evaluate(`document.querySelector(${JSON.stringify(selector)}).tagName==='SELECT'`)){
   const index=await evaluate(`[...document.querySelector(${JSON.stringify(selector)}).options].findIndex(o=>o.value===${JSON.stringify(value)})`);assert.ok(index>=0);await press('Home','Home',36);for(let i=0;i<index;i++)await press('ArrowDown','ArrowDown',40);await press('Enter','Enter',13);
  }else{await press('a','KeyA',65,{modifiers:2});await send('Input.insertText',{text:value});}
  keyboardActions++;
 };
 await send('Runtime.enable');await send('Page.enable');await send('Log.enable');await send('Emulation.setDeviceMetricsOverride',{width:mobileFlow?390:1440,height:mobileFlow?844:1050,deviceScaleFactor:1,mobile:mobileFlow});await send('Page.navigate',{url:base});
 await until(()=>evaluate(`!document.querySelector('#room').hidden&&document.activeElement&&document.activeElement.id==='guide-title'`),'demo opens recovery room');

 await value('#provider',liveBrowser?'baseten':'sample');
 await evaluate(`document.querySelector('#provider').dispatchEvent(new Event('change'))`);
 await click('#guide-start');await until(()=>evaluate(`!document.querySelector('#guide-start').disabled`),'guide start');
 save('opening.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
 assert.ok(await evaluate(`(()=>{const title=document.querySelector('#guide-title').getBoundingClientRect(),strip=document.querySelector('.guide').getBoundingClientRect();return title.top>=strip.top&&title.bottom<=strip.bottom&&title.width>0;})()`),'guide title remains inside the visible instruction strip');
 await evaluate(`document.querySelector('#factory-svg [data-evidence]')?.focus()`);await press('Enter','Enter',13);assert.ok(await evaluate(`document.activeElement.id==='ev-cert-qty' && document.querySelectorAll('#factory-svg .evidence-linked').length>0`),'keyboard source tracks reveal and highlight exact source evidence');
 const visited=[];const captures=[];
 for(let n=0;n<40;n++){
  const title=await evaluate(`document.querySelector('#guide-title').textContent`);if(!visited.includes(title)){visited.push(title);for(const [width,height,label] of [[1920,1080,'wide'],[1366,768,'desktop'],[390,844,'mobile']]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:label==='mobile'});if(label==='mobile')assert.ok(await evaluate(`(()=>{const nav=document.querySelector('#guided-steps');return nav.scrollHeight<=nav.clientHeight+2;})()`),'mobile guided rail occupies one non-overlapping row');if(label==='desktop'&&visited.length===1)assert.ok(await evaluate(`(()=>{const opening=document.querySelector('#opening-story').getBoundingClientRect(),stakes=document.querySelector('#opening-stakes').getBoundingClientRect(),heading=document.querySelector('.story-hero>.eyebrow').getBoundingClientRect(),deck=document.querySelector('#stage-deck').getBoundingClientRect();return opening.height<=110&&stakes.top<opening.top+50&&heading.top>=deck.top;})()`),'opening stakes share the first frame and inspector heading is unclipped');if(label!=='mobile')assert.ok(await evaluate(`document.documentElement.scrollHeight<=innerHeight+2 && document.documentElement.scrollWidth<=innerWidth+2`),'primary page fits the viewport');if(label==='desktop'&&title.includes('Britt'))assert.ok(await evaluate(`(()=>{const d=document.querySelector('#stage-deck');return d.scrollHeight<=d.clientHeight+2;})()`),'Britt inspector keeps proposals and approval in the viewport');const name='step-'+visited.length+'-'+label+'.png';save(name,Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));captures.push({step:visited.length,path:'evidence/'+evidenceRun()+'/'+group+'/'+name,layout:{title,viewport:width+'x'+height}});}await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});}
  if(title.includes('Recovery story complete'))break;
  await click('#guide-next');
  await until(()=>evaluate(`!document.querySelector('#guide-next').disabled||(!document.querySelector('#consent').hidden&&!document.querySelector('#typed').disabled)||(!document.querySelector('[data-stage="proof"]').hidden&&!document.querySelector('#export-passphrase').disabled)`),'primary action');
  if(await evaluate(`!document.querySelector('#consent').hidden`)){
   if(title.includes('revised')){const phrase=await evaluate(`document.querySelector('#confirm-phrase').textContent`);await click('#guided-steps button');for(let n=0;n<20&&await evaluate(`document.querySelector('#guide-title').textContent.startsWith('Review')`);n++)await click('#guide-next');assert.ok(await evaluate(`!document.querySelector('#consent').hidden`),'Back review preserves the pending revised consent');assert.equal(await evaluate(`document.querySelector('#confirm-phrase').textContent`),phrase);}

   for(const [width,height,label] of [[1920,1080,'wide'],[1366,768,'desktop'],[390,844,'mobile']]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:label==='mobile'});if(label==='desktop')assert.ok(await evaluate(`(()=>{const d=document.querySelector('#stage-deck').getBoundingClientRect();return ['typed','consent-feedback'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom;});})()`),'typed consent and feedback fit the desktop inspector');if(label==='desktop')assert.ok(await evaluate(`(()=>{const deck=document.querySelector('#stage-deck').getBoundingClientRect(),heading=document.querySelector('#options-heading').getBoundingClientRect();return heading.top>=deck.top&&heading.bottom<=deck.bottom;})()`),'comparison heading stays below the guide after consent focus');if(label==='desktop')assert.ok(await evaluate(`(()=>{const list=document.querySelector('#options');return list.scrollHeight<=list.clientHeight+2;})()`),'all recovery cards fit above pinned consent without clipping');save('consent-'+(title.includes('revised')?'revised':'initial')+'-'+label+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));}await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
   await value('#typed',await evaluate(`document.querySelector('#confirm-phrase').textContent`));await click('#confirm');await until(()=>evaluate(`!document.querySelector('#confirm').disabled`),'accept');
  }
  if(title.includes('Britt')&&await evaluate(`!document.querySelector('#britt-approve').hidden`)){await click('#britt-approve');await until(()=>evaluate(`!document.querySelector('#britt-approve').disabled`),'Britt approval');}
  if(title.includes('Britt')||title.includes('Reinvestigate')){await click('[data-view="board"]');save('board-'+(title.includes('Reinvestigate')?'blocked':title.includes('replans')?'revised':'accepted')+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));const currentTitle=await evaluate(`document.querySelector('#guide-title').textContent`);const view=currentTitle.includes('Disrupt')?'shock':currentTitle.includes('revised recovery')?'decision':currentTitle.includes('Verify')?'proof':'investigation';await click('[data-view="'+view+'"]');}
  if(title.includes('Verify and retain')){await value('#export-passphrase','separate strong packet phrase');await evaluate(`document.querySelector('#export-passphrase').dispatchEvent(new Event('input'))`);}
  if(n===5)assert.ok(visited.length>2,'Show next action must leave step 2 using primary controls');
 }
 assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.includes('Recovery story complete')`),'all guided steps finish');
 const session=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}}).then(r=>r.json());const post=async action=>fetch(base+'/api/workflow/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':session.session,'X-CSRF-Token':session.csrf},body:JSON.stringify(action==='export'?{acknowledgePlaintext:'EXPORT PLAINTEXT'}:{})}).then(r=>r.json());const packet=await post('export'),checkpoint=await post('checkpoint');assert.equal(verifyCheckpoint(packet,checkpoint).ok,true);save('packet.json',JSON.stringify(packet,null,2));save('checkpoint.json',JSON.stringify(checkpoint,null,2));
 const before=await evaluate(`document.querySelector('#ledger').textContent`);await click('#guide-back');await delay(1200);assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.startsWith('Review')`));assert.ok(await evaluate(`[...document.querySelectorAll('#stage-deck button,#stage-deck input,#stage-deck select')].every(e=>e.disabled)`));await click('[data-view="decision"]');await evaluate(`document.querySelector('#options .option:not(.unavailable)').click()`);await delay(300);assert.equal((await post('export')).ledger.head,packet.ledger.head,'history recovery cards cannot create a consent review');await click('#guide-next');assert.equal(await evaluate(`document.querySelector('#ledger').textContent`),before);assert.equal((await post('export')).ledger.head,packet.ledger.head);await click('#guided-steps button');assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.startsWith('Review')`));assert.equal((await post('export')).ledger.head,packet.ledger.head);
 save('screens.json',JSON.stringify(captures,null,2));assert.deepEqual(errors,[]);save('summary.json',JSON.stringify({ok:true,live:liveBrowser&&!mockLive,mocked:mockLive,visited,consoleErrors:errors},null,2));console.log(JSON.stringify({ok:true,visited}));
 }catch(error){
 save('failure.json',JSON.stringify({ok:false,live:liveBrowser,reason:error.message,checks,consoleErrors:errors},null,2));
 try{const session=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}}).then(r=>r.json());const response=await fetch(base+'/api/workflow/export',{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':session.session,'X-CSRF-Token':session.csrf},body:JSON.stringify({acknowledgePlaintext:'EXPORT PLAINTEXT'})});if(response.ok)save('failed-packet.json',JSON.stringify(await response.json(),null,2));}catch{}
 console.error(redactEvidence(error.stack));process.exitCode=1;}finally{ws?.close();if(browser.exitCode===null){if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch{}}else browser.kill();}app.server.closeAllConnections();await app.close();await cleanupSmokeScratch(scratch);console.log('Temporary smoke state removed.');}
