import {stageScene,wrapSceneTitle} from './stage-scene.mjs';
import {capacityStatus,stageFor,focusResult,storyView,shockPreview,proofChecklist,consentProgress,proposalBanner,proofActionGate} from './command-center.mjs';
import {certificateComparison,completionStatus,openingStakes,adjacentPath,acceptedFlow,evidencePlainEnglish,evidenceDetailLabel} from './factory-layout.mjs';
import {routeHealthView} from './route-health.mjs';
import {investigationStatus} from './investigation-status.mjs';
import {passphraseFeedback,passphraseInputStatus} from './passphrase.mjs';
import { guideStep,guidedSteps } from './guide.mjs';
const $=id=>document.getElementById(id);
document.querySelector('header').append($('logout'));
const decisionBar=$('guide-next').parentElement;decisionBar.id='decision-bar';decisionBar.setAttribute('aria-label','Recovery actions');const decisionStatus=document.createElement('span');decisionStatus.id='decision-status';decisionBar.insertBefore(decisionStatus,$('guide-next'));$('factory-stage').append(decisionBar);
let auth={},state=null,run=null,envelope=null,guide=null;
let requestBusy=false;let inspectedTask=0;
let guideHistory=[],reviewIndex=null,reviewContext=null;
function highlightEvidence(id){
 for(const element of document.querySelectorAll('.evidence-linked'))element.classList.remove('evidence-linked');
 for(const element of document.querySelectorAll('[data-evidence="'+CSS.escape(id)+'"],#'+CSS.escape(id)))element.classList.add('evidence-linked');
}
const work=document.createElement('div');work.id='britt-work';$('prior-work').before(work);work.append($('prior-work'),$('britt-proposal'));
const taskActions=document.createElement('div');taskActions.id='britt-controls';$('britt-approve').before(taskActions);taskActions.append($('britt-approve'),$('britt-decline'));


function showStage(stage){
 document.body.dataset.activeStage=stage;
 if(!document.querySelector('[data-stage="'+stage+'"]'))return;
 for(const panel of document.querySelectorAll('[data-stage]'))panel.hidden=panel.dataset.stage!==stage;
 for(const button of document.querySelectorAll('[data-view]')){if(button.dataset.view===stage)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');}
 if(state){renderFactory();renderCapacity();}
}
function renderCapacity(){const preview=shockPreview(state,document.body.dataset.activeStage,$('shock-cell').value);$('capacity').replaceChildren(...state.analysis.capacity.cells.map(c=>{const div=text('div','','cell');const name=text('strong',c.cellId);name.append(text('small',c.availableHours+' h capacity · $'+c.hourlyCostUsd+'/h'));div.append(name,text('span',capacityStatus(c,preview),c.online?'online':'offline'));return div;}));}
function focusPanel(id){const stage=stageFor(id);if(stage)showStage(stage);let target=id;if(guide&&$(id)&&getComputedStyle($(id)).display==='none')target=id==='encrypted-export'&&!passphraseFeedback($('export-passphrase').value).ok?'export-passphrase':'guide-next';focusResult(target,{showStage});}
function recap(title,detail,target){$('recap-title').textContent=title;$('recap-detail').textContent=detail;if(target)focusPanel(target);}
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{showStage(button.dataset.view);const panel=document.querySelector('[data-stage="'+button.dataset.view+'"]');panel.tabIndex=-1;panel.focus({preventScroll:true});});
function renderStory(){
 const view=storyView(state,guide);$('story-opening').textContent=view.opening;$('story-schedule').textContent=view.schedule;
 $('result-metrics').replaceChildren(...[[state.analysis.impacted.impactedUnits,'PARTS AT STAKE'],[view.finishHours==null?'Pending':view.finishHours+'h','ACCEPTED PLAN'],[view.savedHours==null?'Pending':view.savedHours+'h','VS REPLENISHMENT']].map(([value,label])=>{const item=text('div','','metric');item.append(text('strong',value),text('span',label));return item;}));
 $('recovery-timeline').replaceChildren(...[String(state.board?.tasks?.length??0)+' tracked tasks · '+String(state.board?.tasks?.filter(t=>t.status==='Done').length??0)+' done · '+String(state.board?.tasks?.filter(t=>t.status==='Blocked').length??0)+' blocked',view.opening,view.accepted?'Human decision accepted · '+titles[state.decision.optionId]:'Human decision awaiting acceptance',view.secondShock?(view.accepted?'Second shock handled · revised plan accepted':'Second shock applied · fresh investigation and acceptance required'):'Second shock awaits your challenge',view.proofComplete?`Evidence verified and exported · ${state.ledger.count} events`:'Verify the ledger, export the encrypted packet and retain its checkpoint'].map(value=>text('li',value)));
}
const titles={wait_replenishment:'Wait for replenishment',allocate_substitute:'Use verified substitute',split_capacity:'Split available capacity'};
function text(tag,value,className){const e=document.createElement(tag);e.textContent=String(value??'');if(className)e.className=className;return e;}
function notice(message,error=false){document.body.dataset.actionError=String(error);$('notice').textContent=message;$('notice').classList.toggle('error',error);}
async function api(action,body={}){const response=await fetch('/api/workflow/'+action,{method:'POST',headers:{'Content-Type':'application/json',...auth},body:JSON.stringify(body),signal:AbortSignal.timeout(action==='britt-draft'?55000:12000)});const result=await response.json();if(response.status===401){auth={};envelope=null;$('plaintext-ack').checked=false;$('export-passphrase').value='';$('passphrase-feedback').textContent=passphraseInputStatus('').message;$('room').hidden=true;$('login').hidden=false;$('admin').focus();}
if(!response.ok)throw new Error(result.error?.message??'Request failed');return result;}
async function busy(button,task){if(requestBusy)return;requestBusy=true;const controls=[...document.querySelectorAll('button,select')];const prior=controls.map(e=>e.disabled);controls.forEach(e=>e.disabled=true);button.setAttribute('aria-busy','true');try{await task();}catch(error){notice(error.message,true);if(state){const target=stageFor(button.id)?button.id:button.dataset.option?'options':null;if(target)focusPanel(target);}}finally{requestBusy=false;controls.forEach((e,i)=>{if(e.isConnected)e.disabled=prior[i];});button.removeAttribute('aria-busy');if(state&&Object.keys(auth).length){render();if(guide&&reviewIndex===null){const stage=stageFor(guideStep(state,guide).target);if(stage)showStage(stage);}}}}
async function refresh(){state=await api('status');if(!envelope&&state.pendingConsents?.length){envelope=state.pendingConsents.at(-1);$('consent').hidden=false;$('confirm-phrase').textContent=`APPROVE ${envelope.optionId}`;$('review-detail').textContent=`Restored encrypted review · plan ${envelope.planDigest.slice(0,12)} · expires in ${Math.max(0,Math.ceil((envelope.expires-Date.now())/1000))} seconds. Review the current option before confirming.`;$('typed').value='';}render();}
function render(){
 renderGuide();
 renderStory();
 renderFactory();
 $('operator-identity').textContent='Authenticated operator: '+(state.operator?.id??'local operator')+' · '+(state.operator?.role??'operator');
 $('room').hidden=false;$('login').hidden=true;$('incident').textContent=state.snapshot.incident.summary;$('snapshot-label').textContent=' / '+state.snapshot.snapshotDigest.slice(0,10);
 renderRouteHealth();
 $('shock-consequence').textContent=state.decision.status==='accepted'?'Will invalidate acceptance for '+titles[state.decision.optionId]:state.decision.status==='invalidated'?'Prior acceptance invalidated · fresh investigation required':'';
 const previous=guideHistory[0]?.state;const changed=previous&&previous.snapshot.snapshotDigest!==state.snapshot.snapshotDigest;$('constraint-change').hidden=!changed;$('constraint-change').textContent=changed?state.snapshot.cells.filter(c=>!c.online).map(c=>c.cellId+': '+(previous.snapshot.cells.find(p=>p.cellId===c.cellId)?.availableHours??c.availableHours)+'h available → OFFLINE').join(' · ')+' · '+previous.analysis.recovery.feasibleCount+' → '+state.analysis.recovery.feasibleCount+' feasible paths':'';
 const impact=state.analysis.impacted;$('metrics').replaceChildren(...[[impact.impactedJobCount,'IMPACTED JOBS'],[impact.impactedUnits,'HELD-DEMAND UNITS'],[state.analysis.recovery.feasibleCount,'FEASIBLE PATHS']].map(([n,label])=>{const div=text('div','','metric');div.append(text('strong',n),text('span',label));return div;}));
 $('evidence').replaceChildren(...state.evidence.map(e=>{const div=text('div','','source evidence-card');div.id=e.evidenceId;div.dataset.evidence=e.evidenceId;div.tabIndex=0;div.addEventListener('focus',()=>highlightEvidence(e.evidenceId));div.addEventListener('pointerenter',()=>highlightEvidence(e.evidenceId));const plain=evidencePlainEnglish(e);const headline=text('p','','evidence-headline');if(e.quantity)headline.append(document.createTextNode(plain.replace(String(e.quantity.value),'').trim()+' '),text('strong',String(e.quantity.value),'evidence-figure'));else headline.textContent=plain;const detail=text('details','','evidence-raw');detail.append(text('summary','Source detail'),text('code',evidenceDetailLabel(e)),text('small',e.excerpt+' · Snapshot '+e.snapshotDigest.slice(0,10)));div.append(headline,detail);return div;}));
 renderCapacity();
 const online=state.snapshot.cells.filter(c=>c.online);$('shock-cell').replaceChildren(...online.map(c=>{const o=text('option',c.cellId);o.value=c.cellId;return o;}));if(online.length)$('shock-cell').value=online.at(-1).cellId;
 const current=[...state.runs].reverse().find(r=>r.run.snapshotDigest===state.snapshot.snapshotDigest);run=current??null;
 $('evidence').parentElement.open=document.body.dataset.activeStage==='incident'||$('evidence').parentElement.open;
 $('options').replaceChildren(...state.analysis.recovery.options.map((o,i)=>{
 const card=text('article','','option'+(o.feasible?'':' unavailable'));card.append(text('div',`0${i+1} / ${o.feasible?'FEASIBLE':'CONSTRAINED'}`,'option-status'),text('h3',(o.feasible?'':'× CONSTRAINED · ')+titles[o.optionId]));
 const numbers=text('div','','numbers');for(const [value,label]of [[o.finishHours==null?'—':o.finishHours+'h','FINISH'],[o.incrementalCostUsd==null?'—':'$'+o.incrementalCostUsd.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}),'INCREMENTAL']]){const d=text('div');d.append(text('strong',value),text('small',label));numbers.append(d);}card.append(numbers);
 if(o.feasible){
 const track=document.createElementNS('http://www.w3.org/2000/svg','svg');track.setAttribute('viewBox','0 0 300 18');track.setAttribute('class','timeline');track.setAttribute('role','img');track.setAttribute('aria-label',`${titles[o.optionId]} finishes in ${o.finishHours} hours`);
 const allocations=o.detail?.allocations??o.detail?.draws?.flatMap(d=>d.cells)??[];const horizon=Math.max(...state.analysis.recovery.options.filter(p=>p.feasible).map(p=>p.finishHours),1);const lanes=allocations.length?allocations:[{hours:o.finishHours}];
 lanes.forEach((a,i)=>{const rect=document.createElementNS(track.namespaceURI,'rect');rect.setAttribute('x','0');rect.setAttribute('y',String(i*18/lanes.length));rect.setAttribute('width',String(300*a.hours/horizon));rect.setAttribute('height',String(16/lanes.length));rect.setAttribute('fill',i%2?'#d6f5a5':'#a8c27f');track.append(rect);});card.append(track,text('small',allocations.map(a=>a.cellId+' '+a.hours+'h').join(' / ')||'Replenishment + production'));
 }
 const assumptions=text('details');assumptions.append(text('summary','Assumptions'));for(const a of o.assumptions??[])assumptions.append(text('p',a));card.append(assumptions);
 if(o.rejectReason)card.append(text('p',o.rejectReason));const list=text('ul');for(const c of o.constraints)list.append(text('li',c));card.append(list);
 const sources=text('div');for(const id of o.evidenceIds){const a=text('a',id);a.href='#'+id;a.addEventListener('click',()=>{$('evidence').parentElement.open=true;focusPanel('evidence');$(id)?.focus();});sources.append(a,text('span',' '));}card.append(sources);
 const button=text('button',o.feasible?(envelope?.optionId===o.optionId?'● Selected path':'○ Select this path'):'Constrained · not selectable','secondary');button.setAttribute('role','radio');button.setAttribute('aria-checked',String(envelope?.optionId===o.optionId));button.setAttribute('aria-label',o.feasible?'Review '+titles[o.optionId]:titles[o.optionId]+' constrained');button.dataset.option=o.optionId;button.setAttribute('aria-disabled',String(!o.feasible));button.disabled=!o.feasible||!run?.proposalValid||state.operator?.role==='auditor';if(o.feasible){const selectPath=()=>busy(button,async()=>{envelope=await api('review',{runId:run.runId,optionId:o.optionId});$('consent').hidden=false;$('confirm-phrase').textContent=`APPROVE ${o.optionId}`;const changed=state.decision.status==='invalidated'?`Revised after capacity change · ${state.analysis.recovery.feasibleCount} feasible paths · `:'';$('review-detail').textContent=`${changed}${titles[o.optionId]} · plan ${envelope.planDigest.slice(0,12)} · type APPROVE ${o.optionId} exactly.`;$('typed').value='';const progress=consentProgress($('confirm-phrase').textContent,'');$('confirm').disabled=true;$('consent-feedback').textContent=progress.label+' · Accept stays disabled until the exact phrase matches.';focusPanel('typed');recap('Your review is prepared.','The typed phrase binds this calculated option to the evidence and your identity.');notice('Review prepared. Type the exact phrase to accept this recovery decision.');renderFactory();if(guide&&reviewIndex===null)renderGuide();});button.addEventListener('click',selectPath);card.tabIndex=0;card.addEventListener('click',event=>{if(reviewIndex!==null||button.disabled)return;if(event.target===button||button.contains(event.target))return;selectPath();});}else{card.tabIndex=-1;card.setAttribute('aria-disabled','true');}card.dataset.selected=String(envelope?.optionId===o.optionId);card.append(button);return card;
 }));
 $('revoke').hidden=state.decision.status!=='accepted';
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
 renderBoard();
 for(const item of proofChecklist(state,guide??{})){const field=$(item.id).closest('fieldset');field.dataset.complete=String(item.done);let status=field.querySelector('.proof-status');if(!status){status=text('small','','proof-status');field.append(status);}field.querySelector('legend').textContent=item.label;const gate=guide?proofActionGate(state,guide):{};const enabled=gate[item.id];status.textContent=item.done?'✓ Complete · current ledger':enabled===false?(item.id==='verify'?'1 · Verify first · currently waiting':item.id==='encrypted-export'?'2 · Waiting on verify · then separate passphrase':'3 · Waiting on sealed packet'):(item.id==='verify'?'1 · Verify the anchored history · enabled now':item.id==='encrypted-export'?'2 · Seal with separate passphrase · enabled now':'3 · Retain independent checkpoint · enabled now');}
 $('export-passphrase').disabled=reviewIndex!==null||Boolean(guide&&guide.verified!==state.ledger.head);
 if(guide){const gate=proofActionGate(state,guide);for(const [id,enabled] of Object.entries(gate)){const control=$(id);if(!control)continue;const blocked=!enabled||(id==='encrypted-export'&&!passphraseFeedback($('export-passphrase').value).ok);control.disabled=blocked;control.classList.toggle('secondary',id!=='verify'||Boolean(gate['encrypted-export']));}}

}
$('login').addEventListener('submit',event=>{event.preventDefault();busy($('login').querySelector('button'),async()=>{const response=await fetch('/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+$('admin').value},signal:AbortSignal.timeout(12000)});$('admin').value='';const s=await response.json();if(!response.ok)throw new Error(s.error?.message??'Authentication failed');auth={'X-CSRF-Token':s.csrf};await refresh();$('guide-title').focus();notice('Recovery room open. Inspect evidence, then choose an investigation route.');});});
$('investigate').addEventListener('click',()=>busy($('investigate'),async()=>{
 focusPanel('investigation-status');
 const route=$('provider').selectedOptions[0].textContent,start=Date.now();let observedCall=null,observedAt=0;
 const update=()=>{$('investigation-status').textContent=investigationStatus({phase:'running',elapsedMs:Date.now()-start,route,call:observedCall?{...observedCall,remainingMs:Math.max(0,observedCall.remainingMs-(Date.now()-observedAt))}:null})+' Sources in scope: '+state.evidence.length+' records covering stock, orders and cell capacity.';};
 $('investigation-pending').hidden=false;renderFactory();$('model-output').hidden=true;update();const timer=setInterval(update,1000);
 try{
  notice('Selected route: '+route+'. Investigating with read-only tools. Live runs are bounded to six turns and one minute.');
  const job=await api('investigation-start',{provider:$('provider').value});let result;
  do{if(Date.now()-start>65000)throw Error('Status wait exceeded. The server job remains bounded; refresh status before a deliberate new attempt.');await new Promise(r=>setTimeout(r,700));result=await api('investigation-status',{jobId:job.jobId});observedCall=result.call??null;observedAt=Date.now();update();$('britt-activity').textContent='BRITT 4.0 · '+(observedCall?'Call '+observedCall.number+' · '+observedCall.status+' · '+observedCall.sourcesRead+' source records read':'Planning evidence investigation');}while(result.status==='running');
  if(result.status==='failed'){await refresh();throw Error((result.failure||'INVESTIGATION_FAILED_OR_STALE')+'. No replacement answer was generated. Select the route and press Investigate to retry explicitly.');}
  await refresh();
  $('investigation-status').textContent=investigationStatus({phase:run?.proposalValid?'complete':'failed',route});
  if(run?.proposalValid)recap('The investigation is ready.',`${run.claims.accepted.length} source claims validated; ${state.analysis.recovery.feasibleCount} feasible recovery paths computed. Compare the options before accepting.`, 'model-output');
  else focusResult('model-output',{document,showStage});
  notice(run?.proposalValid?'Investigation complete. Compare calculated options and review a decision.':(run?.run.sample?'SAMPLE investigation stopped: ':'LIVE META investigation stopped: ')+run?.run.stopReason+'. No replacement answer was generated. Select the route and press Investigate to retry explicitly.',!run?.proposalValid);
 }catch(error){$('investigation-status').textContent=investigationStatus({phase:'failed',route});throw error;}
 finally{clearInterval(timer);$('investigation-pending').hidden=true;if(guide)focusPanel(guideStep(state,guide).target);renderFactory();}
}));
$('confirm').addEventListener('click',()=>busy($('confirm'),async()=>{if(!envelope)throw new Error('Prepare a review first');await api('confirm',{nonce:envelope.nonce,typed:$('typed').value});envelope=null;$('consent').hidden=true;await refresh();showStage('board');await draftBritt();recap('The human decision is recorded.',storyView(state,guide).secondShock?'The revised plan is sealed to the new evidence. Verify and retain the recovery proof.':'Your acceptance is sealed to this plan and source snapshot. Challenge it with a cell outage.',state.britt?.proposal?'britt-approve':'decision-state');notice('Recovery decision accepted. The plan, evidence and your identity are sealed in the ledger.');}));
 $('shock-cell').addEventListener('change',()=>{const preview=$('shock-preview');if(preview)preview.textContent=$('shock-cell').value+' PREVIEW - not applied · silver dashed preview until Apply second shock.';if(state){renderFactory();renderCapacity();}});
$('shock').addEventListener('click',()=>busy($('shock'),async()=>{await api('shock',{cellId:$('shock-cell').value});await refresh();recap('The second shock changed the plan.','The prior acceptance is invalid. Investigate the recalculated capacity before a fresh decision.','capacity');notice('Machine outage applied. Prior acceptance is invalid; investigate the changed snapshot.');}));
$('reset').addEventListener('click',()=>busy($('reset'),async()=>{await api('reset');guide=null;guideHistory=[];reviewIndex=null;reviewContext=null;$('guided-steps').replaceChildren();$('guide-back').hidden=true;envelope=null;showStage('incident');recap('The incident is ready.','Start the guided recovery to trace every decision.');$('typed').value='';$('export-passphrase').value='';$('passphrase-feedback').textContent=passphraseInputStatus('').message;$('plaintext-ack').checked=false;$('plaintext-options').open=false;await refresh();$('guide-title').textContent='Guided recovery story';$('guide-detail').textContent='Start the guide to follow a fresh recovery decision.';$('guide-next').hidden=true;$('guide-progress').value=0;
 $('guide-time').textContent='';focusPanel('incident');notice('Fresh recovery scenario loaded. A new investigation is required.');}));
$('revoke').addEventListener('click',()=>busy($('revoke'),async()=>{await api('revoke');envelope=null;$('consent').hidden=true;await refresh();recap('The acceptance is revoked.','Review the current source evidence and calculated options before a new decision.','decision-state');notice('Acceptance revoked.');}));
$('verify').addEventListener('click',()=>busy($('verify'),async()=>{const v=await api('verify');if(guide)guide.verified=v.head;renderGuide();renderStory();recap('The history checks out.',`${v.count} events verified against the anchored head. Export the encrypted packet and checkpoint.`,'ledger');notice(`Ledger verified: ${v.count} events; head ${v.head.slice(0,16)}.`);}));
$('export').addEventListener('click',()=>busy($('export'),async()=>{const packet=await api('export',{acknowledgePlaintext:'EXPORT PLAINTEXT'});download('forgefront-evidence-packet.json',JSON.stringify(packet,null,2),'application/json');if(guide)guide.exported=packet.ledger.head;renderGuide();renderStory();focusPanel('story-results');notice('Verified evidence packet exported. Retain an independent checkpoint separately.');}));

function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderGuide(){
 for(const e of document.querySelectorAll('.next-action'))e.classList.remove('next-action');
 document.body.dataset.guided=String(Boolean(guide));$('guide-start').hidden=Boolean(guide);
 if(!guide||!state||reviewIndex!==null)return;
 if(state.snapshot.snapshotDigest===guide.initialDigest)guide.acceptedInitial=state.decision.status==='accepted';
 const step=guideStep(state,guide);document.body.dataset.guided='true';document.body.dataset.guideComplete=String(step.id==='complete');
 if(!guideHistory.length||guideHistory.at(-1).step.id!==step.id){guideHistory.push({step:structuredClone(step),state:structuredClone(state)});const stage=stageFor(step.target);if(stage)showStage(stage);}
 renderStepRail();$('guide-back').hidden=false;$('guide-back').disabled=(reviewIndex??guideHistory.length-1)===0;
 $('guide-next').textContent=reviewIndex!==null?'Next · return through history':({sources:'Inspect source evidence',sample:'Run Sample investigation',spark:'Run Spark Open',wonder:'Run Wonder',accept:envelope?'Accept recovery decision':'Review recovery option',board:state.britt?.proposal?'Approve Britt’s proposal':'Draft recovery tasks',shock:'Apply second shock',recover:'Reinvestigate recovery',reaccept:envelope?'Accept revised decision':'Review revised option','board-revised':state.britt?.proposal?'Approve revised tasks':'Draft revised tasks',export:guide.verified!==state.ledger.head?'Verify ledger':guide.exported!==state.ledger.head?'Seal evidence packet':'Retain checkpoint',complete:'Recovery complete'}[step.id]??'Show next action');
 $('guide-start').hidden=step.id!=='restart';$('guide-title').textContent=step.id==='complete'?'Recovery story complete':`Step ${Math.min(step.index+1,step.total)} of ${step.total} · ${step.title}`;$('guide-detail').textContent=step.detail;$('guide-progress').max=step.total;$('guide-progress').value=step.index;$('guide-next').hidden=step.id==='complete';$('guide-next').setAttribute('aria-label',$('guide-next').textContent+(['sample','spark','wonder','recover'].includes(step.id)?' · '+$('provider').selectedOptions[0].textContent:''));$(step.target)?.classList.add('next-action');
 if(['accept','reaccept'].includes(step.id)&&envelope){const progress=consentProgress($('confirm-phrase').textContent,$('typed').value);$('guide-next').disabled=!progress.enabled;$('confirm').disabled=!progress.enabled;$('consent-feedback').textContent=progress.label+(progress.enabled?'':' · Accept stays disabled until the exact phrase matches.');}
 if(step.id==='export'&&guide.verified===state.ledger.head&&guide.exported!==state.ledger.head)$('guide-next').disabled=!passphraseFeedback($('export-passphrase').value).ok;
 $('decision-status').textContent=step.id==='complete'?completionStatus(state):step.id==='shock'?'INVALIDATING ACTION · will invalidate '+(titles[state.decision.optionId]??'accepted plan'):step.id==='board-revised'?'Approved revised plan · replacement tasks await approval':step.id==='board'?(state.britt?.proposal?'PROPOSED · UNTRACKED UNTIL APPROVAL':'Draft recovery tasks'):step.id==='export'?((state.board?.tasks?.length??0)+' tracked · '+(state.board?.tasks?.filter(t=>t.status==='Done').length??0)+' done · '+(state.board?.tasks?.filter(t=>t.status==='Blocked').length??0)+' blocked'):step.id==='reaccept'?'PRIOR ACCEPTANCE INVALIDATED · fresh review required':'';
 $('britt-activity').replaceChildren(text('strong','BRITT 4.0'),text('span',state.britt?.proposal?'PROPOSED · UNTRACKED UNTIL APPROVAL':state.decision.status==='invalidated'?'Second shock · evidence and plan review required':state.decision.status==='accepted'?('Human recovery accepted · '+(state.board?.tasks?.length??0)+' tracked · '+(state.board?.tasks?.filter(t=>t.status==='Blocked').length??0)+' blocked · '+(state.board?.tasks?.filter(t=>t.status==='Done').length??0)+' done'):'Evidence → calculations → human decision'));
 $('export-passphrase').disabled=guide.verified!==state.ledger.head;
 $('guide-time').textContent=`${Math.floor((Date.now()-guide.started)/1000)}s elapsed · guided recovery`;
}
$('guide-start').addEventListener('click',()=>busy($('guide-start'),async()=>{await api('reset');await refresh();guide={mode:$('provider').value==='sample'?'offline':'live',initialDigest:state.snapshot.snapshotDigest,inspected:false,acceptedInitial:false,exported:false,started:Date.now(),boardEnabled:true};guideHistory=[];reviewIndex=null;reviewContext=null;renderGuide();renderStory();recap('The recovery mission has started.','Inspect the certificate and receiving evidence. Each next step advances on recorded results.','incident');notice('Fresh guided scenario started. Follow each evidence-gated action.');}));
$('guide-next').addEventListener('click',()=>{
 if(reviewIndex!==null){const next=reviewIndex+1;if(next>=guideHistory.length-1){exitReview();focusPanel(guideStep(state,guide).target);}else viewPast(next);return;}
 const step=guideStep(state,guide);
 if(step.id==='sources'){$('evidence').parentElement.open=true;guide.inspected=true;renderGuide();focusPanel('investigate');return;}
 if(['spark','wonder','sample','recover'].includes(step.id)){
  if(step.id==='spark')$('provider').value='baseten';if(step.id==='wonder')$('provider').value='wonder';if(step.id==='sample')$('provider').value='sample';if(step.id==='recover'&&step.provider)$('provider').value=step.provider;
  focusPanel('investigate');$('investigate').click();return;
 }
 if(step.id==='accept'||step.id==='reaccept'){focusPanel('options');if(!envelope){const preferred=document.querySelector('[data-option="allocate_substitute"]:not(:disabled)')??document.querySelector('[data-option]:not(:disabled)');preferred?.click();}else if($('typed').value===$('confirm-phrase').textContent)$('confirm').click();else focusPanel('typed');return;}
 if(step.id==='board'||step.id==='board-revised'){focusPanel('britt-draft');if(state.britt?.proposal)$('britt-approve').click();else $('britt-draft').click();return;}
 if(step.id==='shock'){$('shock').click();return;}
 if(step.id==='export'){if(guide.verified!==state.ledger.head){$('verify').click();return;}if(guide.exported!==state.ledger.head){if(passphraseFeedback($('export-passphrase').value).ok)$('encrypted-export').click();else focusPanel('export-passphrase');return;}if(guide.checkpoint!==state.ledger.head){$('checkpoint').click();return;}}
 focusPanel(step.target);
});
function renderStepRail(){
 const current=guideHistory[reviewIndex??guideHistory.length-1]?.step.id;
 $('guided-steps').replaceChildren(...guidedSteps(guide.mode,guide.boardEnabled).filter(s=>s.id!=='complete'||guideHistory.some(e=>e.step.id==='complete')).map((step,number)=>{const index=guideHistory.findLastIndex(e=>e.step.id===step.id),b=text('button',(step.id==='complete'?'✓':String(number+1).padStart(2,'0'))+' '+step.title);b.disabled=index<0;b.setAttribute('aria-current',current===step.id?'step':'false');b.setAttribute('aria-label',(index<0?'Upcoming: ':current===step.id?'Current: ':'Review completed: ')+step.title);b.addEventListener('click',()=>index===guideHistory.length-1?(exitReview(),focusPanel(guideStep(state,guide).target)):viewPast(index));return b;}));
}
function exitReview(){
 reviewIndex=null;if(reviewContext){for(const control of reviewContext.controls)if(control.element.isConnected)control.element.disabled=control.disabled;envelope=reviewContext.envelope;$('typed').value=reviewContext.typed;$('confirm-phrase').textContent=reviewContext.phrase;$('review-detail').textContent=reviewContext.detail;$('consent').hidden=reviewContext.consentHidden;$('export-passphrase').value=reviewContext.passphrase;reviewContext=null;}render();
}
function viewPast(index){
 if(reviewIndex===null)reviewContext={controls:[...document.querySelectorAll('#stage-deck button,#stage-deck input,#stage-deck select')].map(element=>({element,disabled:element.disabled})),envelope:structuredClone(envelope),typed:$('typed').value,phrase:$('confirm-phrase').textContent,detail:$('review-detail').textContent,consentHidden:$('consent').hidden,passphrase:$('export-passphrase').value};
 reviewIndex=index;$('guide-next').disabled=false;const entry=guideHistory[index],current=state,currentEnvelope=envelope,currentRun=run;try{state=structuredClone(entry.state);envelope=structuredClone(entry.envelope??null);render();}finally{state=current;envelope=currentEnvelope;run=currentRun;}
 showStage(stageFor(entry.step.target));$('guide-title').textContent='Review · '+entry.step.title;$('guide-detail').textContent='Recorded step · decisions and ledger remain intact.';
 for(const e of document.querySelectorAll('#stage-deck button,#stage-deck input,#stage-deck select'))e.disabled=true;
 $('guide-next').hidden=false;$('guide-next').textContent='Next · return through history';$('guide-back').disabled=index===0;renderStepRail();$('guide-title').focus();
}
$('guide-back').addEventListener('click',()=>{const index=reviewIndex??guideHistory.length-1;if(index>0)viewPast(index-1);});
function renderRouteHealth(){if(!state)return;const view=routeHealthView($('provider').value,state.routeHealth);$('provider-status').textContent=view.message;$('provider-status').dataset.light=view.light;$('route-checklist').textContent=$('provider').value==='sample'?'○ Nonce: not requested · ○ Identity: not requested · offline sample':view.light==='GREEN'?'✓ Nonce matched · ✓ Model identity matched':view.light==='RED'?'× Nonce failed · × Identity failed · check another route':'○ Nonce check pending · ○ Identity check pending';$('investigation-empty').hidden=Boolean(run); $('provider-check').hidden=$('provider').value==='sample';$('provider-check').disabled=reviewIndex!==null||$('provider').value==='sample'||state.operator?.role==='auditor';}
$('provider').addEventListener('change',()=>{if(guide){guide.mode=$('provider').value==='sample'?'offline':'live';renderGuide();}renderRouteHealth();});
$('provider-check').addEventListener('click',()=>busy($('provider-check'),async()=>{const provider=$('provider').value;notice('Checking selected route · one live request, up to eight seconds.');const result=await api('provider-check',{provider});await refresh();focusPanel('provider-status');notice(result.light+' · '+result.reason+(result.light==='RED'?'. Choose a GREEN route explicitly.':''),result.light==='RED');}));
setInterval(()=>{if(!requestBusy&&state)renderRouteHealth();},1000);
$('checkpoint').addEventListener('click',()=>busy($('checkpoint'),async()=>{const checkpoint=await api('checkpoint');download('forgefront-independent-checkpoint.json',JSON.stringify(checkpoint,null,2),'application/json');if(guide)guide.checkpoint=checkpoint.head;renderGuide();renderStory();recap(storyView(state,guide).proofComplete?'Recovery story complete.':'The checkpoint is exported.',storyView(state,guide).proofComplete?'The human decision, second-shock recovery and verified evidence are retained.':'Keep the checkpoint separately from your evidence packet.','story-results');notice('Checkpoint exported. Move it to independent storage before relying on rollback detection.');}));
$('report').addEventListener('click',()=>busy($('report'),async()=>{download('forgefront-recovery-report.md',(await api('report',{acknowledgePlaintext:'EXPORT PLAINTEXT'})).text,'text/markdown');focusPanel('story-results');notice('Readable evidence report downloaded.');}));
$('logout').addEventListener('click',()=>busy($('logout'),async()=>{const r=await fetch('/api/meta/logout',{method:'POST',headers:{'Content-Type':'application/json',...auth},body:'{}'});if(!r.ok)throw Error('Lock request failed');auth={};$('plaintext-ack').checked=false;$('export-passphrase').value='';$('passphrase-feedback').textContent=passphraseInputStatus('').message;$('operator-identity').textContent='';state=null;run=null;envelope=null;guide=null;reviewContext=null;guideHistory=[];reviewIndex=null;$('room').hidden=true;$('login').hidden=false;$('admin').focus();notice('Session revoked. Authenticate to continue.');}));

$('plaintext-ack').addEventListener('change',()=>{if(state)render();});

$('encrypted-export').addEventListener('click',()=>busy($('encrypted-export'),async()=>{
 const passphrase=$('export-passphrase').value;$('export-passphrase').value='';$('passphrase-feedback').textContent=passphraseInputStatus('').message;
 const feedback=passphraseFeedback(passphrase);if(!feedback.ok)throw Error(feedback.message);
 const encrypted=await api('encrypted-export',{passphrase});
 download('forgefront-evidence.encrypted.json',JSON.stringify(encrypted,null,2),'application/json');
 if(guide)guide.exported=state.ledger.head;renderGuide();renderStory();recap('The evidence packet is encrypted.','Retain the separate checkpoint to complete the proof.','story-results');notice('Encrypted evidence packet exported. Keep the passphrase separately and retain an independent checkpoint.');
}));

$('export-passphrase').addEventListener('input',()=>{$('passphrase-feedback').textContent=passphraseInputStatus($('export-passphrase').value).message;if(guide&&reviewIndex===null){renderGuide();if(state)render();}});
$('prior-work').addEventListener('toggle',()=>$('prior-work').querySelector('summary')?.focus());

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
function renderFactory(){
 const svg=$('factory-svg'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();svg.classList.add('factory-svg-cinematic');
 const add=(tag,attrs,value,parent=svg)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(value!=null)e.textContent=value;parent.append(e);return e;};
 const accepted=state.decision.status==='accepted',cells=state.snapshot.cells,jobs=state.snapshot.jobs;
 const stakes=openingStakes(state);$('opening-stakes').replaceChildren(...[[stakes.parts,'PARTS AT RISK'],[stakes.orders,'ORDERS AFFECTED'],[stakes.dueHours===null?'—':stakes.dueHours+'h','FIRST DUE WINDOW']].map(([value,label])=>{const metric=text('div','','opening-stat');metric.append(text('strong',String(value)),text('span',label));return metric;}));
 const selected=state.analysis.recovery.options.find(o=>o.optionId===(envelope?.optionId??state.decision.optionId));const allocations=selected?.detail?.allocations??selected?.detail?.draws?.flatMap(d=>d.cells)??[];const activeCells=new Set(allocations.map(a=>a.cellId));
 const previewOffline=document.body.dataset.activeStage==='shock'?shockPreview(state,document.body.dataset.activeStage,$('shock-cell')?.value):'';
 if(!guide)$('britt-activity').replaceChildren(text('strong','BRITT 4.0'),text('span',state.britt?.proposal?'PROPOSED · UNTRACKED UNTIL APPROVAL':state.decision.status==='invalidated'?'Second shock · evidence and plan review required':accepted?('Human recovery accepted · '+(state.board?.tasks?.length??0)+' tracked · '+(state.board?.tasks?.filter(t=>t.status==='Blocked').length??0)+' blocked · '+(state.board?.tasks?.filter(t=>t.status==='Done').length??0)+' done'):'Evidence → calculations → human decision'));
 $('factory-status').textContent=accepted?'RECOVERY ACCEPTED · '+titles[state.decision.optionId]:'MATERIAL HOLD · '+(state.decision.status==='invalidated'?'SECOND SHOCK':'CERTIFICATE DISCREPANCY');
 const previousSnapshot=guideHistory[0]?.state;const changedSnapshot=previousSnapshot&&previousSnapshot.snapshot.snapshotDigest!==state.snapshot.snapshotDigest;$('factory-delta').hidden=!changedSnapshot;if(changedSnapshot){const delta=state.snapshot.cells.filter(c=>!c.online).map(c=>c.cellId+' OFFLINE').join(' · ');$('factory-delta').textContent=delta+' · '+previousSnapshot.analysis.recovery.feasibleCount+' → '+state.analysis.recovery.feasibleCount+' feasible paths';}if($('constraint-change'))$('constraint-change').hidden=changedSnapshot||!$('constraint-change').textContent;
 const defs=add('defs',{});const hatch=add('pattern',{id:'hold-hatch',width:8,height:8,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},null,defs);add('rect',{width:8,height:8,fill:'#16251b'},null,hatch);add('path',{d:'M 0 0 V 8',stroke:'#839d8b','stroke-width':2},null,hatch);const offlineHatch=add('pattern',{id:'offline-hatch',width:10,height:10,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},null,defs);add('rect',{width:10,height:10,fill:'#2a1212'},null,offlineHatch);add('path',{d:'M 0 0 V 10',stroke:'#E5484D','stroke-width':2},null,offlineHatch);const gradient=add('linearGradient',{id:'machine-metal',x2:'0',y2:'1'},null,defs);add('stop',{offset:'0%','stop-color':'#38433e'},null,gradient);add('stop',{offset:'100%','stop-color':'#101713'},null,gradient);
 const incidentStage=document.body.dataset.activeStage==='incident'; const machineY=incidentStage?190:150;const jobY=incidentStage?400:340;const optionY=incidentStage?560:470;const evidenceY=incidentStage?630:540;const ledgerY=incidentStage?680:590;
 if(!incidentStage){
  add('rect',{x:18,y:92,width:120,height:78,rx:6,class:'dock-bay'});add('text',{x:28,y:118,class:'node-caption'},'DOCK');add('text',{x:28,y:138,class:'node-caption'},state.snapshot.incident.heldMaterialId??'HELD LOT');
  add('rect',{x:150,y:108,width:54,height:46,rx:4,class:'qa-gate'});add('text',{x:158,y:136,class:'node-caption'},'QA');
  add('rect',{x:70,y:168,width:730,height:18,rx:3,class:'conveyor-belt'});add('path',{d:'M 70 177 H 800',class:'factory-track'});
  for(let i=0;i<8;i++)add('rect',{x:90+i*88,y:172,width:28,height:10,rx:2,fill:accepted?'#c6ed8d88':'#6d857455',class:accepted?'material-flow lot-'+i:'lot-held'});
 }
 const previewHatch=add('pattern',{id:'preview-hatch',width:10,height:10,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},null,defs);add('rect',{width:10,height:10,fill:'#17221b'},null,previewHatch);add('path',{d:'M 0 0 V 10',stroke:'#C5CCD4','stroke-width':2},null,previewHatch);
 const qtyTracks=state.evidence.filter(e=>e.quantity&&e.source.field==='quantity').slice(0,2);const barWidth=incidentStage?420:500;const comparison=certificateComparison(qtyTracks,barWidth);const trackGap=incidentStage?78:54;const barX=230;const trackLabel=e=>{const id=String(e.evidenceId??'');if(/cert/i.test(id))return 'Certificate';if(/recv/i.test(id))return 'Receiving';if(/sub/i.test(id))return 'Substitute';return String(e.source?.documentId??'Source').slice(0,12);};qtyTracks.forEach((e,i)=>{const g=add('g',{tabindex:0,role:'button','data-evidence':e.evidenceId,'aria-label':evidencePlainEnglish(e),'data-scene-band':'compare'});g.addEventListener('focus',()=>highlightEvidence(e.evidenceId));g.addEventListener('pointerenter',()=>highlightEvidence(e.evidenceId));g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();g.dispatchEvent(new Event('click'));}});g.addEventListener('click',()=>{if(reviewIndex!==null)return;$('evidence').parentElement.open=true;focusPanel('evidence');$(e.evidenceId)?.focus();});const y=20+i*trackGap;add('text',{x:24,y:y+28,'font-size':22,fill:'#c5ccd4','font-weight':650},trackLabel(e),g);add('text',{x:216,y:y+30,'font-size':36,fill:'#e8ede6','font-weight':700,'text-anchor':'end','font-variant-numeric':'tabular-nums'},String(e.quantity.value),g);add('rect',{x:barX,y:y,width:barWidth,height:44,rx:5,fill:'#18231c',stroke:'#496353'},null,g);add('rect',{x:barX,y:y,width:comparison.widths[i],height:44,rx:5,fill:'#C5CCD4'},null,g);});if(qtyTracks.length===2){const gapX=barX+comparison.mismatchStart;const mismatchIndex=comparison.widths.indexOf(Math.max(...comparison.widths));const top=20;const bandBottom=20+trackGap+44;const matchX=barX+barWidth+16;add('rect',{x:gapX,y:20+mismatchIndex*trackGap,width:comparison.mismatchWidth,height:44,fill:'url(#hold-hatch)',stroke:'#C5CCD4','data-scene-band':'compare'});add('path',{d:`M ${gapX} ${top} V ${bandBottom}`,'stroke':'#c5ccd4','stroke-width':2.5,fill:'none','data-scene-band':'compare'});add('text',{x:matchX,y:48,class:'mismatch-label','data-scene-band':'compare'},'DOES NOT');add('text',{x:matchX,y:78,class:'mismatch-label','data-scene-band':'compare'},'MATCH');}
 const node=(x,y,title,sub,kind)=>{const preview=title===previewOffline&&state.decision.status==='accepted'&&state.snapshot.cells.find(c=>c.cellId===title)?.online;const offline=sub==='OFFLINE';const g=add('g',{class:'factory-node '+kind+(title.startsWith('JOB')?' order-bay':'')+(preview?' preview-offline':''),tabindex:'0',role:'button','aria-label':title+' '+(preview?'PREVIEW - not applied':sub),'data-scene-band':title.startsWith('JOB')?'jobs':'machines'});add('polygon',{points:`${x},${y} ${x+18},${y-16} ${x+172},${y-16} ${x+154},${y}`,fill:'#52635a',stroke:'#9caf9f'},null,g);add('polygon',{points:`${x+154},${y} ${x+172},${y-16} ${x+172},${y+72} ${x+154},${y+88}`,fill:'#1b2820',stroke:'#617b6a'},null,g);add('rect',{x,y,width:154,height:88,rx:5,fill:offline?'url(#offline-hatch)':'url(#machine-metal)',stroke:offline?'#E5484D':preview?'#C5CCD4':(kind==='held'&&title==='RECEIVING'?'#9caf9f':'#9caf9f'),'stroke-dasharray':preview?'6 4':undefined,'stroke-width':preview||offline?2.5:1},null,g);add('path',{d:`M ${x+12} ${y+12} h 60 v 30 h -60 z M ${x+86} ${y+12} h 52 v 50 h -52 z`,class:'machine-detail'},null,g);if(title.startsWith('CELL')){add('path',{d:`M ${x+42} ${y+16} v 22 m -12 0 h 24 m -12 0 v 13 m -24 7 h 48`,stroke:'#c5ccd4','stroke-width':4,fill:'none'},null,g);for(let n=0;n<3;n++)add('circle',{cx:x+130,cy:y+20+n*11,r:3,fill:n?'#71877a':'#c6ed8d'},null,g);}if(offline){add('path',{d:`M ${x+10} ${y+8} l 130 54 m 0 -54 l -130 54`,stroke:'#E5484D','stroke-width':2,'stroke-dasharray':'5 4'},null,g);add('rect',{x:x+24,y:y+18,width:104,height:30,rx:3,fill:'#170c0c'},null,g);add('text',{x:x+34,y:y+40,fill:'#ff8c91','font-size':19,'font-weight':700},'STOPPED',g);}else if(preview){add('text',{x:x+18,y:y+52,fill:'#C5CCD4','font-size':12,'font-weight':700},'PREVIEW');}add('text',{x:x+12,y:y+78,'font-size':18,'font-weight':700,fill:'#f2f6f1'},title,g);add('text',{x:x+4,y:y+118,class:'node-caption'},preview?'PREVIEW · WILL GO OFFLINE':offline?'OFFLINE-STOPPED':sub,g);g.addEventListener('click',()=>{if(reviewIndex!==null)return;for(const node of svg.querySelectorAll('.selected-node'))node.classList.remove('selected-node');g.classList.add('selected-node');$('factory-selection').hidden=false;$('factory-selection').textContent=title+' · '+(preview?'OFFLINE PREVIEW · PREVIEW - not applied':sub)+(title==='RECEIVING'?' · '+state.snapshot.incident.discrepancy:'');});g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();g.dispatchEvent(new Event('click'));}});return g;};
 const receiving=node(24,machineY,'RECEIVING',accepted?'VERIFIED RECOVERY':state.snapshot.incident.heldMaterialId??'Source evidence','idle');receiving.classList.toggle('material-stopped',!accepted&&cells.every(c=>c.online));if(!accepted)add('text',{x:40,y:machineY+43,class:'hold-marker'},'× HOLD',receiving);
 cells.forEach((c,i)=>{const x=230+i*210;node(x,machineY,c.cellId,c.online?(accepted?(activeCells.has(c.cellId)?'RECOVERY FLOW':'AVAILABLE'):'AWAITING DECISION'):'OFFLINE',!c.online?'held':accepted&&activeCells.has(c.cellId)?'running':'idle');});
 if(accepted&&allocations.length){const flow=acceptedFlow(selected,state.analysis.impacted.impactedUnits);add('rect',{x:24,y:machineY+130,width:280,height:48,rx:4,fill:'#143322',stroke:'#c6ed8d'});add('text',{x:34,y:machineY+150,class:'node-caption allocation-label'},flow.materials.join(' + '));add('text',{x:34,y:machineY+170,class:'node-caption allocation-label'},flow.parts+' parts · accepted recovery');}

 const jobWidth=800/Math.max(jobs.length,1);jobs.forEach((j,i)=>{const x=30+i*jobWidth;const routeCell=allocations.find(a=>a.jobId===j.jobId)?.cellId??allocations[0]?.cellId??(cells.find(c=>c.cellId===j.preferredCellId&&c.online)?.cellId??cells.find(c=>c.online)?.cellId);const online=Boolean(routeCell&&cells.find(c=>c.cellId===routeCell)?.online);if(online){add('path',{d:`M ${230+Math.max(0,cells.findIndex(c=>c.cellId===routeCell))*210+77} ${machineY+95} V ${jobY-40+i*12} H ${x+60} V ${jobY-2}`,class:accepted?'route-running selected-route':'route-held','data-scene-band':'jobs'});}node(x,jobY,j.jobId,j.unitsRequired+' parts · due +'+j.dueHours+'h',accepted?'running':'held');});
 state.analysis.recovery.options.forEach((o,i)=>{const g=add('g',{tabindex:0,role:'img','aria-label':titles[o.optionId]+(o.feasible?' '+o.finishHours+' hours':' constrained'),class:o.feasible?'':'constrained-chip','data-scene-band':'options'});add('rect',{x:24+i*270,y:optionY,width:252,height:52,rx:5,fill:o.feasible?'#101d15':'url(#offline-hatch)',stroke:o.optionId===(envelope?.optionId??state.decision.optionId)?'#c6ed8d':(o.feasible?'#496353':'#8a7464'),'stroke-dasharray':o.feasible?'none':'5 3',class:o.feasible?'':'constrained-chip'},null,g);add('text',{x:34+i*270,y:optionY+18,class:'node-caption'},titles[o.optionId],g);add('text',{x:34+i*270,y:optionY+42,class:'node-caption'},o.feasible?o.finishHours+'h · $'+o.incrementalCostUsd.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'× CONSTRAINED · hatch + text',g);});
 state.evidence.slice(0,6).forEach((e,i)=>{const sourceNode=add('g',{tabindex:0,role:'button','data-evidence':e.evidenceId,'aria-label':'Inspect '+evidencePlainEnglish(e),'data-scene-band':'evidence'});sourceNode.addEventListener('focus',()=>highlightEvidence(e.evidenceId));sourceNode.addEventListener('pointerenter',()=>highlightEvidence(e.evidenceId));sourceNode.addEventListener('click',()=>{if(reviewIndex!==null)return;$('evidence').parentElement.open=true;focusPanel('evidence');$(e.evidenceId)?.focus();});sourceNode.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();sourceNode.dispatchEvent(new Event('click'));}});add('circle',{cx:52+i*145,cy:evidenceY,r:6,class:!$('investigation-pending').hidden?'evidence-check':'sealed'},null,sourceNode);add('text',{x:20+i*145,y:evidenceY+28,class:'node-caption'},evidencePlainEnglish(e),sourceNode);if(!$('investigation-pending').hidden)add('path',{d:`M ${52+i*145} ${evidenceY-10} V ${evidenceY+12}`,class:'route-running'},null,sourceNode);});
 const count=Math.min(state.ledger.count,12);for(let i=0;i<count;i++){add('rect',{x:38+i*58,y:ledgerY,width:42,height:22,rx:3,class:'ledger-block','data-scene-band':'ledger'});if(i)add('path',{d:`M ${22+i*58} ${ledgerY+11} h 16`,class:'factory-track','data-scene-band':'ledger'});}add('text',{x:38,y:ledgerY+42,class:'node-caption','data-scene-band':'ledger'},state.ledger.count+' EVENTS · '+(guide?.exported===state.ledger.head?'PACKET SEALED':'HASH-CHAINED, TAMPER-EVIDENT'));
 const scene=stageScene(document.body.dataset.activeStage,state,guide);svg.dataset.scene=scene.kind;
 if(scene.kind==='tasks'||scene.kind==='proof'){
  svg.setAttribute('viewBox','0 0 850 590');
  for(const child of [...svg.children]){if(child.tagName!=='defs')child.style.display='none';}
  const hero=add('g',{'data-scene-hero':scene.kind});
  if(scene.kind==='tasks'){
   add('text',{x:24,y:48,'font-size':24,fill:'#e8ede6','font-weight':700},scene.blocked+' BLOCKED PRIOR · '+scene.tasks.length+(scene.pending?' PROPOSED · AWAITING APPROVAL':' TRACKED TASKS'),hero);
   const task=scene.tasks[Math.min(inspectedTask,scene.tasks.length-1)];
   if(task){
    add('rect',{x:24,y:72,width:800,height:220,rx:10,fill:'#122219',stroke:'#a2ca8d','stroke-width':2,'stroke-dasharray':scene.pending?'6 4':'none'},null,hero);
    add('text',{x:44,y:110,'font-size':20,fill:'#c6ed8d'},task.id+' · '+(scene.pending?'UNTRACKED UNTIL APPROVAL':task.status.toUpperCase()),hero);
    wrapSceneTitle(task.title,60).forEach((line,n)=>add('text',{x:44,y:150+n*28,'font-size':24,fill:'#e8ede6','font-weight':600},line,hero));
    add('text',{x:44,y:250,'font-size':20,fill:'#c5ccd4'},task.owner+' · due +'+Number(task.dueHours.toFixed(1))+'h · after '+(task.dependsOn.join(', ')||'Ready'),hero);
   }
   scene.tasks.forEach((task,i)=>{
    const x=24+i*(800/scene.tasks.length),width=800/scene.tasks.length-8;
    const tile=add('g',{'data-scene-task':i,role:'button',tabindex:0,'aria-label':'Inspect proposed task '+(i+1)+': '+task.title,'aria-pressed':String(i===inspectedTask),class:'scene-task-tile'},null,hero);
    const select=()=>{if(scene.pending)document.querySelector('[data-proposal-index="'+i+'"]')?.click();else{inspectedTask=i;renderFactory();}};tile.addEventListener('click',select);tile.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
    add('rect',{x,y:330,width,height:48,rx:5,fill:i===inspectedTask?'#25422b':'#101b14',stroke:'#9ab88c'},null,tile);
    add('text',{x:x+10,y:362,'font-size':20,fill:'#e8ede6'},task.id,tile);
   });
  }else{
   add('text',{x:24,y:48,'font-size':32,fill:'#e8ede6','font-weight':700},scene.events+' events. One verified chain.',hero);
   ['VERIFY LEDGER','SEAL PACKET','RETAIN CHECKPOINT'].forEach((label,i)=>{
    const x=24+i*270,done=scene.gates[i],ready=i===0||scene.gates[i-1];
    add('rect',{x,y:90,width:254,height:210,rx:10,fill:done?'#193422':'#101b14',stroke:done?'#c6ed8d':'#728e7b','stroke-width':2,'stroke-dasharray':ready?'none':'6 5'},null,hero);
    add('text',{x:x+18,y:145,'font-size':38,fill:done?'#c6ed8d':'#c5ccd4'},done?'✓':String(i+1).padStart(2,'0'),hero);
    add('text',{x:x+18,y:195,'font-size':18,fill:'#e8ede6','font-weight':650},label,hero);
    add('text',{x:x+18,y:255,'font-size':20,fill:done?'#c6ed8d':'#c5ccd4'},done?'SEALED':ready?'READY':'LOCKED',hero);
   });
  }
 }else if(incidentStage){
  svg.setAttribute('viewBox','0 0 900 520');
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  for(const child of [...svg.children]){
   const band=child.getAttribute?.('data-scene-band')||child.querySelector?.('[data-scene-band]')?.getAttribute('data-scene-band');
   if(band==='options'||band==='evidence'||band==='ledger')child.style.display='none';
  }
 }else if(scene.kind==='shock'){
  svg.setAttribute('viewBox','0 0 850 620');
  for(const child of [...svg.children]){
   const y=Number(child.getAttribute('y')??0);
   if(child.hasAttribute('data-evidence')||child.classList.contains('mismatch-label')||(child.tagName==='rect'&&y<92)||(child.tagName==='path'&&child.getAttribute('d')?.includes('V 104')))child.style.display='none';
  }
  const cell=cells.find(c=>c.cellId===$('shock-cell').value);
  if(cell){add('text',{x:24,y:32,'font-size':25,fill:'#e8ede6','font-weight':700},cell.cellId+' · CAPACITY PREVIEW');add('text',{x:24,y:82,'font-size':40,fill:'#c5ccd4'},cell.availableHours+'h → 0h');add('text',{x:310,y:80,'font-size':22,fill:'#c5ccd4'},'Apply → invalidate acceptance');}
 }else svg.setAttribute('viewBox','0 0 850 620');

}
async function draftBritt(){
 const provider=$('provider').value==='sample'?'sample':'wonder';if(provider==='wonder')$('provider').value='wonder';
 const started=Date.now();const update=()=>{$('britt-feed').textContent='Britt · reading accepted decision and source evidence · '+Math.floor((Date.now()-started)/1000)+'s elapsed · '+Math.max(0,45-Math.floor((Date.now()-started)/1000))+'s request limit remaining. Tasks await your approval.';};update();const timer=setInterval(update,1000);$('britt-panel').setAttribute('aria-busy','true');
 try{await api('britt-draft',{provider});await refresh();focusPanel('britt-approve');}finally{clearInterval(timer);$('britt-panel').removeAttribute('aria-busy');}
}
$('britt-draft').addEventListener('click',()=>busy($('britt-draft'),draftBritt));
for(const [id,action] of [['britt-approve','approve'],['britt-decline','decline']])$(id).addEventListener('click',()=>busy($(id),async()=>{await api('britt-decide',{proposalId:state.britt.proposal.id,action});await refresh();recap(action==='approve'?'Recovery tasks are tracked.':'Proposal declined.','The human decision is recorded in the ledger.','recovery-board');}));
function renderBoard(){
 const board=state.board??{tasks:[]},proposal=state.britt?.proposal;
 $('britt-feed').replaceChildren(...[(run?.run.sample?'Sample · offline walkthrough; no live AI':'Meta investigation'),...((run?.run.trace??[]).filter(t=>t.type==='tool_result').map(t=>'✓ '+t.name)),proposal?'Proposal awaiting approval · untracked by design':'Awaiting operator direction'].map(v=>text('p',v)));
 $('recovery-board').hidden=Boolean(proposal);$('britt-draft').hidden=Boolean(proposal);$('britt-approve').hidden=$('britt-decline').hidden=!proposal;$('britt-draft').disabled=state.decision.status!=='accepted'||Boolean(proposal);
 $('britt-approve').classList.add('secondary');
 $('britt-approve').textContent=guide?'Review proposed tasks':'Approve Britt’s proposal';
 $('britt-decline').classList.add('quiet');
 $('britt-work').setAttribute('aria-label','Prior tracked work and proposed replacement tasks');$('britt-work').setAttribute('role','region');$('britt-proposal').setAttribute('aria-label','Proposed tasks · scroll to inspect every task');$('britt-proposal').setAttribute('role','region');
 const banner=proposalBanner(board,proposal);$('board-outcomes').textContent=proposal?(board.tasks.filter(t=>t.status==='Blocked').length+' BLOCKED prior · '+proposal.board.tasks.filter(t=>t.status!=='Done').length+' PROPOSED · awaiting approval'):banner||(board.tasks.length+' tracked · '+board.tasks.filter(t=>t.status==='Done').length+' done · '+board.tasks.filter(t=>t.status==='Blocked').length+' blocked');
 const blockedCount=board.tasks.filter(t=>t.status==='Blocked').length;const proposedCount=proposal?proposal.board.tasks.filter(t=>t.status!=='Done').length:0;
 $('britt-work').scrollTop=0;$('britt-proposal').scrollTop=0;
 $('britt-proposal').replaceChildren(...(banner&&proposal?[text('p',blockedCount+' BLOCKED prior · '+proposedCount+' proposed · UNTRACKED UNTIL APPROVAL','proposal-explain'),...(proposal.board.tasks.map(t=>{const card=text('div','','proposal-task');card.tabIndex=0;card.append(text('small',t.status==='Done'?'COMPLETED WORK RETAINED':'PROPOSED · UNTRACKED UNTIL APPROVAL','proposal-badge'),text('strong',t.id+' · '+t.title),text('small',t.owner+' · due +'+Number(t.dueHours.toFixed(2))+'h · after '+(t.dependsOn.join(', ')||'Ready')));return card;})),text('small','End of proposal · '+proposal.board.tasks.length+' tasks','proposal-end')]:[]));
 if(proposal){const cards=[...$('britt-proposal').querySelectorAll('.proposal-task')],nav=text('nav','','proposal-pages');nav.setAttribute('aria-label','Inspect proposed tasks');const label=$('britt-proposal').querySelector('.proposal-explain');const choose=index=>{inspectedTask=index;cards.forEach((c,i)=>c.hidden=i!==index);for(const [i,b]of [...nav.children].entries())b.setAttribute('aria-pressed',String(i===index));label.textContent=cards.length+' PROPOSED · Task '+(index+1)+' of '+cards.length+' · UNTRACKED UNTIL APPROVAL';renderFactory();};cards.forEach((card,index)=>{const b=text('button',String(index+1),'secondary');b.dataset.proposalIndex=String(index);b.setAttribute('aria-label','Inspect proposed task '+(index+1)+': '+proposal.board.tasks[index].title);b.addEventListener('click',()=>choose(index));nav.append(b);});nav.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();event.stopPropagation();const buttons=[...nav.children],i=buttons.indexOf(document.activeElement),next=buttons[(i+(event.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length];next.click();next.focus();});label.after(nav);choose(0);}
 $('prior-work').hidden=!(proposal&&board.tasks.length);if(proposal&&board.tasks.length)$('prior-work').open=true;$('prior-work').querySelector('summary').textContent=blockedCount+' BLOCKED prior tasks · separate from proposed replacements';$('prior-work-list').replaceChildren(...board.tasks.map(t=>text('p','■ '+t.status+' · '+t.id+' · '+t.title+' · '+t.owner)));
 $('recovery-board').replaceChildren(...['To do','In progress','Blocked','Done'].map(status=>{const column=text('section','','board-column');column.append(text('h3',status));for(const task of board.tasks.filter(t=>t.status===status)){const card=text('article','','task-card');card.append(text('strong',task.title),text('p',task.owner+' · due +'+Number(task.dueHours.toFixed(2))+'h from shock'),text('small','Depends on: '+(task.dependsOn.join(', ')||'Ready')),text('p',task.change?.reason??task.evidenceIds.join(' · ')));const select=text('select');select.setAttribute('aria-label','Move '+task.title);for(const label of ['To do','In progress','Blocked','Done']){const o=text('option',label);o.value=label;select.append(o);}select.value=status;select.disabled=Boolean(task.change?.requiresReview)||state.operator?.role==='auditor';select.addEventListener('change',()=>busy(select,async()=>{await api('task-move',{taskId:task.id,status:select.value,idempotencyKey:crypto.randomUUID()});await refresh();}));card.append(select);column.append(card);}return column;}));
}

for(const container of [$('guided-steps'),$('factory-svg'),$('britt-work')])container.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;const items=[...container.querySelectorAll('button,[tabindex="0"]')],index=items.indexOf(document.activeElement);if(index<0)return;event.preventDefault();items[(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+items.length)%items.length]?.focus();});

$('options').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||reviewIndex!==null)return;const buttons=[...$('options').querySelectorAll('[role=radio]:not(:disabled)')],index=buttons.indexOf(document.activeElement);if(index<0||requestBusy)return;event.preventDefault();const next=buttons[(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+buttons.length)%buttons.length];next.focus();next.click();});

$('typed').addEventListener('input',()=>{if(guide&&reviewIndex===null)renderGuide();});

$('options').addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||reviewIndex!==null)return;
 const current=event.target.closest('[data-option]');if(!current)return;event.preventDefault();
 const next=adjacentPath(state.analysis.recovery.options,current.dataset.option,['ArrowLeft','ArrowUp'].includes(event.key)?-1:1);
 const target=[...$('options').querySelectorAll('button[data-option]')].find(b=>b.dataset.option===next&&!b.disabled);target?.focus();
});
