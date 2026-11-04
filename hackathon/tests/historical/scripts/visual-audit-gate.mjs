/**
 * Hard visual audit gate (owner item 25b).
 * Offline Sample guided tour + full-shop at 1366x768, 1536x864, 1920x1080.
 * Fails on clipped text, border-through-text, overlaps, empty boxes, bare Britt, rail overflow.
 */
import {measureLayout} from './layout-geometry.mjs';
import {cleanupSmokeScratch} from './smoke-cleanup.mjs';
import {writeEvidence,evidenceRun,redactEvidence} from './public-evidence.mjs';
import {screenshotCaptureOptions,screenshotExtension} from './capture-format.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';

const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=90000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await delay(100);}throw new Error('Timed out: '+label);}

const viewports=[[1366,768,'desktop'],[1536,864,'laptop'],[1920,1080,'wide']];
const binaries=[process.env.CHROME_PATH,...[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(p=>[join(p,'Google','Chrome','Application','chrome.exe'),join(p,'Microsoft','Edge','Application','msedge.exe')])];
const binary=binaries.find(p=>p&&existsSync(p));if(!binary)throw new Error('Browser unavailable; visual audit gate cannot pass');

const scratch=mkdtempSync(join(tmpdir(),'ffr-visual-gate-'));
const token=randomBytes(24).toString('hex');
const mockFetch=async(url,options)=>{
 await delay(80);
 const body=JSON.parse(options.body),prompt=typeof body.input==='string'?body.input:body.messages.map(m=>m.content).join('\n');
 let reply;
 if(prompt.includes('Draft recovery tasks for human approval.')){
  const c=JSON.parse(prompt.split('Context: ')[1]);
  const {sampleDraft}=await import('../src/recovery-board.mjs');
  reply=sampleDraft(c);
 }else if(prompt.includes('Next call get_incident with empty arguments.'))reply={action:'tool',name:'get_incident',arguments:{}};
 else if(prompt.includes('Next call compare_recovery_options with empty arguments.'))reply={action:'tool',name:'compare_recovery_options',arguments:{}};
 else reply={action:'final',optionId:'allocate_substitute',narrative:'Certificate quantity one hundred twenty does not match receiving count eighty. Use the calculated substitute path after human review. Waiting keeps the hold while verified substitute recovers capacity across the affected cells without inventing stock.',claims:[{evidenceId:'ev-cert-qty',value:120,unit:'each',documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'}]};
 return new Response(JSON.stringify(body.input?{model:body.model,output_text:JSON.stringify(reply)}:{model:body.model,choices:[{message:{content:JSON.stringify(reply)}}]}));
};

const app=createApp({models:{fetchImpl:mockFetch,env:{...process.env,MUSE_API_KEY:'test-only-wonder',BASETEN_API_KEY:'test-only-baseten',FIREWORKS_API_KEY:'',HACKATHON_DEMO_MODE:'1',HACKATHON_OPERATORS_JSON:'',HACKATHON_ADMIN_TOKEN:token,HACKATHON_LEDGER_KEY:randomBytes(32).toString('hex'),HACKATHON_STATE_DIR:join(scratch,'state')}}});
const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
const browser=spawn(binary,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+join(scratch,'browser'),'about:blank'],{stdio:'ignore',windowsHide:true});
const results=[],failures=[];
const outDir=new URL('../evidence/'+evidenceRun()+'/visual-gate/',import.meta.url);mkdirSync(outDir,{recursive:true});
let ws;
try{
 const portFile=join(scratch,'browser','DevToolsActivePort');await until(()=>existsSync(portFile),'browser launch',15000);
 const port=Number(readFileSync(portFile,'utf8').split('\n')[0]);
 const tabs=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve);ws.addEventListener('error',reject);});
 let next=0;const pending=new Map();
 ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},20000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error('Browser evaluation failed');return r.result?.value;};
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const value=async(selector,v)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change',{bubbles:true}));e.dispatchEvent(new Event('input',{bubbles:true}));})()`);

 const judge=(label,metrics,viewport)=>{
  const reasons=[];
  if(metrics.hits?.length)reasons.push('overlap');
  if(metrics.clipped?.length)reasons.push('clipped');
  if(metrics.textClipping?.length)reasons.push('textClipping');
  if(metrics.emptyElements?.length)reasons.push('empty');
  if(metrics.borderThroughText?.length)reasons.push('borderThroughText');
  if(metrics.railClip?.clips)reasons.push('railScroll');
  if(metrics.stageClip?.clips)reasons.push('stageScroll');
  if(metrics.pageScroll)reasons.push('pageScroll');
  if(metrics.bareBritt?.length)reasons.push('bareBritt');
  if(metrics.fill!=null&&metrics.fill<.70&&!String(label).startsWith('full-shop'))reasons.push('fill');
  if(metrics.bodyPx!=null&&metrics.bodyPx<16)reasons.push('bodyPx');
  if(metrics.headerNavigation&&!metrics.headerNavigation.valid)reasons.push('headerNav');
  if(reasons.length)failures.push({state:label,viewport,reasons,detail:{
   textClipping:metrics.textClipping?.slice(0,3),
   borderThroughText:metrics.borderThroughText?.slice(0,3),
   bareBritt:metrics.bareBritt,
   hits:metrics.hits?.slice(0,3),
   fill:metrics.fill,
   railClip:metrics.railClip,
   stageClip:metrics.stageClip
  }});
 };

 const capture=async(label)=>{
  for(const [width,height,size] of viewports){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await delay(200);
   await evaluate(`(()=>{for(const d of document.querySelectorAll('#stage-deck details.investigation-extra[open],#stage-deck .evidence-raw[open]'))d.open=false;const model=document.querySelector('#model-output');if(model&&!model.hidden)model.open=true;})()`);
   const metrics=await evaluate('('+measureLayout.toString()+')()');
   const name=`${String(results.length+1).padStart(3,'0')}-${String(label).slice(0,40).replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${size}.${screenshotExtension(process.argv)}`;
   writeEvidence(new URL(name,outDir),Buffer.from((await send('Page.captureScreenshot',screenshotCaptureOptions(process.argv))).data,'base64'));
   results.push({state:label,viewport:`${width}x${height}`,screenshot:'visual-gate/'+name,fill:metrics.fill,bodyPx:metrics.bodyPx,textClipping:metrics.textClipping?.length||0,borderThroughText:metrics.borderThroughText?.length||0,hits:metrics.hits?.length||0,railClips:Boolean(metrics.railClip?.clips),bareBritt:metrics.bareBritt||[]});
   judge(label,metrics,`${width}x${height}`);
   writeEvidence(new URL('results.json',outDir),JSON.stringify({base,results,failures},null,2));
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
 };

 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:base});
 await until(()=>evaluate(`!document.querySelector('#room').hidden&&document.querySelector('#guide-title')`),'demo opens');
 await value('#provider','sample');
 await click('#guide-start');
 await until(()=>evaluate(`document.body.dataset.guided==='true'`),'guided');

 const visited=[];
 for(let n=0;n<40;n++){
  const title=await evaluate(`document.querySelector('#guide-title').textContent`);
  if(!visited.includes(title)){
   visited.push(title);
   await capture(title);
   if(title.includes('Ask Wonder')||title.includes('Investigate the offline')||title.includes('Spark')){
    await evaluate(`(()=>{const m=document.querySelector('#model-output');if(m&&!m.hidden){m.open=true;}const btn=document.querySelector('#read-full-analysis');if(btn&&!btn.hidden)btn.click();})()`);
    if(await evaluate(`document.querySelector('#analysis-dialog')?.open`)){
     await capture(title+' · full analysis modal');
     await click('#analysis-close');
    }
   }
  }
  if(title.includes('Recovery story complete'))break;
  await click('#guide-next');
  await until(()=>evaluate(`!document.querySelector('#guide-next').disabled||(!document.querySelector('#consent').hidden&&!document.querySelector('#approve-option').disabled)||(!document.querySelector('[data-stage="proof"]').hidden&&!document.querySelector('#export-passphrase').disabled)`),'primary action');
  // Capture verified-findings inspector only while Investigate is the active stage (owner item 25 / 23).
  if(await evaluate(`document.body.dataset.activeStage==='investigation'&&Boolean(document.querySelector('#model-output')&&!document.querySelector('#model-output').hidden&&document.querySelector('#model-output').open)`)){
   await capture('verified-findings-open');
   if(await evaluate(`Boolean(document.querySelector('#read-full-analysis')&&!document.querySelector('#read-full-analysis').hidden)`)){
    await click('#read-full-analysis');
    await delay(150);
    if(await evaluate(`document.querySelector('#analysis-dialog')?.open`)){await capture('verified-findings-analysis-modal');await click('#analysis-close');}
   }
  }
  if(await evaluate(`!document.querySelector('#consent').hidden`)){
   if(await evaluate(`document.querySelector('#authorize-wall')?.open`))await evaluate(`document.querySelector('#authorize-cancel').click()`);
   if(!await evaluate(`document.querySelector('#authorize-wall')?.open`))await click('#guide-next');
   await until(()=>evaluate(`document.querySelector('#authorize-wall')?.open`),'authorize wall');
   await click('#guide-next');
   await until(()=>evaluate(`document.querySelector('#decision-state').textContent==='Recovery decision accepted'`),'accepted');
  }
  if(title.includes('Britt')&&await evaluate(`document.querySelector('#authorize-wall')?.open||!document.querySelector('#britt-approve').hidden`)){
   if(!await evaluate(`document.querySelector('#authorize-wall')?.open`))await click('#guide-next');
   await until(()=>evaluate(`document.querySelector('#authorize-wall')?.open`),'The Britt authorize');
   await click('#guide-next');
   await until(()=>evaluate(`!document.querySelector('#authorize-wall')?.open`),'The Britt sealed');
   // Wait for the guide title to leave The Britt step before the next click, so Shock is captured.
   await until(()=>evaluate(`!String(document.querySelector('#guide-title')?.textContent||'').includes('Britt')`),'post-Britt advance');
  }
  if(title.includes('Verify and retain')){
   await value('#export-passphrase','separate strong packet phrase');
   await evaluate(`document.querySelector('#export-passphrase').dispatchEvent(new Event('input'))`);
  }
 }

 assert.ok(visited.some(t=>t.includes('Recovery story complete')),'guided tour must finish');
 assert.ok(visited.length>=7,'guided tour must cover the story steps, got '+visited.length);

 await click('#plant-launcher');
 await until(()=>evaluate(`document.querySelector('#plant-room')?.open`),'full shop');
 await capture('full-shop');
 await evaluate(`(()=>{const s=document.querySelector('#plant-failure');if(s){s.value='wrong-cert';s.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
 await click('#plant-trigger');
 await delay(1800);
 await capture('full-shop-cascade-active');
 await evaluate(`document.querySelector('#plant-room').close()`);

 writeEvidence(new URL('results.json',outDir),JSON.stringify({base,visited,results,failures},null,2));
 console.log(JSON.stringify({visualAuditGate:failures.length===0?'PASS':'FAIL',steps:visited.length,captures:results.length,failureCount:failures.length,failures:failures.slice(0,20)},null,2));
 assert.equal(failures.length,0,'visual audit gate failures: '+JSON.stringify(failures.slice(0,10),null,2));
}catch(error){
 writeEvidence(new URL('failure.json',outDir),JSON.stringify({ok:false,reason:String(error.message),results,failures},null,2));
 console.error(redactEvidence(error.stack||String(error)));
 process.exitCode=1;
}finally{
 try{ws?.close();}catch{}
 if(browser.exitCode===null){if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch{}}else browser.kill();}
 try{app.server.closeAllConnections();await app.close();}catch{}
 await cleanupSmokeScratch(scratch);
}
