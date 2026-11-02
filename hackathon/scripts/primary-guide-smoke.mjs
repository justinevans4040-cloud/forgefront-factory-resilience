import {renderJudgeReadme} from './readme-render.mjs';
import {generatedPlant} from '../fixtures/generated-plant.mjs';
import {screenshotCaptureOptions,screenshotExtension} from './capture-format.mjs';
import {measureLayout} from './layout-geometry.mjs';
import {cleanupSmokeScratch} from './smoke-cleanup.mjs';
import {browserOptions,publicSmokeConfig} from './browser-options.mjs';
import {contrastRatio} from '../public/accessibility.mjs';
import {redactEvidence,writeEvidence,evidenceRun} from './public-evidence.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { verifyCheckpoint } from '../src/packet.mjs';
import { createApp } from '../server.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=75000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await delay(100);}throw new Error('Timed out: '+label);}
const layoutDir=process.argv.includes('--live-proposals')?'layout-live-proposals':process.argv.includes('--recorded-drafts')?'layout-recorded':process.argv.includes('--live')?'layout-live':'layout';
const geometry=process.argv.includes('--geometry'),geometryResults=[],geometryStates=new Set();
const publicHosting=publicSmokeConfig(process.argv),publicFallback=process.argv.includes('--public-fallback');
const mockLive=process.argv.includes('--mock-live'),baseline=process.argv.includes('--baseline');
const {keyboardOnly,liveBrowser,guided,mobileFlow}=browserOptions([...process.argv,...(mockLive||publicFallback?['--live','--guided']:[])],process.env);
const binaries=[process.env.CHROME_PATH,...[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(p=>[join(p,'Google','Chrome','Application','chrome.exe'),join(p,'Microsoft','Edge','Application','msedge.exe')])];
const binary=binaries.find(p=>p&&existsSync(p));if(!binary)throw new Error('Browser unavailable; smoke cannot pass');
const scratch=mkdtempSync(join(tmpdir(),'ffr-ui-smoke-'));const token=randomBytes(24).toString('hex');
const auditorToken=randomBytes(24).toString('hex');
const routeRedCheck=process.argv.includes('--route-red-check');const slowCheck=process.argv.includes('--slow-check');const timeoutCheck=slowCheck||process.argv.includes('--timeout-check');let controlledCalls=0;
let recordedDraftIndex=0;const liveProposalPacket=process.argv.includes('--live-proposals')?'../evidence/run21/primary-browser/packet.json':process.argv.includes('--recorded-drafts')?'../evidence/run20/primary-browser/failed-packet.json':null;const recordedDrafts=liveProposalPacket?JSON.parse(readFileSync(new URL(liveProposalPacket,import.meta.url),'utf8')).brittProposals.map(p=>({summary:p.board.summary,tasks:p.board.tasks.map(({id,title,owner,dueHours,dependsOn,evidenceIds})=>({id,title,owner,dueHours,dependsOn,evidenceIds}))})):null;
const mockFetch=async(url,options)=>{if(geometry)await delay(700);const body=JSON.parse(options.body),prompt=typeof body.input==='string'?body.input:body.messages.map(m=>m.content).join('\n');let reply;if(prompt.includes('Draft recovery tasks for human approval.')){const c=JSON.parse(prompt.split('Context: ')[1]);const {sampleDraft}=await import('../src/recovery-board.mjs');reply=recordedDrafts?recordedDrafts[Math.min(recordedDraftIndex++,recordedDrafts.length-1)]:sampleDraft(c);}else if(prompt.includes('Next call get_incident with empty arguments.'))reply={action:'tool',name:'get_incident',arguments:{}};else if(prompt.includes('Next call compare_recovery_options with empty arguments.'))reply={action:'tool',name:'compare_recovery_options',arguments:{}};else reply={action:'final',optionId:'allocate_substitute',narrative:'Use the calculated substitute path after human review.',claims:[{evidenceId:'ev-cert-qty',value:120,unit:'each',documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'}]};return new Response(JSON.stringify(body.input?{model:body.model,output_text:JSON.stringify(reply)}:{model:body.model,choices:[{message:{content:JSON.stringify(reply)}}]}));};
const plantSize=Number(process.argv.find(a=>a.startsWith('--plant-size='))?.split('=')[1]??0);
const app=createApp({...(plantSize?{plant:generatedPlant(plantSize)}:{}),publicHosting,models:{fetchImpl:publicFallback?async()=>{throw Error('Public fallback must never contact a provider');}:mockLive?mockFetch:routeRedCheck?async()=>{controlledCalls++;return new Response('{}',{status:503});}:timeoutCheck?async()=>{controlledCalls++;if(slowCheck)await delay(13500);throw Object.assign(Error('controlled timeout'),{name:'AbortError'});}:globalThis.fetch,env:{...process.env,...(mockLive?{MUSE_API_KEY:'test-only-wonder',BASETEN_API_KEY:'test-only-baseten'}:{}),FIREWORKS_API_KEY:'',HACKATHON_DEMO_MODE:'1',HACKATHON_OPERATORS_JSON:JSON.stringify([{id:'judge-auditor',role:'auditor',token:auditorToken}]),HACKATHON_ADMIN_TOKEN:token,HACKATHON_LEDGER_KEY:randomBytes(32).toString('hex'),HACKATHON_STATE_DIR:join(scratch,'state')}}});
if(baseline){const handler=app.server.listeners('request')[0];app.server.removeAllListeners('request');app.server.on('request',(req,res)=>{if(req.url==='/app.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(readFileSync(new URL('../public/app.mjs.run13.bak',import.meta.url)));}else handler(req,res);});}
const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
const browser=spawn(binary,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+join(scratch,'browser'),'about:blank'],{stdio:'ignore',windowsHide:true});
let ws;const errors=[];const checks=[];

let keyboardActions=0;
const group='primary-'+(publicHosting?(publicFallback?'browser-public-fallback':'browser-public'):baseline?(mockLive?'baseline-mocked':'baseline-offline'):mockLive?'browser-mocked':liveBrowser?'browser':'browser-offline');
const output=new URL('../evidence/'+evidenceRun()+'/'+group+'/',import.meta.url);mkdirSync(output,{recursive:true});
function save(name,contents){if(process.argv.includes('--lean-evidence')&&name.endsWith('.png'))return;if(process.argv.includes('--lean-evidence')&&name==='screens.json')contents='[]';writeEvidence(new URL(name,output),contents);}
try{
 const portFile=join(scratch,'browser','DevToolsActivePort');await until(()=>existsSync(portFile),'browser launch',15000);const port=Number(readFileSync(portFile,'utf8').split('\n')[0]);
 const tabs=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve);ws.addEventListener('error',reject);});
 let next=0;const pending=new Map();ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')errors.push('Uncaught browser exception');if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push('Browser console error');if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry.text);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error('Browser evaluation failed');return r.result?.value;};
 const captureGeometry=async label=>{
  if(!geometry)return;
  for(const [width,height,size] of [[1920,1080,'wide'],[1366,768,'desktop']]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(180);
   const metrics=await evaluate('('+measureLayout.toString()+')()');
   const name=String(geometryResults.length+1).padStart(3,'0')+'-'+label+'-'+size;const extension=screenshotExtension(process.argv);
   writeEvidence(new URL('../evidence/'+evidenceRun()+'/'+layoutDir+'/'+name+'.'+extension,import.meta.url),Buffer.from((await send('Page.captureScreenshot',screenshotCaptureOptions(process.argv))).data,'base64'));
   geometryResults.push({state:label,viewport:width+'x'+height,screenshot:layoutDir+'/'+name+'.'+extension,...metrics});
   writeEvidence(new URL('../evidence/'+evidenceRun()+'/'+layoutDir+'/results.json',import.meta.url),JSON.stringify(geometryResults,null,2));
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
 };
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
 if(await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)})?.closest('.route-preflight:not([open])'))`)){if(keyboardOnly){await tabTo('.route-preflight>summary');await press('Enter','Enter',13,{text:'\r'});}else await evaluate(`document.querySelector('.route-preflight').open=true`);}
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

 if(geometry){
  const sourceCount=await evaluate(`document.querySelectorAll('#evidence .evidence-raw summary').length`);
  for(let i=0;i<sourceCount;i++){
   await evaluate(`document.querySelectorAll('#evidence .evidence-raw summary')[${i}].click()`);
   assert.ok(await evaluate(`document.querySelector('#source-dialog').open`),'source detail opens without moving cards');
   await captureGeometry('source-detail-'+i);
   assert.ok(await evaluate(`(()=>{const d=document.querySelector('#source-dialog'),r=d.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&d.scrollHeight<=d.clientHeight+2;})()`),'source detail fits without scrolling');
   await evaluate(`document.querySelector('#source-dialog button').click()`);
  }
 }
 if(process.argv.includes('--plant')){
  await evaluate(`document.querySelector('#plant-launcher').click()`);await until(()=>evaluate(`document.querySelector('#plant-room').open`),'full shop opens');
  const plantResults=[],plantFolder=plantSize?'plant-'+plantSize:process.argv.includes('--refined')?'cascade-refined':'cascade';
  const capturePlant=async label=>{
   for(const [width,height]of [[1920,1080],[1366,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(250);
    const metrics=await evaluate(`(()=>{const room=document.querySelector('#plant-room'),nodes=[...room.querySelectorAll('.plant-tile')],visible=[...room.querySelectorAll('button,select,label,.plant-caption,.plant-metrics>div,.plant-navigation span')].filter(e=>e.checkVisibility()&&e.getBoundingClientRect().width>0);const clipped=[],hits=[];for(const e of visible){const r=e.getBoundingClientRect();if(r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1||e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2)clipped.push(e.textContent);}for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect();if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))hits.push([nodes[i].textContent,nodes[j].textContent]);}let glyphHits=0,glyphClipped=0;for(const svg of room.querySelectorAll('.plant-machinery')){const outer=svg.getBoundingClientRect(),boxes=[...svg.querySelectorAll('g')].map(g=>g.getBoundingClientRect()).sort((a,b)=>a.top-b.top);for(let i=0;i<boxes.length;i++){const a=boxes[i];if(a.left<outer.left-1||a.right>outer.right+1||a.top<outer.top-1||a.bottom>outer.bottom+1)glyphClipped++;for(let j=i-1;j>=0&&boxes[j].bottom>a.top;j--){const b=boxes[j];if(Math.min(a.right,b.right)>Math.max(a.left,b.left)+.1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+.1)glyphHits++;}}}return {clipped,hits,glyphHits,glyphClipped,pageScroll:room.scrollHeight>room.clientHeight+2,tiles:nodes.length,art:[...room.querySelectorAll('.plant-machinery')].map(svg=>({groups:svg.querySelectorAll('g').length,viewBox:svg.getAttribute('viewBox'),rect:{w:svg.getBoundingClientRect().width,h:svg.getBoundingClientRect().height},transforms:[...svg.querySelectorAll('g')].slice(0,3).map(g=>({transform:g.getAttribute('transform'),x:g.getBoundingClientRect().x,w:g.getBoundingClientRect().width}))}))};})()`);
    const screenshot=plantFolder+'/'+label+'-'+width+'.jpg';writeEvidence(new URL('../evidence/'+evidenceRun()+'/'+screenshot,import.meta.url),Buffer.from((await send('Page.captureScreenshot',{format:'jpeg',quality:80,captureBeyondViewport:false})).data,'base64'));plantResults.push({state:label,viewport:width+'x'+height,screenshot,...metrics});writeEvidence(new URL('../evidence/'+evidenceRun()+'/'+plantFolder+'/results.json',import.meta.url),JSON.stringify(plantResults,null,2));assert.deepEqual(metrics.clipped,[],'plant clipping '+label);assert.deepEqual(metrics.hits,[],'plant overlap '+label);assert.equal(metrics.pageScroll,false);assert.equal(metrics.glyphHits,0,'machine artwork never overlaps');assert.equal(metrics.glyphClipped,0,'machine artwork stays in its reserved band');if(!label.includes('department-drill-in')&&!plantSize)assert.equal(metrics.tiles,7,'full-shop overview keeps all seven departments visible at '+width+'x'+height+' for '+label);
   }
  };
  await capturePlant('running');
  if(process.argv.includes('--fps')){
   await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
   await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
   await evaluate(`(()=>{globalThis.__cascadeFpsSample={collecting:true,frames:[],last:0};const failure=document.querySelector('#plant-failure');failure.value='wrong-cert';failure.dispatchEvent(new Event('change'));document.querySelector('#plant-room .plant-controls button').click();})()`);
   await delay(3600);
   const fps=await evaluate(`(()=>{const s=globalThis.__cascadeFpsSample||{frames:[]};s.collecting=false;const frames=s.frames.filter(n=>n>0&&n<250);const avg=frames.length?frames.reduce((a,b)=>a+b,0)/frames.length:0;const sorted=frames.slice().sort((a,b)=>a-b);return {machineCount:${plantSize||0},samples:frames.length,avgFrameMs:Number(avg.toFixed(2)),fps:avg?Number((1000/avg).toFixed(1)):0,p95FrameMs:sorted.length?Number(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*0.95))].toFixed(2)):0,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};})()`);
   writeEvidence(new URL('../evidence/'+evidenceRun()+'/cascade-fps.json',import.meta.url),JSON.stringify({...fps,plantFolder,viewport:'1920x1080'},null,2)+'\n');
   assert.ok(fps.samples>=30,'cascade FPS profile needs sustained frames');
  }
  const failures=await evaluate(`[...document.querySelector('#plant-failure').options].map(o=>o.value)`);
  const leanPlant=Boolean(plantSize)&&plantSize>=1000;
  const failurePass=leanPlant?failures.slice(0,1):failures;
  for(const failure of failurePass){await evaluate(`(()=>{const e=document.querySelector('#plant-failure');e.value=${JSON.stringify(failure)};e.dispatchEvent(new Event('change'));document.querySelector('#plant-room .plant-controls button').click();})()`);await delay(2500);await capturePlant(failure);
   const strategies=leanPlant?['reroute']:['reroute','expedite','rework'];
   for(const strategy of strategies){await evaluate(`(()=>{const e=document.querySelector('#plant-strategy');e.value=${JSON.stringify(strategy)};e.dispatchEvent(new Event('change'));})()`);await capturePlant(failure+'-'+strategy+'-preview');await evaluate(`document.querySelectorAll('#plant-room .plant-controls button')[1].click()`);await until(()=>evaluate(`document.querySelector('.plant-consent')&&!document.querySelector('.plant-consent').hidden`),'plant consent opens');await evaluate(`(()=>{document.querySelector('#plant-approve').click();})()`);await until(()=>evaluate(`document.querySelector('#plant-authorize')?.open`),'plant authorize opens');await evaluate(`document.querySelector('#plant-authorize button')?.click()`);await until(()=>evaluate(`document.querySelector('.plant-consent').hidden && [...document.querySelectorAll('.plant-state')].some(e=>/RECOVERY ACCEPTED/.test(e.textContent))`),'plant recovery sealed');await capturePlant(failure+'-'+strategy+'-accepted');}
  }
  await evaluate(`document.querySelector('#plant-room .plant-tile').click()`);await capturePlant('department-drill-in');

  if(process.argv.includes('--showcase')){
   await evaluate(`(()=>{const overview=[...document.querySelectorAll('#plant-room .plant-navigation button')].find(b=>/All departments/.test(b.textContent));if(overview&&!overview.disabled)overview.click();const failure=document.querySelector('#plant-failure');failure.value='wrong-cert';failure.dispatchEvent(new Event('change'));document.querySelector('#plant-room .plant-controls button').click();document.querySelector('#plant-room').classList.add('recording');})()`);await delay(2500);
   await send('Emulation.setDeviceMetricsOverride',{width:3840,height:2160,deviceScaleFactor:1,mobile:false});await delay(300);
   const target=new URL('../../assets/showcase/full-shop-cascade.png',import.meta.url);if(!process.argv.includes('--replace-showcase'))assert.equal(existsSync(target),false,'showcase must be a new asset');writeEvidence(target,Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  }
  await evaluate(`document.querySelector('#plant-room').close()`);

 }

 if(process.argv.includes('--readme')){
  // Inline data URLs exceed Chromium limits once showcase images are embedded; serve the pitch from the smoke server instead.
  const readmeHtml=renderJudgeReadme();const readmePath=join(scratch,'judge-readme.html');writeFileSync(readmePath,readmeHtml);
  const handler=app.server.listeners('request')[0];app.server.removeAllListeners('request');app.server.on('request',(req,res)=>{if(req.url?.startsWith('/judge-readme')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(readFileSync(readmePath));return;}handler(req,res);});
  await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:base+'/judge-readme'});await delay(1200);
  const title=await evaluate(`document.querySelector('h1')?.textContent||''`);assert.match(title,/Factory Resilience/i,'judge readme preview must render the pitch page');
  const layout=await send('Page.getLayoutMetrics');const size=layout.cssContentSize??layout.contentSize;writeEvidence(new URL('../evidence/'+evidenceRun()+'/readme-preview.jpg',import.meta.url),Buffer.from((await send('Page.captureScreenshot',{format:'jpeg',quality:90,captureBeyondViewport:true,clip:{x:0,y:0,width:Math.min(size.width,1400),height:Math.min(size.height,4200),scale:1}})).data,'base64'));
  await send('Page.navigate',{url:base});await until(()=>evaluate(`!document.querySelector('#room').hidden&&document.querySelector('#guide-title')`),'return to recovery room after readme preview');
 }
 if(!process.argv.includes('--plant-only')){
 const visited=[];const captures=[];
 for(let n=0;n<40;n++){
  const title=await evaluate(`document.querySelector('#guide-title').textContent`);if(!visited.includes(title)){visited.push(title);if(geometry&&title.includes('replans'))await captureGeometry('replan-entry');for(const [width,height,label] of [[1920,1080,'wide'],[1366,768,'desktop'],[390,844,'mobile']]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:label==='mobile'});if(label==='mobile')assert.ok(await evaluate(`(()=>{const nav=document.querySelector('#guided-steps');return nav.scrollHeight<=nav.clientHeight+2;})()`),'mobile guided rail occupies one non-overlapping row');if(label==='desktop'&&visited.length===1)assert.ok(await evaluate(`(()=>{const opening=document.querySelector('#opening-story').getBoundingClientRect(),stakes=document.querySelector('#opening-stakes').getBoundingClientRect(),heading=document.querySelector('.story-hero>.eyebrow').getBoundingClientRect(),deck=document.querySelector('#stage-deck').getBoundingClientRect();return opening.height<=110&&stakes.top<opening.top+50&&heading.top>=deck.top;})()`),'opening stakes share the first frame and inspector heading is unclipped');if(label!=='mobile')assert.ok(await evaluate(`document.documentElement.scrollHeight<=innerHeight+2 && document.documentElement.scrollWidth<=innerWidth+2`),'primary page fits the viewport');if(label==='desktop'&&title.includes('Britt'))assert.ok(await evaluate(`(()=>{const d=document.querySelector('#stage-deck');return d.scrollHeight<=d.clientHeight+2;})()`),'Britt inspector keeps proposals and approval in the viewport');if(label==='desktop'&&title.includes('Britt'))assert.ok(await evaluate("(()=>{const work=document.querySelector('#britt-work').getBoundingClientRect(),card=document.querySelector('.proposal-task')?.getBoundingClientRect();return !card||card.top>=work.top&&card.bottom<=work.bottom;})()"),'first replacement proposal is fully visible beside prior work');if(label==='desktop'&&title.includes('Verify and retain'))assert.ok(await evaluate("[...document.querySelectorAll('#result-metrics .metric span')].every(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>=11)"),'proof metrics retain readable units and captions');if(label==='desktop'&&title.includes('Britt'))assert.ok(await evaluate("(()=>{const p=document.querySelector('#britt-proposal'),cards=[...p.querySelectorAll('.proposal-task')],tabs=[...p.querySelectorAll('[data-proposal-index]')];if(!cards.length)return true;if(tabs.length!==cards.length)return false;tabs.at(-1).click();const box=p.getBoundingClientRect();const ok=cards.every(c=>{const r=c.getBoundingClientRect();return r.height>0&&r.top>=box.top-1&&r.bottom<=box.bottom+1;})&&cards.some(c=>c.classList.contains('britt-focus-task'))&&cards.filter(c=>c.classList.contains('proposal-compact')).length===Math.max(0,cards.length-1);tabs[0].click();return ok;})()"),'every proposed task can be inspected without a clipped card');if(label==='desktop'&&title.includes('Verify and retain'))assert.ok(await evaluate("document.querySelector('#export-passphrase').disabled"),'passphrase stays locked until the current ledger is verified');if(label==='mobile'&&title.includes('Verify and retain'))assert.ok(await evaluate("(()=>{const box=document.querySelector('#story-results').getBoundingClientRect();return [...document.querySelectorAll('#result-metrics .metric span')].every(e=>{const r=e.getBoundingClientRect();return r.height>=11&&r.bottom<=box.bottom;});})()"),'mobile proof captions fit inside the result card');const name='step-'+visited.length+'-'+label+'.png';save(name,Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));captures.push({step:visited.length,path:'evidence/'+evidenceRun()+'/'+group+'/'+name,layout:{title,viewport:width+'x'+height}});}await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});}
  if(title.includes('Britt'))assert.ok(await evaluate(`(()=>{const card=document.querySelector('.proposal-task.britt-focus-task')||[...document.querySelectorAll('.proposal-task')].find(c=>!c.classList.contains('proposal-compact'));if(!card)return true;const box=card.getBoundingClientRect();return [...card.children].filter(e=>getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden').every(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.top>=box.top-1&&r.bottom<=box.bottom+1;});})()`),'proposal badge, title, owner and deadline remain inside their card');
  await captureGeometry(title.includes('Verify and retain')?'proof-'+await evaluate(`document.querySelector('#guide-next').textContent.toLowerCase().replace(/[^a-z]+/g,'-')`):'step-'+visited.length);
  if(geometry&&!geometryStates.has(title)){
   geometryStates.add(title);
   if(title.includes('human decision')||title.includes('revised recovery')){
    const options=await evaluate(`[...document.querySelectorAll('[data-option]')].map(e=>({id:e.dataset.option,disabled:e.disabled}))`);
    for(const option of options){
     const point=await evaluate(`(()=>{const r=document.querySelector('[data-option="'+${JSON.stringify(option.id)}+'"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
     await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await captureGeometry('hover-'+option.id+'-'+visited.length);
     if(!option.disabled){await click('[data-option="'+option.id+'"]');await until(()=>evaluate(`!document.querySelector('#consent').hidden&&!document.querySelector('#approve-option').disabled`),'option reviewed');await captureGeometry('selected-'+option.id+'-'+visited.length);}
    }
   }
   if((process.argv.includes('--recorded-drafts')||process.argv.includes('--live-proposals'))&&(title.includes('human decision')||title.includes('revised recovery'))){await click('[data-option="allocate_substitute"]');await until(()=>evaluate(`!document.querySelector('#consent').hidden&&!document.querySelector('#approve-option').disabled`),'recorded accepted path');}
   if(title.includes('Britt')){
    for(const selector of ['[data-proposal-index]','.prior-task-pages button']){
     const count=await evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`);
     for(let i=0;i<count;i++){await evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${i}].click()`);await captureGeometry((selector.includes('prior')?'prior-task-':'proposed-task-')+i+'-'+visited.length);}
     if(count)await evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[0].click()`);
    }
   }
   if(title.includes('Disrupt')){
    const cells=await evaluate(`[...document.querySelector('#shock-cell').options].map(o=>o.value)`);
    for(const cell of cells){await value('#shock-cell',cell);await evaluate(`document.querySelector('#shock-cell').dispatchEvent(new Event('change'))`);await captureGeometry('preview-'+cell);}
   }
  }
  if(title.includes('Recovery story complete'))break;
  if(title.includes('Britt')&&await evaluate(`Boolean(document.querySelector('#factory-svg [data-scene-hero="tasks"]'))`)){
   const proposalCounts=await evaluate(`({tiles:document.querySelectorAll('#factory-svg [data-scene-task]').length,buttons:document.querySelectorAll('[data-proposal-index]').length,cards:document.querySelectorAll('.proposal-task').length})`);
   assert.equal(proposalCounts.cards,proposalCounts.buttons,'every proposal has a reachable inspector selector '+JSON.stringify(proposalCounts));
   for(let task=0;task<proposalCounts.buttons;task++){await evaluate(`document.querySelectorAll('[data-proposal-index]')[${task}].click()`);assert.ok(await evaluate(`Boolean(document.querySelector('#factory-svg [data-scene-task=\"${task}\"]'))`),'selected task is present on the current scene page');}
   await evaluate(`document.querySelector('[data-proposal-index]').click()`);
   assert.ok(proposalCounts.buttons>0,'proposal controls are present');
   await evaluate(`document.querySelectorAll('[data-proposal-index]')[${proposalCounts.buttons-1}].click()`);
   assert.ok(await evaluate(`[...document.querySelectorAll('.proposal-task')].at(-1).hidden===false`),'stage task selection reveals the actual complete inspector task');
   await evaluate(`document.querySelector('[data-proposal-index="0"]').click()`);
  }
  if(publicHosting)await delay(5500);
  await click('#guide-next');
  if(geometry&&await evaluate(`!document.querySelector('#investigation-pending').hidden`))await captureGeometry('investigation-running-'+visited.length);
  await until(()=>evaluate(`!document.querySelector('#guide-next').disabled||(!document.querySelector('#consent').hidden&&!document.querySelector('#approve-option').disabled)||(!document.querySelector('[data-stage="proof"]').hidden&&!document.querySelector('#export-passphrase').disabled)`),'primary action');
  if(await evaluate(`!document.querySelector('#consent').hidden`)){
   if(await evaluate(`document.querySelector('#authorize-wall')?.open`))await evaluate(`document.querySelector('#authorize-cancel').click()`);
   if(title.includes('revised')){const phrase=await evaluate(`document.querySelector('#confirm-phrase').textContent`);await click('#guided-steps button');for(let n=0;n<20&&await evaluate(`document.querySelector('#guide-title').textContent.startsWith('Review')`);n++)await click('#guide-next');assert.ok(await evaluate(`!document.querySelector('#consent').hidden`),'Back review preserves the pending revised consent');assert.equal(await evaluate(`document.querySelector('#confirm-phrase').textContent`),phrase);if(await evaluate(`document.querySelector('#authorize-wall')?.open`))await evaluate(`document.querySelector('#authorize-cancel').click()`);}

   for(const [width,height,label] of [[1920,1080,'wide'],[1366,768,'desktop'],[390,844,'mobile']]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:label==='mobile'});if(label==='desktop')assert.ok(await evaluate(`(()=>{const d=document.querySelector('#stage-deck').getBoundingClientRect();return ['approve-option','consent-feedback'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom;});})()`),'approve control and feedback fit the desktop inspector');if(label==='desktop')assert.ok(await evaluate(`(()=>{const deck=document.querySelector('#stage-deck').getBoundingClientRect(),heading=document.querySelector('#options-heading').getBoundingClientRect();return heading.top>=deck.top&&heading.bottom<=deck.bottom;})()`),'comparison heading stays below the guide after consent focus');if(label==='desktop')assert.ok(await evaluate(`(()=>{const list=document.querySelector('#options');return list.scrollHeight<=list.clientHeight+2;})()`),'all recovery cards fit above pinned consent without clipping');save('consent-'+(title.includes('revised')?'revised':'initial')+'-'+label+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));}await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
   await captureGeometry('consent-'+(title.includes('revised')?'revised':'initial'));
   if(!await evaluate(`document.querySelector('#authorize-wall')?.open`))await click('#guide-next');
   await until(()=>evaluate(`document.querySelector('#authorize-wall')?.open`),'authorize wall opens');await click('#guide-next');await until(()=>evaluate(`document.querySelector('#decision-state').textContent==='Recovery decision accepted'`),'accept');
  }
  if(title.includes('Britt')&&await evaluate(`document.querySelector('#authorize-wall')?.open||!document.querySelector('#britt-approve').hidden`)){if(await evaluate(`!document.querySelector('#authorize-wall')?.open`))await click('#guide-next');await until(()=>evaluate(`document.querySelector('#authorize-wall')?.open`),'The Britt authorize wall');await click('#guide-next');await until(()=>evaluate(`!document.querySelector('#authorize-wall')?.open&&!document.querySelector('#britt-approve').disabled`),'The Britt approval');}
  if(title.includes('Britt')||title.includes('Reinvestigate')){await click('[data-view="board"]');save('board-'+(title.includes('Reinvestigate')?'blocked':title.includes('replans')?'revised':'accepted')+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));await captureGeometry('board-'+(title.includes('Reinvestigate')?'blocked':title.includes('replans')?'revised':'accepted'));const currentTitle=await evaluate(`document.querySelector('#guide-title').textContent`);const view=currentTitle.includes('Disrupt')?'shock':currentTitle.includes('revised recovery')?'decision':currentTitle.includes('Verify')?'proof':'investigation';await click('[data-view="'+view+'"]');}
  if(title.includes('Verify and retain')){await value('#export-passphrase','separate strong packet phrase');await evaluate(`document.querySelector('#export-passphrase').dispatchEvent(new Event('input'))`);}
  if(n===5)assert.ok(visited.length>2,'Show next action must leave step 2 using primary controls');
 }
 assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.includes('Recovery story complete')`),'all guided steps finish');
 if(geometry){writeEvidence(new URL('../evidence/'+evidenceRun()+'/'+layoutDir+'/results.json',import.meta.url),JSON.stringify(geometryResults,null,2));const failures=geometryResults.filter(r=>r.hits.length||r.clipped.length||r.pageScroll||r.fill<.70||r.bodyPx<16||r.textClipping.length||r.emptyElements.length||!r.headerNavigation.valid);assert.equal(failures.length,0,'geometry failures: '+JSON.stringify(failures.map(r=>({state:r.state,viewport:r.viewport,hits:r.hits.map(h=>[h.a,h.b]),clipped:r.clipped,fill:r.fill}))));}
 const session=publicHosting?await evaluate(`({session:auth['X-Session-Token'],csrf:auth['X-CSRF-Token']})`):await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}}).then(r=>r.json());const post=async action=>fetch(base+'/api/workflow/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':session.session,'X-CSRF-Token':session.csrf},body:JSON.stringify(action==='export'?{acknowledgePlaintext:'EXPORT PLAINTEXT'}:{})}).then(r=>r.json());const packet=await post('export'),checkpoint=await post('checkpoint');assert.equal(verifyCheckpoint(packet,checkpoint).ok,true);save('packet.json',JSON.stringify(packet,null,2));save('checkpoint.json',JSON.stringify(checkpoint,null,2));
 await click('[data-view="board"]');
 await evaluate(`document.querySelector('#factory-svg [data-scene-task]')?.dispatchEvent(new Event('click'))`);
 await captureGeometry('shell-board');
 assert.deepEqual(errors,[],'tracked shell task inspection has no missing proposal handler');
 await click('[data-view="proof"]');
 const before=await evaluate(`document.querySelector('#ledger').textContent`);await click('#guide-back');await delay(1200);assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.startsWith('Review')`));assert.ok(await evaluate(`[...document.querySelectorAll('#stage-deck button,#stage-deck input,#stage-deck select')].every(e=>e.disabled)`));await click('[data-view="decision"]');await evaluate(`document.querySelector('#options .option:not(.unavailable)').click()`);await delay(300);assert.equal((await post('export')).ledger.head,packet.ledger.head,'history recovery cards cannot create a consent review');await click('#guide-next');assert.equal(await evaluate(`document.querySelector('#ledger').textContent`),before);assert.equal((await post('export')).ledger.head,packet.ledger.head);await click('#guided-steps button');assert.ok(await evaluate(`document.querySelector('#guide-title').textContent.startsWith('Review')`));assert.equal((await post('export')).ledger.head,packet.ledger.head);
 if(geometry)assert.equal(geometryResults.filter(r=>r.hits.length||r.clipped.length||r.pageScroll||r.fill<.70||r.bodyPx<16||r.textClipping.length||r.emptyElements.length||!r.headerNavigation.valid).length,0,'all geometry states including shell');
 save('screens.json',JSON.stringify(captures,null,2));assert.deepEqual(errors,[]);save('summary.json',JSON.stringify({ok:true,live:liveBrowser&&!mockLive&&!publicFallback,mocked:mockLive,publicHosting:Boolean(publicHosting),dailyFallback:publicFallback,visited,consoleErrors:errors},null,2));console.log(JSON.stringify({ok:true,visited}));
 }
 }catch(error){
 save('failure.json',JSON.stringify({ok:false,live:liveBrowser,reason:error.message,checks,consoleErrors:errors},null,2));
 try{const session=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+token}}).then(r=>r.json());const response=await fetch(base+'/api/workflow/export',{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':session.session,'X-CSRF-Token':session.csrf},body:JSON.stringify({acknowledgePlaintext:'EXPORT PLAINTEXT'})});if(response.ok)save('failed-packet.json',JSON.stringify(await response.json(),null,2));}catch{}
 console.error(redactEvidence(error.stack));process.exitCode=1;}finally{ws?.close();if(browser.exitCode===null){if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch{}}else browser.kill();}app.server.closeAllConnections();await app.close();await cleanupSmokeScratch(scratch);console.log('Temporary smoke state removed.');}
