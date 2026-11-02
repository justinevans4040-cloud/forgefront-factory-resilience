import {renderJudgeReadme} from './readme-render.mjs';
import {writeEvidence,evidenceRun} from './public-evidence.mjs';
import {cleanupSmokeScratch} from './smoke-cleanup.mjs';
import {createApp} from '../server.mjs';
import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';

const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await delay(100);}throw new Error('Timed out: '+label);}

const binaries=[process.env.CHROME_PATH,...[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(p=>[join(p,'Google','Chrome','Application','chrome.exe'),join(p,'Microsoft','Edge','Application','msedge.exe')])];
const binary=binaries.find(p=>p&&existsSync(p));
if(!binary)throw new Error('Browser unavailable');

const scratch=mkdtempSync(join(tmpdir(),'ffr-browser-readme-'));
const token=randomBytes(24).toString('hex');
const app=createApp({models:{fetchImpl:async()=>new Response('{}'),env:{...process.env,MUSE_API_KEY:'',BASETEN_API_KEY:'',FIREWORKS_API_KEY:'',HACKATHON_DEMO_MODE:'1',HACKATHON_OPERATORS_JSON:'',HACKATHON_ADMIN_TOKEN:token,HACKATHON_LEDGER_KEY:randomBytes(32).toString('hex'),HACKATHON_STATE_DIR:join(scratch,'state')}}});
const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
const readmePath=join(scratch,'judge-readme.html');writeFileSync(readmePath,renderJudgeReadme());
const handler=app.server.listeners('request')[0];app.server.removeAllListeners('request');
app.server.on('request',(req,res)=>{if(req.url?.startsWith('/judge-readme')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(readFileSync(readmePath));return;}handler(req,res);});
const browser=spawn(binary,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+join(scratch,'browser'),'about:blank'],{stdio:'ignore',windowsHide:true});
try{
 const portFile=join(scratch,'browser','DevToolsActivePort');await until(()=>existsSync(portFile),'browser launch');
 const port=Number(readFileSync(portFile,'utf8').split('\n')[0]);
 const tabs=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve);ws.addEventListener('error',reject);});
 let next=0;const pending=new Map();
 ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},20000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:base+'/judge-readme'});
 await delay(1500);
 const layout=await send('Page.getLayoutMetrics');const size=layout.cssContentSize??layout.contentSize;
 const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:90,captureBeyondViewport:true,clip:{x:0,y:0,width:Math.min(size.width,1400),height:Math.min(size.height,4200),scale:1}});
 const bytes=Buffer.from(shot.data,'base64');
 writeEvidence(new URL('../evidence/'+evidenceRun()+'/readme-preview.jpg',import.meta.url),bytes);
 console.log(JSON.stringify({ok:true,run:evidenceRun(),bytes:bytes.length}));
 ws.close();
}finally{
 browser.kill();
 await app.close().catch(()=>{});
 cleanupSmokeScratch(scratch);
}
