import {routeHealthView} from './route-health.mjs';
import {investigationStatus} from './investigation-status.mjs';
import {passphraseFeedback} from './passphrase.mjs';
import { guideStep } from './guide.mjs';
const $=id=>document.getElementById(id);
let auth={},state=null,run=null,envelope=null,guide=null;
let requestBusy=false;
const titles={wait_replenishment:'Wait for replenishment',allocate_substitute:'Use verified substitute',split_capacity:'Split available capacity'};
function text(tag,value,className){const e=document.createElement(tag);e.textContent=String(value??'');if(className)e.className=className;return e;}
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
async function api(action,body={}){const response=await fetch('/api/workflow/'+action,{method:'POST',headers:{'Content-Type':'application/json',...auth},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});const result=await response.json();if(response.status===401){auth={};envelope=null;$('plaintext-ack').checked=false;$('export-passphrase').value='';$('passphrase-feedback').textContent=passphraseFeedback('').message;$('room').hidden=true;$('login').hidden=false;$('admin').focus();}
if(!response.ok)throw new Error(result.error?.message??'Request failed');return result;}
async function busy(button,task){if(requestBusy)return;requestBusy=true;const controls=[...document.querySelectorAll('button,select')];const prior=controls.map(e=>e.disabled);controls.forEach(e=>e.disabled=true);button.setAttribute('aria-busy','true');try{await task();}catch(error){notice(error.message,true);}finally{requestBusy=false;controls.forEach((e,i)=>{if(e.isConnected)e.disabled=prior[i];});button.removeAttribute('aria-busy');if(state&&Object.keys(auth).length)render();}}
async function refresh(){state=await api('status');if(!envelope&&state.pendingConsents?.length){envelope=state.pendingConsents.at(-1);$('consent').hidden=false;$('confirm-phrase').textContent=`APPROVE ${envelope.optionId}`;$('review-detail').textContent=`Restored encrypted review · plan ${envelope.planDigest.slice(0,12)} · expires in ${Math.max(0,Math.ceil((envelope.expires-Date.now())/1000))} seconds. Review the current option before confirming.`;$('typed').value='';}render();}
function render(){
 renderGuide();
 $('operator-identity').textContent='Authenticated operator: '+(state.operator?.id??'local operator')+' · '+(state.operator?.role??'operator');
 $('room').hidden=false;$('login').hidden=true;$('incident').textContent=state.snapshot.incident.summary;$('snapshot-label').textContent=' / '+state.snapshot.snapshotDigest.slice(0,10);
 renderRouteHealth();
 const impact=state.analysis.impacted;$('metrics').replaceChildren(...[[impact.impactedJobCount,'IMPACTED JOBS'],[impact.impactedUnits,'HELD-DEMAND UNITS'],[state.analysis.recovery.feasibleCount,'FEASIBLE PATHS']].map(([n,label])=>{const div=text('div','','metric');div.append(text('strong',n),text('span',label));return div;}));
 $('evidence').replaceChildren(...state.evidence.map(e=>{const div=text('div','','source');div.id=e.evidenceId;div.tabIndex=-1;div.append(text('code',e.evidenceId+' · '+e.source.documentId+' / '+(e.source.lineId??e.source.recordId)),text('p',e.excerpt),text('small','Source field: '+e.source.field+' · Snapshot '+e.snapshotDigest.slice(0,10)));return div;}));
 $('capacity').replaceChildren(...state.analysis.capacity.cells.map(c=>{const div=text('div','','cell');const name=text('strong',c.cellId);name.append(text('small',c.availableHours+' h capacity · $'+c.hourlyCostUsd+'/h'));div.append(name,text('span',c.online?'● ONLINE':'● OFFLINE',c.online?'online':'offline'));return div;}));
 const online=state.snapshot.cells.filter(c=>c.online);$('shock-cell').replaceChildren(...online.map(c=>{const o=text('option',c.cellId);o.value=c.cellId;return o;}));if(online.length)$('shock-cell').value=online.at(-1).cellId;
 const current=[...state.runs].reverse().find(r=>r.run.snapshotDigest===state.snapshot.snapshotDigest);run=current??null;
 $('options').replaceChildren(...state.analysis.recovery.options.map((o,i)=>{
 const card=text('article','','option'+(o.feasible?'':' unavailable'));card.append(text('div',`0${i+1} / ${o.feasible?'FEASIBLE':'CONSTRAINED'}`,'option-status'),text('h3',titles[o.optionId]));
 const numbers=text('div','','numbers');for(const [value,label]of [[o.finishHours==null?'—':o.finishHours+'h','FINISH'],[o.incrementalCostUsd==null?'—':'$'+o.incrementalCostUsd.toLocaleString(),'INCREMENTAL']]){const d=text('div');d.append(text('strong',value),text('small',label));numbers.append(d);}card.append(numbers);
 if(o.feasible){
 const track=document.createElementNS('http://www.w3.org/2000/svg','svg');track.setAttribute('viewBox','0 0 300 18');track.setAttribute('class','timeline');track.setAttribute('role','img');track.setAttribute('aria-label',`${titles[o.optionId]} finishes in ${o.finishHours} hours`);
 const allocations=o.detail?.allocations??o.detail?.draws?.flatMap(d=>d.cells)??[];const horizon=Math.max(...state.analysis.recovery.options.filter(p=>p.feasible).map(p=>p.finishHours),1);const lanes=allocations.length?allocations:[{hours:o.finishHours}];
 lanes.forEach((a,i)=>{const rect=document.createElementNS(track.namespaceURI,'rect');rect.setAttribute('x','0');rect.setAttribute('y',String(i*18/lanes.length));rect.setAttribute('width',String(300*a.hours/horizon));rect.setAttribute('height',String(16/lanes.length));rect.setAttribute('fill',i%2?'#d6f5a5':'#a8c27f');track.append(rect);});card.append(track,text('small',allocations.map(a=>a.cellId+' '+a.hours+'h').join(' / ')||'Replenishment + production'));
 }
 const assumptions=text('details');assumptions.append(text('summary','Assumptions'));for(const a of o.assumptions??[])assumptions.append(text('p',a));card.append(assumptions);
 if(o.rejectReason)card.append(text('p',o.rejectReason));const list=text('ul');for(const c of o.constraints)list.append(text('li',c));card.append(list);
 const sources=text('div');for(const id of o.evidenceIds){const a=text('a',id);a.href='#'+id;a.addEventListener('click',()=>{$('evidence').parentElement.open=true;$(id)?.focus();});sources.append(a,text('span',' '));}card.append(sources);
 const button=text('button','Review this option ↗','secondary');button.setAttribute('aria-label','Review '+titles[o.optionId]);button.dataset.option=o.optionId;button.disabled=!o.feasible||!run?.proposalValid||state.operator?.role==='auditor';button.addEventListener('click',()=>busy(button,async()=>{envelope=await api('review',{runId:run.runId,optionId:o.optionId});$('consent').hidden=false;$('confirm-phrase').textContent=`APPROVE ${o.optionId}`;$('review-detail').textContent=`${titles[o.optionId]} · plan ${envelope.planDigest.slice(0,12)} · review expires in five minutes.`;$('typed').value='';$('typed').focus();notice('Review prepared. Type the exact phrase to accept this recovery decision.');}));card.append(button);return card;
 }));
 $('decision-state').textContent=state.decision.status==='accepted'?'Recovery decision accepted':state.decision.status==='invalidated'?'Scenario changed · review required':state.decision.status==='revoked'?'Acceptance revoked':'No acceptance recorded';
 $('decision-actor').textContent=state.decision.operatorId?'Recorded operator: '+state.decision.operatorId:'';
 $('ledger').textContent=`Hash-chained, tamper-evident · ${state.ledger.count} events · integrity ${state.ledger.ok?'verified':'failed'}`;
 if(envelope?.snapshotDigest!==state.snapshot.snapshotDigest){envelope=null;$('consent').hidden=true;}
 $('reset').disabled=state.operator?.role!=='admin';$('guide-start').disabled=state.operator?.role!=='admin';$('revoke').disabled=state.operator?.role!=='operator';
 $('export').disabled=$('report').disabled=!$('plaintext-ack').checked;
 $('shock').disabled=!state.snapshot.cells.some(c=>c.online);
 if(state.operator?.role==='auditor')for(const id of ['investigate','confirm','shock','reset','revoke','guide-start'])$(id).disabled=true;
 $('model-output').hidden=!run;
 if(!run&&$('investigation-pending').hidden)$('investigation-status').textContent=investigationStatus();
 $('comparison').replaceChildren(...state.runs.filter(r=>r.run.snapshotDigest===state.snapshot.snapshotDigest).map(r=>text('p',`${r.run.sample?'Sample · offline walkthrough; no live AI':r.calls.at(-1)?.returnedModel??'identity unavailable'} · ${(r.run.elapsedMs/1000).toFixed(1)}s · ${r.claims.accepted.length} validated / ${r.claims.rejected.length} rejected · ${r.proposalValid?'proposal valid':r.run.stopReason}`)));
 if(run){$('model-label').textContent=(run.run.sample?'Sample · offline walkthrough; no live AI':'LIVE META · '+(run.calls.at(-1)?.returnedModel??'identity unavailable')) ;$('run-summary').textContent=`${run.proposalValid?'Investigation complete':run.run.stopReason} · ${run.run.turns} turns · ${run.run.toolCalls} read-only calls · ${(run.run.elapsedMs/1000).toFixed(1)}s · ${run.claims.accepted.length} validated source claims · ${run.claims.rejected.length} rejected`;$('narrative').textContent=run.narrative;
 $('claims').replaceChildren(...run.claims.accepted.map(c=>text('p',`✓ ${c.value} ${c.unit} [evidence:${c.evidenceId}] · exact source match`,'claim')),...run.claims.rejected.map(c=>text('p',`Rejected [evidence:${c.evidenceId}]: ${c.reason}`,'claim')));
 $('trace').replaceChildren(...run.run.trace.filter(t=>t.type==='tool_result').map(t=>text('div',`${t.ok?'✓':'×'} ${t.name} · snapshot ${run.run.snapshotDigest.slice(0,12)}`,'trace-row')),...run.calls.map(c=>text('div',`${c.status} · ${c.returnedModel??'no identity'} · ${c.latencyMs}ms · ${c.failure??c.protocol}`,'trace-row')));
 }
}
$('login').addEventListener('submit',event=>{event.preventDefault();busy($('login').querySelector('button'),async()=>{const response=await fetch('/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+$('admin').value},signal:AbortSignal.timeout(12000)});$('admin').value='';const s=await response.json();if(!response.ok)throw new Error(s.error?.message??'Authentication failed');auth={'X-CSRF-Token':s.csrf};await refresh();$('guide-title').focus();notice('Recovery room open. Inspect evidence, then choose an investigation route.');});});
$('investigate').addEventListener('click',()=>busy($('investigate'),async()=>{
 const route=$('provider').selectedOptions[0].textContent,start=Date.now();let observedCall=null,observedAt=0;
 const update=()=>{$('investigation-status').textContent=investigationStatus({phase:'running',elapsedMs:Date.now()-start,route,call:observedCall?{...observedCall,remainingMs:Math.max(0,observedCall.remainingMs-(Date.now()-observedAt))}:null});};
 $('investigation-pending').hidden=false;$('model-output').hidden=true;update();const timer=setInterval(update,1000);
 try{
  notice('Selected route: '+route+'. Investigating with read-only tools. Live runs are bounded to six turns and one minute.');
  const job=await api('investigation-start',{provider:$('provider').value});let result;
  do{if(Date.now()-start>65000)throw Error('Status wait exceeded. The server job remains bounded; refresh status before a deliberate new attempt.');await new Promise(r=>setTimeout(r,700));result=await api('investigation-status',{jobId:job.jobId});observedCall=result.call??null;observedAt=Date.now();update();}while(result.status==='running');
  if(result.status==='failed'){await refresh();throw Error((result.failure||'INVESTIGATION_FAILED_OR_STALE')+'. No replacement answer was generated. Select the route and press Investigate to retry explicitly.');}
  await refresh();
  $('investigation-status').textContent=investigationStatus({phase:run?.proposalValid?'complete':'failed',route});
  notice(run?.proposalValid?'Investigation complete. Compare calculated options and review a decision.':(run?.run.sample?'SAMPLE investigation stopped: ':'LIVE META investigation stopped: ')+run?.run.stopReason+'. No replacement answer was generated. Select the route and press Investigate to retry explicitly.',!run?.proposalValid);
 }catch(error){$('investigation-status').textContent=investigationStatus({phase:'failed',route});throw error;}
 finally{clearInterval(timer);$('investigation-pending').hidden=true;}
}));
$('confirm').addEventListener('click',()=>busy($('confirm'),async()=>{if(!envelope)throw new Error('Prepare a review first');await api('confirm',{nonce:envelope.nonce,typed:$('typed').value});envelope=null;$('consent').hidden=true;await refresh();$('decision-state').focus();notice('Recovery decision accepted. The plan, evidence and your identity are sealed in the ledger.');}));
$('shock').addEventListener('click',()=>busy($('shock'),async()=>{await api('shock',{cellId:$('shock-cell').value});await refresh();notice('Machine outage applied. Prior acceptance is invalid; investigate the changed snapshot.');}));
$('reset').addEventListener('click',()=>busy($('reset'),async()=>{await api('reset');guide=null;envelope=null;$('typed').value='';$('export-passphrase').value='';$('passphrase-feedback').textContent=passphraseFeedback('').message;$('plaintext-ack').checked=false;$('plaintext-options').open=false;await refresh();$('guide-title').textContent='Guided recovery story';$('guide-detail').textContent='Start the guide to follow a fresh recovery decision.';$('guide-next').hidden=true;$('guide-progress').value=0;$('guide-time').textContent='';notice('Fresh recovery scenario loaded. A new investigation is required.');}));
$('revoke').addEventListener('click',()=>busy($('revoke'),async()=>{await api('revoke');envelope=null;$('consent').hidden=true;await refresh();notice('Acceptance revoked.');}));
$('verify').addEventListener('click',()=>busy($('verify'),async()=>{const v=await api('verify');if(guide)guide.verified=v.head;renderGuide();notice(`Ledger verified: ${v.count} events; head ${v.head.slice(0,16)}.`);}));
$('export').addEventListener('click',()=>busy($('export'),async()=>{const packet=await api('export',{acknowledgePlaintext:'EXPORT PLAINTEXT'});download('forgefront-evidence-packet.json',JSON.stringify(packet,null,2),'application/json');if(guide)guide.exported=packet.ledger.head;renderGuide();notice('Verified evidence packet exported. Retain an independent checkpoint separately.');}));

function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderGuide(){
 if(!guide||!state)return;
 if(state.snapshot.snapshotDigest===guide.initialDigest)guide.acceptedInitial=state.decision.status==='accepted';
 const step=guideStep(state,guide);$('guide-title').textContent=`${Math.min(step.index+1,8)} / 8 · ${step.title}`;$('guide-detail').textContent=step.detail;$('guide-progress').value=step.index;$('guide-next').hidden=false;
 $('guide-time').textContent=`${Math.floor((Date.now()-guide.started)/1000)}s elapsed · guided recovery`;
}
$('guide-start').addEventListener('click',()=>busy($('guide-start'),async()=>{await api('reset');await refresh();guide={initialDigest:state.snapshot.snapshotDigest,inspected:false,acceptedInitial:false,exported:false,started:Date.now()};renderGuide();notice('Fresh guided scenario started. Follow each evidence-gated action.');}));
$('guide-next').addEventListener('click',()=>{
 const step=guideStep(state,guide);
 if(step.id==='sources'){$('evidence').parentElement.open=true;guide.inspected=true;$('evidence').firstElementChild?.focus();renderGuide();return;}
 if(step.id==='spark'||step.id==='wonder'){notice(step.id==='spark'?'Select a GREEN Spark Open route, then Investigate.':'Select Muse Wonder, then Investigate.');}if(step.id==='shock')$('shock-cell').value='CELL-MILL-2';
 const target=$(step.target);target.scrollIntoView({behavior:'smooth',block:'center'});if(!target.matches('button,input,select'))target.tabIndex=-1;target.focus();
});
function renderRouteHealth(){if(!state)return;const view=routeHealthView($('provider').value,state.routeHealth);$('provider-status').textContent=view.message;$('provider-status').dataset.light=view.light;$('provider-check').disabled=$('provider').value==='sample'||state.operator?.role==='auditor';}
$('provider').addEventListener('change',renderRouteHealth);
$('provider-check').addEventListener('click',()=>busy($('provider-check'),async()=>{const provider=$('provider').value;notice('Checking selected route · one live request, up to eight seconds.');const result=await api('provider-check',{provider});await refresh();notice(result.light+' · '+result.reason+(result.light==='RED'?'. Choose a GREEN route explicitly.':''),result.light==='RED');}));
setInterval(()=>{if(!requestBusy&&state)renderRouteHealth();},1000);
$('checkpoint').addEventListener('click',()=>busy($('checkpoint'),async()=>{const checkpoint=await api('checkpoint');download('forgefront-independent-checkpoint.json',JSON.stringify(checkpoint,null,2),'application/json');if(guide)guide.checkpoint=checkpoint.head;renderGuide();notice('Checkpoint exported. Move it to independent storage before relying on rollback detection.');}));
$('report').addEventListener('click',()=>busy($('report'),async()=>{download('forgefront-recovery-report.md',(await api('report',{acknowledgePlaintext:'EXPORT PLAINTEXT'})).text,'text/markdown');notice('Readable evidence report downloaded.');}));
$('logout').addEventListener('click',()=>busy($('logout'),async()=>{const r=await fetch('/api/meta/logout',{method:'POST',headers:{'Content-Type':'application/json',...auth},body:'{}'});if(!r.ok)throw Error('Lock request failed');auth={};$('plaintext-ack').checked=false;$('export-passphrase').value='';$('passphrase-feedback').textContent=passphraseFeedback('').message;$('operator-identity').textContent='';state=null;run=null;envelope=null;guide=null;$('room').hidden=true;$('login').hidden=false;$('admin').focus();notice('Session revoked. Authenticate to continue.');}));

$('plaintext-ack').addEventListener('change',()=>{if(state)render();});

$('encrypted-export').addEventListener('click',()=>busy($('encrypted-export'),async()=>{
 const passphrase=$('export-passphrase').value;$('export-passphrase').value='';$('passphrase-feedback').textContent=passphraseFeedback('').message;
 const feedback=passphraseFeedback(passphrase);if(!feedback.ok)throw Error(feedback.message);
 const encrypted=await api('encrypted-export',{passphrase});
 download('forgefront-evidence.encrypted.json',JSON.stringify(encrypted,null,2),'application/json');
 if(guide)guide.exported=state.ledger.head;renderGuide();notice('Encrypted evidence packet exported. Keep the passphrase separately and retain an independent checkpoint.');
}));

$('export-passphrase').addEventListener('input',()=>{$('passphrase-feedback').textContent=passphraseFeedback($('export-passphrase').value).message;});

(async()=>{
 try{
  const response=await fetch('/api/meta/demo-entry',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(12000)});
  if(response.ok){
   const s=await response.json();
   auth={'X-CSRF-Token':s.csrf};
   await refresh();
   $('guide-title').focus();
   notice('Recovery room open. Inspect evidence, then choose an investigation route.');
   return;
  }
 }catch{}
 $('login').hidden=false;
 $('notice').textContent='Open the recovery room to inspect the incident.';
 $('admin').focus();
})();
