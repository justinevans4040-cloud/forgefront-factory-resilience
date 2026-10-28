const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { createCopilot } = require('./solar_copilot.js');
const { createTranscriber } = require('./solar_transcriber.js');
const { createLivePreflight } = require('./solar_live_preflight.js');

const ROOT = __dirname;
const PORT = Number(process.env.DCE_PORT || 8787);
const HOST = process.env.DCE_HOST || '127.0.0.1';
const API_TOKEN = String(process.env.DCE_API_TOKEN || '');
const ALLOW_UNAUTHENTICATED = process.env.DCE_ALLOW_UNAUTHENTICATED === '1';
const STATE_FILE = path.join(ROOT, 'dce_v3_state.json');
const ACCESS_FILE = path.join(ROOT, 'dce_v3_access.json');
const clients = new Set();
const eventTickets = new Map();
const solarCopilot = createCopilot();
const solarTranscriber = createTranscriber();
const livePreflight = createLivePreflight();
const STATIC_FILES = new Set(['ForgeFront_PM.html','EDGE_MIRROR.html','DCE_Command_Center_V3.html','solar_call_engine.js','solar_operator_runtime.js','solar_copilot_ui.js','DCE_V3.webmanifest','DCE_V3_192.png','DCE_V3_512.png','DCE_V3_sw.js']);
const PUBLIC_API = new Set(['/api/health','/api/comms/inbound','/api/events','/api/session/bootstrap']);
function isLoopbackAddress(addr){
  const ip=String(addr||'').replace(/^::ffff:/i,'');
  return ip==='127.0.0.1'||ip==='::1'||ip==='localhost';
}
function appBuildId(){
  try{
    const file=path.join(ROOT,'DCE_Command_Center_V3.html');
    const st=fs.statSync(file);
    return crypto.createHash('sha256').update(String(st.mtimeMs)+':'+st.size).digest('hex').slice(0,12);
  }catch{return 'unknown';}
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'SAMEORIGIN',
  'Content-Security-Policy':"default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.resend.com https://api.twilio.com; frame-src https://meet.jit.si; form-action 'self'",
  'Permissions-Policy':'camera=(self "https://meet.jit.si"), microphone=(self), display-capture=(self "https://meet.jit.si"), geolocation=()'
};
const secureHeaders = headers => Object.assign({},SECURITY_HEADERS,headers);

const json = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, secureHeaders({'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'}));
  res.end(body);
};
const readJsonFile = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return fallback; } };
const writeJsonFile = (file, value) => { const tmp=file+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(value,null,2)); fs.renameSync(tmp,file); };
const readBody = (req,maxBytes=8_000_000) => new Promise((resolve,reject)=>{ let data=''; let settled=false; req.on('data',c=>{if(settled)return;data+=c;if(Buffer.byteLength(data)>maxBytes){settled=true;const e=new Error('body too large');e.status=413;reject(e);}}); req.on('end',()=>{if(settled)return;try{resolve(data?JSON.parse(data):{})}catch(e){e.status=400;reject(e)}}); req.on('error',e=>{if(!settled)reject(e)}); });
const readRawBody = (req,maxBytes=4_000_000) => new Promise((resolve,reject)=>{const chunks=[];let size=0,settled=false;req.on('data',chunk=>{if(settled)return;size+=chunk.length;if(size>maxBytes){settled=true;const e=new Error('audio too large');e.status=413;return reject(e)}chunks.push(chunk)});req.on('end',()=>{if(!settled)resolve(Buffer.concat(chunks))});req.on('error',e=>{if(!settled)reject(e)})});
const notify = () => { for (const res of clients) { try { res.write(`event: state\ndata: ${Date.now()}\n\n`); } catch { clients.delete(res); } } };
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml = s => String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const authBasic = () => 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

const safeEqual = (a,b) => {
  const aa=Buffer.from(String(a||'')), bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
};
function apiAuthorized(req,u){
  if(ALLOW_UNAUTHENTICATED || !API_TOKEN) return true;
  const supplied=String(req.headers['x-dce-api-token'] || '');
  return safeEqual(supplied,API_TOKEN);
}
function issueEventTicket(){
  const ticket=crypto.randomBytes(24).toString('base64url');
  eventTickets.set(ticket,Date.now()+60_000);
  return ticket;
}
function consumeEventTicket(ticket){
  const expires=eventTickets.get(String(ticket||''));
  eventTickets.delete(String(ticket||''));
  return Number(expires)>Date.now();
}

function integrationStatus(){
  const twilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  return {
    realtime:true,
    email:!!(process.env.DCE_RESEND_API_KEY && process.env.DCE_EMAIL_FROM),
    sms:twilio,
    call:twilio && !!process.env.DCE_CALLER_NUMBER,
    meeting:true,
    portal:true
  };
}

async function sendCommunication(payload){
  const channel=String(payload.channel||'').toLowerCase(), to=String(payload.to||'').trim(), subject=String(payload.subject||''), body=String(payload.body||'');
  if(!to) throw Object.assign(new Error('recipient required'),{status:400});
  if(channel==='email'){
    if(!(process.env.DCE_RESEND_API_KEY && process.env.DCE_EMAIL_FROM)) throw Object.assign(new Error('Email provider not configured'),{status:503});
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${process.env.DCE_RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.DCE_EMAIL_FROM,to:[to],subject:subject||'ForgeFront Project Update',text:body})});
    const j=await r.json().catch(()=>({})); if(!r.ok) throw Object.assign(new Error(j.message||'Email provider rejected the request'),{status:r.status||502});
    return {status:'Sent',reference:j.id||''};
  }
  if(channel==='sms'){
    if(!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER)) throw Object.assign(new Error('SMS provider not configured'),{status:503});
    const form=new URLSearchParams({To:to,From:process.env.TWILIO_FROM_NUMBER,Body:body});
    const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(process.env.TWILIO_ACCOUNT_SID)}/Messages.json`,{method:'POST',headers:{'Authorization':authBasic(),'Content-Type':'application/x-www-form-urlencoded'},body:form});
    const j=await r.json().catch(()=>({})); if(!r.ok) throw Object.assign(new Error(j.message||'SMS provider rejected the request'),{status:r.status||502});
    return {status:'Sent',reference:j.sid||''};
  }
  if(channel==='call'){
    if(!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER && process.env.DCE_CALLER_NUMBER)) throw Object.assign(new Error('Click-to-call provider not configured'),{status:503});
    const twiml=`<Response><Say>Connecting your ForgeFront Systems call.</Say><Dial callerId="${xml(process.env.TWILIO_FROM_NUMBER)}">${xml(to)}</Dial></Response>`;
    const form=new URLSearchParams({To:process.env.DCE_CALLER_NUMBER,From:process.env.TWILIO_FROM_NUMBER,Twiml:twiml});
    const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(process.env.TWILIO_ACCOUNT_SID)}/Calls.json`,{method:'POST',headers:{'Authorization':authBasic(),'Content-Type':'application/x-www-form-urlencoded'},body:form});
    const j=await r.json().catch(()=>({})); if(!r.ok) throw Object.assign(new Error(j.message||'Call provider rejected the request'),{status:r.status||502});
    return {status:'Calling your phone',reference:j.sid||''};
  }
  throw Object.assign(new Error('unsupported communications channel'),{status:400});
}

function renderPortal(tokenRec){
  if(tokenRec && (tokenRec.access==='dce-solar-packet' || tokenRec.role==='Solar Coach Reviewer')){
    return '<!doctype html><html><body style="font-family:system-ui;background:#0b1220;color:#fff;padding:24px"><h1>ForgeFront</h1><p>Former job packet access retired. Use the main ForgeFront command surface.</p><p><a style="color:#3dd6c6" href="/">Open ForgeFront</a></p></body></html>';
  }

  const state=readJsonFile(STATE_FILE,{}), ids=new Set(tokenRec.projectIds||[]), projects=(state.projects||[]).filter(p=>ids.has(p.id));
  const tasks=(state.tasks||[]).filter(x=>ids.has(x.projectId)&&x.status!=='Complete').sort((a,b)=>String(a.due).localeCompare(String(b.due))).slice(0,30);
  const approvals=(state.approvals||[]).filter(x=>ids.has(x.projectId)&&x.status==='Pending').slice(0,20);
  const actions=(state.actions||[]).filter(x=>ids.has(x.projectId)&&x.status!=='Complete').sort((a,b)=>String(a.due).localeCompare(String(b.due))).slice(0,30);
  const onsite=(state.onsite||[]).filter(x=>ids.has(x.projectId)&&x.status!=='Complete').slice(0,30);
  const pubs=(state.publications||[]).filter(x=>!x.projectId||ids.has(x.projectId)).slice(0,12);
  const role=tokenRec.role||'Stakeholder';
  const isExec=['Executive','Internal'].includes(role);
  const rows=projects.map(p=>`<div class="project"><div><h2>${esc(p.code)} — ${esc(p.name)}</h2><p>${esc(p.client)} • ${esc(p.event)} • ${esc(p.venue)}</p></div><div class="health">${esc(p.health||'')}</div><div class="stats"><span>Phase<b>${esc(p.phase)}</b></span><span>Progress<b>${esc(p.progress)}%</b></span><span>Show opens<b>${esc(p.showOpen)}</b></span>${isExec?`<span>Forecast<b>${esc(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(p.forecast||0)))}</b></span>`:''}</div></div>`).join('');
  const list=(title,arr,label)=>`<section><h2>${title}</h2>${arr.length?`<div class="list">${arr.map(x=>`<div class="item"><b>${esc(label(x))}</b><span>${esc(x.owner||x.approver||'')} ${x.due?'• '+esc(x.due):''} ${x.status?'• '+esc(x.status):''}</span></div>`).join('')}</div>`:'<p class="muted">No current items.</p>'}</section>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DCE Stakeholder Portal</title><style>body{margin:0;background:#0e1115;color:#f3f6f9;font:14px system-ui,Segoe UI,Arial}.wrap{max-width:1100px;margin:auto;padding:24px}.top{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:18px 0;border-bottom:1px solid #2a3540}.top h1{margin:0;font-size:24px}.top p{margin:5px 0;color:#98a5b1}.badge{border:1px solid #3a4b57;border-radius:999px;padding:7px 10px;color:#cfeeff}.project,section{margin-top:16px;border:1px solid #2a3540;background:#151a20;border-radius:14px;padding:16px}.project h2,section h2{margin:0;font-size:16px}.project p{color:#99a5b1;margin:5px 0}.health{display:inline-block;margin:8px 0;padding:5px 8px;border:1px solid #3a4b57;border-radius:999px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:10px}.stats span{background:#10151a;border:1px solid #26313a;border-radius:9px;padding:10px;color:#8f9da8;font-size:10px;text-transform:uppercase}.stats b{display:block;color:#f4f7fa;font-size:12px;margin-top:4px;text-transform:none}.list{display:grid;gap:7px;margin-top:10px}.item{padding:10px;background:#10161b;border:1px solid #252f38;border-radius:9px}.item b{display:block;font-size:12px}.item span{display:block;color:#97a4af;font-size:10px;margin-top:4px}.muted{color:#97a4af}@media(max-width:650px){.wrap{padding:14px}.stats{grid-template-columns:1fr 1fr}.top{align-items:flex-start;flex-direction:column}}</style></head><body><div class="wrap"><div class="top"><div><h1>DCE Stakeholder Portal</h1><p>${esc(tokenRec.name)} • ${esc(role)} • Read-only project view</p></div><div class="badge">Updated ${esc(new Date().toLocaleString())}</div></div>${rows||'<section><p>No projects are assigned to this access link.</p></section>'}${list('Next Schedule Commitments',tasks,x=>x.name)}${list('Pending Approvals',approvals,x=>x.item)}${list('Actions & Decisions',actions,x=>x.title)}${['Crew','Vendor','Internal','Executive'].includes(role)?list('On-site / Field Readiness',onsite,x=>x.item):''}<section><h2>Published Updates</h2>${pubs.length?pubs.map(p=>`<div class="item"><b>${esc(p.title)}</b><span>${esc(p.summary||'')}</span></div>`).join(''):'<p class="muted">No published updates yet.</p>'}</section></div></body></html>`;
}


const { execFile } = require('child_process');
const REDIS_HOST = process.env.DCE_REDIS_HOST || '127.0.0.1';
const REDIS_PORT = String(process.env.DCE_REDIS_PORT || 6379);
const REDIS_KEY = 'dce:live';
const REDIS_CHANNEL = 'dce:live';
function publishLiveState(payload){
  try{
    const body = JSON.stringify(payload);
    execFile('redis-cli', ['-h', REDIS_HOST, '-p', REDIS_PORT, 'SET', REDIS_KEY, body, 'EX', '7200'], ()=>{});
    execFile('redis-cli', ['-h', REDIS_HOST, '-p', REDIS_PORT, 'PUBLISH', REDIS_CHANNEL, body], ()=>{});
  }catch(e){ console.error('redis publish failed', e.message); }
}

const mime = {'.html':'text/html; charset=utf-8','.md':'text/markdown; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml; charset=utf-8','.css':'text/css; charset=utf-8'};

const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  try{
    if(req.method==='GET' && u.pathname==='/api/health') return json(res,200,{ok:true,product:'ForgeFront Systems',brand:'ForgeFront Systems',version:'3.0',buildId:appBuildId(),authRequired:(!ALLOW_UNAUTHENTICATED && !!API_TOKEN),time:new Date().toISOString()});
    if(req.method==='GET' && u.pathname==='/api/session/bootstrap'){
      if(!isLoopbackAddress(req.socket.remoteAddress)) return json(res,403,{error:'bootstrap requires loopback'});
      return json(res,200,{ok:true,authRequired:(!ALLOW_UNAUTHENTICATED && !!API_TOKEN),token:API_TOKEN||''});
    }
    const eventRequest=req.method==='GET' && u.pathname==='/api/events';
    if(eventRequest&&!consumeEventTicket(u.searchParams.get('ticket'))) return json(res,401,{error:'unauthorized'});
    const protectedApi=u.pathname.startsWith('/api/')&&!PUBLIC_API.has(u.pathname);
    if(protectedApi&&!apiAuthorized(req,u)) return json(res,401,{error:'unauthorized'});
    // ForgeFront aliases (Wake Industries) — solar paths retained for compatibility
    if(u.pathname.startsWith('/api/forgefront/copilot/')) {
      u.pathname = u.pathname.replace('/api/forgefront/copilot/', '/api/solar/copilot/');
    }
    if(req.method==='GET' && u.pathname==='/api/solar/copilot/live') return json(res,200,globalThis.dceLiveCopilot||{});
    if(req.method==='PUT' && u.pathname==='/api/solar/copilot/live') {
      const body=await readBody(req,256_000);
      if(!body || typeof body!=='object' || Array.isArray(body)) return json(res,400,{error:'invalid live state'});
      globalThis.dceLiveCopilot={...body,updatedAt:new Date().toISOString()};
      publishLiveState(globalThis.dceLiveCopilot);
      notify();
      return json(res,200,{ok:true});
    }
    if(req.method==='POST' && u.pathname==='/api/events/token') return json(res,200,{ticket:issueEventTicket(),expiresInSeconds:60});
    if(req.method==='GET' && u.pathname==='/api/integrations/status') return json(res,200,integrationStatus());
    if(req.method==='GET' && u.pathname==='/api/solar/copilot/preflight') return json(res,200,await livePreflight.check());
    if(u.pathname==='/api/solar/copilot/transcribe' && req.method!=='POST') return json(res,405,{error:'method not allowed'});
    if(req.method==='POST' && u.pathname==='/api/solar/copilot/transcribe') {
      const audio=await readRawBody(req);
      return json(res,200,await solarTranscriber.transcribe(audio));
    }
    if(u.pathname==='/api/solar/copilot/suggest' && req.method!=='POST') return json(res,405,{error:'method not allowed'});
    if(req.method==='POST' && u.pathname==='/api/solar/copilot/suggest') {
      const body=await readBody(req,64_000);
      if(!body || typeof body!=='object' || Array.isArray(body) || typeof body.transcript!=='string') return json(res,400,{error:'invalid copilot request'});
      return json(res,200,await solarCopilot.suggest(body));
    }
    if(req.method==='GET' && u.pathname==='/api/state') return json(res,200,readJsonFile(STATE_FILE,{}));
    if(req.method==='PUT' && u.pathname==='/api/state') { const body=await readBody(req); if(!body || typeof body!=='object') return json(res,400,{error:'invalid state'}); writeJsonFile(STATE_FILE,body); notify(); return json(res,200,{ok:true,revision:body.meta?.revision||0}); }
    if(req.method==='GET' && u.pathname==='/api/events'){
      res.writeHead(200,secureHeaders({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'})); res.write('retry: 2500\n\n'); clients.add(res); const ping=setInterval(()=>{try{res.write(': ping\n\n')}catch{}},20000); req.on('close',()=>{clearInterval(ping);clients.delete(res)}); return;
    }
    if(req.method==='POST' && u.pathname==='/api/comms/send') { const body=await readBody(req); try{return json(res,200,await sendCommunication(body));}catch(e){return json(res,e.status||502,{error:e.message||'send failed'});} }
    if(req.method==='POST' && u.pathname==='/api/comms/inbound'){
      if(!process.env.DCE_WEBHOOK_SECRET) return json(res,503,{error:'inbound webhook not configured'});
      if(!safeEqual(req.headers['x-dce-webhook-secret'],process.env.DCE_WEBHOOK_SECRET)) return json(res,401,{error:'unauthorized'});
      const body=await readBody(req), state=readJsonFile(STATE_FILE,{}); state.communications=state.communications||[]; state.activity=state.activity||[]; const rec={id:'cm_'+crypto.randomBytes(6).toString('hex'),projectId:body.projectId||'',contactId:body.contactId||'',channel:body.channel||'email',direction:'inbound',to:body.to||'DCE',from:body.from||'',subject:body.subject||'',body:body.body||'',status:'Received',time:new Date().toISOString()}; state.communications.unshift(rec); state.activity.unshift({id:'ev_'+crypto.randomBytes(6).toString('hex'),projectId:rec.projectId,kind:rec.channel,message:`Inbound ${rec.channel} from ${rec.from}`,time:rec.time,actor:rec.from}); state.meta=state.meta||{}; state.meta.revision=Number(state.meta.revision||0)+1; state.meta.updatedAt=rec.time; writeJsonFile(STATE_FILE,state); notify(); return json(res,200,{ok:true,id:rec.id});
    }
    if(req.method==='POST' && u.pathname==='/api/access/invite'){
      const body=await readBody(req), db=readJsonFile(ACCESS_FILE,{tokens:{}}), token=crypto.randomBytes(24).toString('base64url'); db.tokens[token]={name:body.name||'Stakeholder',email:body.email||'',role:body.role||'Stakeholder',projectIds:Array.isArray(body.projectIds)?body.projectIds:[],access:body.access||'',active:body.active!==false,createdAt:new Date().toISOString()}; writeJsonFile(ACCESS_FILE,db); return json(res,200,{ok:true,url:`/portal/${token}`});
    }
    if(req.method==='GET' && u.pathname.startsWith('/portal/')){
      const token=u.pathname.slice('/portal/'.length), db=readJsonFile(ACCESS_FILE,{tokens:{}}), rec=db.tokens?.[token]; if(!rec||rec.active===false){res.writeHead(404,secureHeaders({'Content-Type':'text/plain'}));return res.end('Access link not found or disabled.');} const html=renderPortal(rec);res.writeHead(200,secureHeaders({'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}));return res.end(html);
    }

    let rel=u.pathname==='/'?'DCE_Command_Center_V3.html':u.pathname==='/pm'||u.pathname==='/project-management'?'ForgeFront_PM.html':u.pathname==='/edge'?'EDGE_MIRROR.html':decodeURIComponent(u.pathname.replace(/^\//,''));
    if(rel.includes('\0')||rel.includes('..')||path.isAbsolute(rel)){res.writeHead(403);return res.end('Forbidden');}
    if(!STATIC_FILES.has(rel)){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('Not found');}
    const rootResolved=path.resolve(ROOT);
    const file=path.resolve(rootResolved,rel);
    if(!(file===rootResolved||file.startsWith(rootResolved+path.sep))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('Not found');}
    const ext=path.extname(file).toLowerCase();
    const freshAppAsset=ext==='.html'||rel==='DCE_V3_sw.js'||rel==='solar_call_engine.js';
    const headers={'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':freshAppAsset?'no-store':'public, max-age=300'};
    if(ext==='.html')headers['Clear-Site-Data']='"cache"';
    res.writeHead(200,secureHeaders(headers));fs.createReadStream(file).pipe(res);
  }catch(e){console.error(e); if(!res.headersSent)json(res,e.status||500,{error:e.status===413?'request too large':'server error',detail:e.message});else res.end();}
});

if(!['127.0.0.1','localhost','::1'].includes(HOST)&&!API_TOKEN&&!ALLOW_UNAUTHENTICATED){
  console.error('Refusing non-loopback bind without DCE_API_TOKEN. Set DCE_API_TOKEN or explicitly set DCE_ALLOW_UNAUTHENTICATED=1.');
  process.exit(1);
}

server.listen(PORT,HOST,()=>{
  console.log(`ForgeFront Systems V3 running at http://${HOST==='0.0.0.0'?'localhost':HOST}:${PORT}`);
  console.log(`Phone/other PC on the same reachable network can use http://<this-PC-address>:${PORT}`);
  console.log('Keep provider API keys on the server only. Open the app Integrations page to see what is connected.');
});
