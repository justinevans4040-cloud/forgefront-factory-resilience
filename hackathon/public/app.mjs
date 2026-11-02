import {mountCascade} from './cascade.mjs';
import {stageScene,wrapSceneTitle,tileTitle,proposalLayout} from './stage-scene.mjs';
import {capacityStatus,stageFor,focusResult,storyView,shockPreview,proofChecklist,proposalBanner,proofActionGate} from './command-center.mjs';
import {factoryPositions,comparisonRange,certificateComparison,completionStatus,openingStakes,adjacentPath,acceptedFlow,evidencePlainEnglish,evidenceDetailLabel,claimPresentation,investigationHighlights,investigationHandoff,summarizeAnalysis} from './factory-layout.mjs';
import {routeHealthView} from './route-health.mjs';
import {investigationStatus} from './investigation-status.mjs';
import {passphraseFeedback,passphraseInputStatus} from './passphrase.mjs';
import { guideStep,guidedSteps,publicPollDelay,publicRecoveryMode,requestWithRateLimit } from './guide.mjs';
const $=id=>document.getElementById(id);
document.querySelector('header').append($('logout'));
const decisionBar=$('guide-next').parentElement;decisionBar.id='decision-bar';decisionBar.setAttribute('aria-label','Recovery actions');const decisionStatus=document.createElement('span');decisionStatus.id='decision-status';decisionBar.insertBefore(decisionStatus,$('guide-next'));$('factory-stage').append(decisionBar);
let auth={},state=null,run=null,envelope=null,guide=null;
let requestBusy=false;let inspectedTask=0;let inspectedPriorTask=0;
let guideHistory=[],reviewIndex=null,reviewContext=null;
let pendingAuthorize=null;
function highlightPath(id){for(const e of document.querySelectorAll('[data-option-id],[data-scene-option]'))e.classList.toggle('path-linked',(e.dataset.optionId??e.dataset.sceneOption)===id);}
function highlightEvidence(id){
 for(const element of document.querySelectorAll('.evidence-linked,.station-linked,.finding-trace,.compare-track-active'))element.classList.remove('evidence-linked','station-linked','finding-trace','compare-track-active');
 if(!id)return;
 for(const element of document.querySelectorAll('[data-evidence="'+CSS.escape(id)+'"],#'+CSS.escape(id)+',[data-evidence-id="'+CSS.escape(id)+'"]'))element.classList.add('evidence-linked');
 const key=String(id).toLowerCase();
 const plain=String(document.querySelector('[data-evidence="'+CSS.escape(id)+'"] .evidence-headline')?.textContent||id).toLowerCase();
 const station=/recv|receiving|hold|alloy/.test(key+plain)?'RECEIVING':/mill-1|cell-mill-1/.test(key)?'CELL-MILL-1':/mill-2|cell-mill-2/.test(key)?'CELL-MILL-2':'';
 if(station)for(const element of document.querySelectorAll('[data-scene-machine="'+station+'"],.factory-node[aria-label^="'+station+' "]'))element.classList.add('station-linked');
 const svg=$('factory-svg');
 if(svg){
  const cert=/cert|certificate|120/.test(key+plain);
  const recv=/recv|receiving|80|counted/.test(key+plain);
  if(cert)for(const el of svg.querySelectorAll('[data-compare-role="certificate"]'))el.classList.add('compare-track-active','finding-trace');
  if(recv)for(const el of svg.querySelectorAll('[data-compare-role="receiving"]'))el.classList.add('compare-track-active','finding-trace');
  // Wonder 186 step 1: Certificate ↔ RECEIVING bidirectional focus ring.
  if(cert||recv){
   for(const el of svg.querySelectorAll('[data-scene-machine="RECEIVING"]'))el.classList.add('station-linked','receiving-cert-link');
   const trace=svg.querySelector('[data-scene-band="compare"]')||svg;trace.classList.add('finding-trace');
  }
 }
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
function focusPanel(id){for(let p=$(id)?.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;const stage=stageFor(id);if(stage)showStage(stage);let target=id;if(guide&&$(id)&&getComputedStyle($(id)).display==='none')target=id==='encrypted-export'&&!passphraseFeedback($('export-passphrase').value).ok?'export-passphrase':'guide-next';focusResult(target,{showStage});}
function recap(title,detail,target){$('recap-title').textContent=title;$('recap-detail').textContent=detail;if(target)focusPanel(target);}
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{showStage(button.dataset.view);const panel=document.querySelector('[data-stage="'+button.dataset.view+'"]');panel.tabIndex=-1;panel.focus({preventScroll:true});});
function renderStory(){
 const view=storyView(state,guide);$('story-opening').textContent=view.opening;$('story-schedule').textContent=view.schedule;
 $('result-metrics').replaceChildren(...[[state.analysis.impacted.impactedUnits,'PARTS AT STAKE'],[view.finishHours==null?'Pending':view.finishHours+'h','ACCEPTED PLAN'],[view.savedHours==null?'Pending':view.savedHours+'h','VS REPLENISHMENT']].map(([value,label])=>{const item=text('div','','metric');item.append(text('strong',value),text('span',label));return item;}));
 $('recovery-timeline').replaceChildren(...[String(state.board?.tasks?.length??0)+' tracked tasks · '+String(state.board?.tasks?.filter(t=>t.status==='Done').length??0)+' done · '+String(state.board?.tasks?.filter(t=>t.status==='Blocked').length??0)+' blocked',view.opening,view.accepted?'Human decision accepted · '+titles[state.decision.optionId]:'Human decision awaiting acceptance',view.secondShock?(view.accepted?'Second shock handled · revised plan accepted':'Second shock applied · fresh investigation and acceptance required'):'Second shock awaits your challenge',view.proofComplete?`Evidence verified and exported · ${state.ledger.count} events`:'Verify the ledger, export the encrypted packet and retain its checkpoint'].map(value=>text('li',value)));
}
const titles={wait_replenishment:'Wait for replenishment',allocate_substitute:'Use verified substitute',split_capacity:'Split available capacity'};
function text(tag,value,className){const e=document.createElement(tag);e.textContent=String(value??'');if(className)e.className=className;return e;}
function approveLabel(optionId){const short={wait_replenishment:'wait for replenishment',allocate_substitute:'verified substitute',split_capacity:'split capacity'};return 'Approve '+(short[optionId]??String(optionId).replaceAll('_',' '));}
function openAuthorize(detail,onConfirm){pendingAuthorize={detail,onConfirm};$('authorize-detail').textContent=detail;$('authorize-title').textContent='Authorize this decision';$('authorize-wall').showModal();$('authorize-confirm').focus();}
function closeAuthorize(){pendingAuthorize=null;if($('authorize-wall').open)$('authorize-wall').close();}
function notice(message,error=false){document.body.dataset.actionError=String(error);$('notice').textContent=message;$('notice').classList.toggle('error',error);}
async function api(action,body={}){const response=await requestWithRateLimit(()=>fetch('/api/workflow/'+action,{method:'POST',headers:{'Content-Type':'application/json',...auth},body:JSON.stringify(body),signal:AbortSignal.timeout(action==='britt-draft'?55000:12000)}),{onWait:seconds=>{const message='Public room busy. Your action resumes in '+seconds+' seconds.';notice(message);$('decision-status').textContent=message;$('guide-next').textContent='Waiting for room · '+seconds+'s';}});const result=await response.json();if(response.status===401){auth={};envelope=null;$('plaintext-ack').checked=false;$('export-passphrase').value='';$('passphrase-feedback').textContent=passphraseInputStatus('').message;$('room').hidden=true;$('login').hidden=false;$('admin').focus();}
if(!response.ok)throw new Error(result.error?.message??'Request failed');return result;}
async function busy(button,task){if(requestBusy)return;requestBusy=true;const controls=[...document.querySelectorAll('button,select')];const prior=controls.map(e=>e.disabled);controls.forEach(e=>e.disabled=true);button.setAttribute('aria-busy','true');try{await task();}catch(error){notice(error.message,true);if(state){const target=stageFor(button.id)?button.id:button.dataset.option?'options':null;if(target)focusPanel(target);}}finally{requestBusy=false;controls.forEach((e,i)=>{if(e.isConnected)e.disabled=prior[i];});button.removeAttribute('aria-busy');if(state&&Object.keys(auth).length){render();if(guide&&reviewIndex===null){const step=guideStep(state,guide);const stayingOnFindings=Boolean(run?.proposalValid&&step.target==='model-output');if(stayingOnFindings){showStage('investigation');focusResult('model-output',{document,showStage});renderGuide();}else{const stage=stageFor(step.target);if(stage)showStage(stage);}}}}}
async function refresh(){state=await api('status');const publicMode=publicRecoveryMode(state,guide?.mode,$('provider').value);if(publicMode.message){$('provider').value=publicMode.provider;if(guide)guide.mode=publicMode.mode;notice(publicMode.message);}if(!envelope&&state.pendingConsents?.length){envelope=state.pendingConsents.at(-1);$('consent').hidden=false;$('confirm-phrase').textContent=`APPROVE ${envelope.optionId}`;$('approve-option').textContent=approveLabel(envelope.optionId);$('review-detail').textContent=`Restored encrypted review · plan ${envelope.planDigest.slice(0,12)} · expires in ${Math.max(0,Math.ceil((envelope.expires-Date.now())/1000))} seconds. Review the current option, then authorize.`;$('typed').value=`APPROVE ${envelope.optionId}`;$('consent-feedback').textContent='Ready to authorize. One click seals this path.';}render();}
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
 $('evidence').replaceChildren(...state.evidence.map(e=>{const div=text('div','','source evidence-card');div.id=e.evidenceId;div.dataset.evidence=e.evidenceId;div.tabIndex=0;div.addEventListener('focus',()=>highlightEvidence(e.evidenceId));div.addEventListener('pointerenter',()=>highlightEvidence(e.evidenceId));const plain=evidencePlainEnglish(e);const headline=text('p','','evidence-headline');headline.textContent=plain;const detail=text('details','','evidence-raw');const sourceSummary=text('summary','Source detail');sourceSummary.addEventListener('click',event=>{event.preventDefault();openSourceDetail(e);});detail.append(sourceSummary,text('code',evidenceDetailLabel(e)),text('small',e.excerpt+' · Snapshot '+e.snapshotDigest.slice(0,10)));div.append(headline,detail);return div;}));
 renderCapacity();
 const online=state.snapshot.cells.filter(c=>c.online);$('shock-cell').replaceChildren(...online.map(c=>{const o=text('option',c.cellId);o.value=c.cellId;return o;}));if(online.length)$('shock-cell').value=online.at(-1).cellId;
 const current=[...state.runs].reverse().find(r=>r.run.snapshotDigest===state.snapshot.snapshotDigest);run=current??null;
 $('evidence').parentElement.open=document.body.dataset.activeStage==='incident'||$('evidence').parentElement.open;
 $('options').replaceChildren(...state.analysis.recovery.options.map((o,i)=>{
 const card=text('article','','option'+(o.feasible?'':' unavailable'));card.dataset.optionId=o.optionId;card.addEventListener('pointerenter',()=>highlightPath(o.optionId));card.addEventListener('focusin',()=>highlightPath(o.optionId));card.append(text('div',`0${i+1} / ${o.feasible?'FEASIBLE':'CONSTRAINED'}`,'option-status'),text('h3',(o.feasible?'':'× CONSTRAINED · ')+titles[o.optionId]));
 const numbers=text('div','','numbers');for(const [value,label]of [[o.finishHours==null?'—':o.finishHours+'h','FINISH'],[o.incrementalCostUsd==null?'—':'$'+o.incrementalCostUsd.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}),'INCREMENTAL']]){const d=text('div');d.append(text('strong',value),text('small',label));numbers.append(d);}card.append(numbers);
 if(o.feasible){
 const track=document.createElementNS('http://www.w3.org/2000/svg','svg');track.setAttribute('viewBox','0 0 300 18');track.setAttribute('class','timeline');track.setAttribute('role','img');track.setAttribute('aria-label',`${titles[o.optionId]} finishes in ${o.finishHours} hours`);
 const allocations=o.detail?.allocations??o.detail?.draws?.flatMap(d=>d.cells)??[];const horizon=Math.max(...state.analysis.recovery.options.filter(p=>p.feasible).map(p=>p.finishHours),1);const lanes=allocations.length?allocations:[{hours:o.finishHours}];
 lanes.forEach((a,i)=>{const rect=document.createElementNS(track.namespaceURI,'rect');rect.setAttribute('x','0');rect.setAttribute('y',String(i*18/lanes.length));rect.setAttribute('width',String(300*a.hours/horizon));rect.setAttribute('height',String(16/lanes.length));rect.setAttribute('fill',i%2?'#d6f5a5':'#a8c27f');track.append(rect);});card.append(track,text('small',allocations.map(a=>a.cellId+' '+a.hours+'h').join(' / ')||'Replenishment + production'));
 }
 const assumptions=text('details');assumptions.append(text('summary','Assumptions'));for(const a of o.assumptions??[])assumptions.append(text('p',a));card.append(assumptions);
 if(o.rejectReason)card.append(text('p',o.rejectReason));const list=text('ul');for(const c of o.constraints)list.append(text('li',c));card.append(list);
 const sources=text('div');for(const id of o.evidenceIds){const a=text('a',id);a.href='#'+id;a.addEventListener('click',()=>{$('evidence').parentElement.open=true;focusPanel('evidence');$(id)?.focus();});sources.append(a,text('span',' '));}card.append(sources);
 const selectedPath=envelope?.optionId===o.optionId;const button=text('button',o.feasible?(selectedPath?'● Selected path':'○ Select this path'):'Constrained · not selectable',selectedPath?'':'secondary');button.setAttribute('role','radio');button.setAttribute('aria-checked',String(selectedPath));button.setAttribute('aria-label',o.feasible?'Review '+titles[o.optionId]:titles[o.optionId]+' constrained');button.dataset.option=o.optionId;button.setAttribute('aria-disabled',String(!o.feasible));button.disabled=!o.feasible||!run?.proposalValid||state.operator?.role==='auditor';if(selectedPath)button.classList.add('path-selected');if(o.feasible){const selectPath=()=>busy(button,async()=>{envelope=await api('review',{runId:run.runId,optionId:o.optionId});$('consent').hidden=false;$('confirm-phrase').textContent=`APPROVE ${o.optionId}`;$('approve-option').textContent=approveLabel(o.optionId);const changed=state.decision.status==='invalidated'?`Revised after capacity change · ${state.analysis.recovery.feasibleCount} feasible paths · `:'';$('review-detail').textContent=`${changed}${titles[o.optionId]} · plan ${envelope.planDigest.slice(0,12)}.`;$('typed').value=`APPROVE ${o.optionId}`;$('consent-feedback').textContent='Ready to authorize. One click seals this path.';focusPanel('approve-option');recap('Your review is prepared.','Approve the path, then authorize to seal it to the evidence and your identity.');notice('Review prepared. Approve the path, then authorize this decision.');renderFactory();if(guide&&reviewIndex===null)renderGuide();});button.addEventListener('click',selectPath);card.tabIndex=0;card.addEventListener('click',event=>{if(reviewIndex!==null||button.disabled)return;if(event.target===button||button.contains(event.target))return;selectPath();});}else{card.tabIndex=-1;card.setAttribute('aria-disabled','true');}card.dataset.selected=String(envelope?.optionId===o.optionId);card.append(button);if(selectedPath)card.append(text('p','Next: Approve → Authorize this decision','authorize-sequence'));return card;
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
 $('model-output').hidden=!run;$('model-output').toggleAttribute('hidden',!run);$('model-output').classList.toggle('findings-empty',!run);$('model-output').closest('.stage').dataset.hasFindings=String(Boolean(run));const chip=$('connection-ready-chip');const preflight=document.querySelector('.route-preflight');const preflightSummary=preflight?.querySelector('summary');const clearedConnection=!run&&state.decision.status==='invalidated';if(preflightSummary)preflightSummary.textContent=run?'1 · CONNECTION · ready':'1 · CONNECTION';// Wonder 194 step 6: keep a compact CONNECTION status line above EVIDENCE even when cleared; hide the expandable preflight only.
if(preflight)preflight.hidden=clearedConnection;if(chip){chip.textContent=clearedConnection?'1 · CONNECTION · ready · identity held':(run?'1 · CONNECTION · ready':'1 · CONNECTION');chip.hidden=Boolean(run);chip.classList.toggle('connection-cleared',clearedConnection);}if(run&&$('model-output').dataset.runId!==run.runId){$('model-output').dataset.runId=run.runId;preflight.open=false;$('model-output').open=true;}if(!run){if(preflight)preflight.open=!clearedConnection;$('model-output').open=false;}
 // After a capacity shock, keep a reserved findings summary so the side zone never reads as an empty box.
 const findingsReserve=$('findings-reserve');
 if(findingsReserve){
  const cleared=!run&&state.decision.status==='invalidated';
  const pending=!run&&state.decision.status!=='invalidated'&&document.body.dataset.activeStage==='investigation';
  const needsReserve=cleared||pending;
  findingsReserve.hidden=!needsReserve;
  findingsReserve.classList.toggle('findings-reserve-active',needsReserve);
  if(cleared)findingsReserve.textContent='CLEARED · Verified findings wiped · '+state.analysis.recovery.feasibleCount+' feasible paths remain · constrained path hatched × CONSTRAINED · Reinvestigate when ready.';
  else if(pending)findingsReserve.textContent='PENDING · Evidence findings reserved · Choose a route, then Investigate.';
}
 if(!run&&$('investigation-pending').hidden)$('investigation-status').textContent=investigationStatus();
 $('comparison').replaceChildren(...state.runs.filter(r=>r.run.snapshotDigest===state.snapshot.snapshotDigest).map(r=>text('p',`${r.run.sample?'Sample · offline walkthrough; no live AI':r.calls.at(-1)?.returnedModel??'identity unavailable'} · ${(r.run.elapsedMs/1000).toFixed(1)}s · ${r.claims.accepted.length} validated / ${r.claims.rejected.length} rejected · ${r.proposalValid?'proposal valid':r.run.stopReason}`)));
 if(run){$('investigation-handoff').textContent=investigationHandoff(run,$('provider').value);$('investigation-highlights').replaceChildren(...investigationHighlights(run,state.analysis).map(({value,label})=>{const item=text('div','','investigation-metric');item.tabIndex=0;item.dataset.metricLabel=String(label||'');item.append(text('strong',value),text('span',label));const linkMetric=()=>{const key=String(label||'').toLowerCase();if(/verif|accept|fact/.test(key))highlightEvidence(run.claims.accepted[0]?.evidenceId||'ev-cert-qty');else if(/reject/.test(key))highlightEvidence(null);else if(/feasib/.test(key)){const opt=state.analysis.recovery.options.find(o=>o.feasible);if(opt)highlightPath(opt.optionId);}else highlightEvidence(run.claims.accepted[0]?.evidenceId||null);};item.addEventListener('focus',linkMetric);item.addEventListener('pointerenter',linkMetric);return item;}));$('model-label').textContent=(run.run.sample?'Sample · offline walkthrough; no live AI':'LIVE META · '+(run.calls.at(-1)?.returnedModel??'identity unavailable')) ;$('run-summary').textContent=`${run.proposalValid?'Investigation complete':run.run.stopReason} · ${run.run.turns} turns · ${run.run.toolCalls} read-only calls · ${(run.run.elapsedMs/1000).toFixed(1)}s`;const analysis=summarizeAnalysis(run.narrative);$('narrative').textContent=analysis.summary;$('analysis-full').textContent=analysis.full;$('read-full-analysis').hidden=!analysis.truncated;$('read-full-analysis').disabled=reviewIndex!==null;
 $('claims').replaceChildren(...run.claims.accepted.map(c=>{const view=claimPresentation(state.evidence.find(e=>e.evidenceId===c.evidenceId),c);const card=text('details','','claim verified-finding');card.dataset.evidenceId=c.evidenceId;card.append(text('summary','✓ '+view.headline),text('small',view.detail));card.tabIndex=0;card.addEventListener('focus',()=>highlightEvidence(c.evidenceId));card.addEventListener('pointerenter',()=>highlightEvidence(c.evidenceId));card.addEventListener('pointerleave',()=>highlightEvidence(null));card.addEventListener('click',()=>highlightEvidence(c.evidenceId));return card;}),...run.claims.rejected.map(c=>text('p',`Rejected [evidence:${c.evidenceId}]: ${c.reason}`,'claim')));
 if(run.claims.accepted[0])highlightEvidence(run.claims.accepted[0].evidenceId);
 $('trace').replaceChildren(...run.run.trace.filter(t=>t.type==='tool_result').map(t=>text('div',`${t.ok?'✓':'×'} ${t.name} · snapshot ${run.run.snapshotDigest.slice(0,12)}`,'trace-row')),...run.calls.map(c=>text('div',`${c.status} · ${c.returnedModel??'no identity'} · ${c.latencyMs}ms · ${c.failure??c.protocol}`,'trace-row')));
 }
 renderBoard();
 for(const item of proofChecklist(state,guide??{})){const field=$(item.id).closest('fieldset');field.dataset.complete=String(item.done);let status=field.querySelector('.proof-status');if(!status){status=text('small','','proof-status');field.append(status);}field.querySelector('legend').textContent=item.label;const gate=guide?proofActionGate(state,guide):{};const enabled=gate[item.id];status.textContent=item.done?'✓ Complete · current ledger':enabled===false?(item.id==='verify'?'1 · Verify first · currently waiting':item.id==='encrypted-export'?'2 · Waiting on verify · then separate passphrase':'3 · Waiting on sealed packet'):(item.id==='verify'?'1 · Verify the anchored history · enabled now':item.id==='encrypted-export'?'2 · Seal with separate passphrase · enabled now':'3 · Retain independent checkpoint · enabled now');}
 $('export-passphrase').disabled=reviewIndex!==null||Boolean(guide&&guide.verified!==state.ledger.head);
 if(guide){const gate=proofActionGate(state,guide);for(const [id,enabled] of Object.entries(gate)){const control=$(id);if(!control)continue;const blocked=!enabled||(id==='encrypted-export'&&!passphraseFeedback($('export-passphrase').value).ok);control.disabled=blocked;const verifySole=id==='verify'&&enabled&&!gate['encrypted-export'];control.classList.toggle('secondary',!verifySole);control.classList.toggle('proof-sole-primary',verifySole);const field=control.closest('fieldset');if(field)field.classList.toggle('proof-sole-slot',verifySole);}}

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
  do{if(Date.now()-start>65000)throw Error('Status wait exceeded. The server job remains bounded; refresh status before a deliberate new attempt.');await new Promise(r=>setTimeout(r,publicPollDelay(job)));result=await api('investigation-status',{jobId:job.jobId});observedCall=result.call??null;observedAt=Date.now();update();$('britt-activity').textContent='THE BRITT · '+(observedCall?'Call '+observedCall.number+' · '+observedCall.status+' · '+observedCall.sourcesRead+' source records read':'Planning evidence investigation');}while(result.status==='running');
  if(result.status==='failed'){await refresh();throw Error((result.failure||'INVESTIGATION_FAILED_OR_STALE')+'. No replacement answer was generated. Select the route and press Investigate to retry explicitly.');}
  await refresh();
  $('investigation-status').textContent=investigationStatus({phase:run?.proposalValid?'complete':'failed',route});
  if(run?.proposalValid)recap('The investigation is ready.',`${run.claims.accepted.length} source claims validated; ${state.analysis.recovery.feasibleCount} feasible recovery paths computed. Review the verified findings, then continue.`, 'model-output');
  else focusResult('model-output',{document,showStage});
  notice(run?.proposalValid?'Investigation complete. Review verified findings, then compare calculated options.':(run?.run.sample?'SAMPLE investigation stopped: ':'LIVE META investigation stopped: ')+run?.run.stopReason+'. No replacement answer was generated. Select the route and press Investigate to retry explicitly.',!run?.proposalValid);
 }catch(error){$('investigation-status').textContent=investigationStatus({phase:'failed',route});throw error;}
 finally{
  clearInterval(timer);$('investigation-pending').hidden=true;renderFactory();
  // Keep the operator on verified findings until they choose the next guided action — never auto-skip the notebook.
  if(guide&&run?.proposalValid){showStage('investigation');focusResult('model-output',{document,showStage});renderGuide();}
  else if(guide)focusPanel(guideStep(state,guide).target);
 }
}));
async function sealConsent(){if(!envelope)throw new Error('Prepare a review first');const phrase=$('confirm-phrase').textContent||`APPROVE ${envelope.optionId}`;$('typed').value=phrase;await api('confirm',{nonce:envelope.nonce,typed:phrase});envelope=null;$('consent').hidden=true;closeAuthorize();await refresh();showStage('board');await draftBritt();recap('The human decision is recorded.',storyView(state,guide).secondShock?'The revised plan is sealed to the new evidence. Verify and retain the recovery proof.':'Your acceptance is sealed to this plan and source snapshot. Challenge it with a cell outage.',state.britt?.proposal?'britt-approve':'decision-state');notice('Recovery decision accepted. The plan, evidence and your identity are sealed in the ledger.');}
$('approve-option').addEventListener('click',()=>{if(!envelope)return;const pathName=titles[envelope.optionId]??$('approve-option').textContent.replace(/^Approve /i,'');openAuthorize('Authorize '+pathName+' against the sealed evidence snapshot. One click seals this path.',()=>busy($('authorize-confirm'),sealConsent));});
$('confirm').addEventListener('click',()=>$('approve-option').click());
$('authorize-cancel').addEventListener('click',()=>closeAuthorize());
$('authorize-confirm').addEventListener('click',()=>{if(!pendingAuthorize)return;const {onConfirm}=pendingAuthorize;onConfirm();});
$('read-full-analysis').addEventListener('click',()=>{if(!$('analysis-full').textContent.trim())return;$('analysis-dialog').showModal();$('analysis-close').focus();});
$('analysis-close').addEventListener('click',()=>{if($('analysis-dialog').open)$('analysis-dialog').close();});
 $('shock-cell').addEventListener('change',()=>{if(state){renderFactory();renderCapacity();}});
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
 const authorizeOpen=$('authorize-wall')?.open;$('guide-next').textContent=reviewIndex!==null?'Next · return through history':authorizeOpen?'Authorize this decision':({sources:'Inspect source evidence',sample:'Run Sample investigation',spark:'Run Spark Open',wonder:'Run Wonder',findings:'Continue to compare paths',accept:envelope?'Approve recovery path':'Review recovery option',board:state.britt?.proposal?'Approve The Britt’s proposal':'Draft recovery tasks',shock:'Apply second shock',recover:'Reinvestigate recovery',reaccept:envelope?'Approve revised path':'Review revised option','board-revised':state.britt?.proposal?'Approve revised tasks':'Draft revised tasks',export:guide.verified!==state.ledger.head?'Verify ledger':guide.exported!==state.ledger.head?'Seal evidence packet':'Retain checkpoint',complete:'Recovery complete'}[step.id]??'Show next action');
 $('guide-start').hidden=step.id!=='restart';$('guide-title').textContent=step.id==='complete'?'Recovery story complete':`Step ${Math.min(step.index+1,step.total)} of ${step.total} · ${step.title}`;$('guide-detail').textContent=step.detail;$('guide-progress').max=step.total;$('guide-progress').value=step.index;$('guide-next').hidden=step.id==='complete';$('guide-next').setAttribute('aria-label',$('guide-next').textContent+(['sample','spark','wonder','recover'].includes(step.id)?' · '+$('provider').selectedOptions[0].textContent:''));$(step.target)?.classList.add('next-action');
 if(['accept','reaccept'].includes(step.id)&&envelope){$('guide-next').disabled=false;$('approve-option').disabled=false;$('consent-feedback').textContent=$('authorize-wall')?.open?'Authorize to seal this decision.':'Ready to authorize. One click seals this path.';}
 if(step.id==='export'&&guide.verified===state.ledger.head&&guide.exported!==state.ledger.head)$('guide-next').disabled=!passphraseFeedback($('export-passphrase').value).ok;
 // Board coexistence lives once in #board-outcomes (Wonder P1) — action bar stays short.
 $('decision-status').textContent=step.id==='complete'?completionStatus(state):step.id==='shock'?'INVALIDATING ACTION · will invalidate '+(titles[state.decision.optionId]??'accepted plan'):step.id==='board-revised'?'Approve revised tasks when ready':step.id==='board'?(state.britt?.proposal?'Approve proposed tasks when ready':'Draft recovery tasks'):step.id==='export'?((state.board?.tasks?.length??0)+' tracked · '+(state.board?.tasks?.filter(t=>t.status==='Done').length??0)+' done · '+(state.board?.tasks?.filter(t=>t.status==='Blocked').length??0)+' blocked'):step.id==='reaccept'?'PRIOR ACCEPTANCE INVALIDATED · fresh review required':'';
 const boardQuiet=step.id==='board'||step.id==='board-revised';
 $('britt-activity').replaceChildren(text('strong','THE BRITT'),text('span',boardQuiet?'Building the live board':state.decision.status==='invalidated'?'Second shock · evidence and plan review required':state.decision.status==='accepted'?('Human recovery accepted · '+(state.board?.tasks?.length??0)+' tracked · '+(state.board?.tasks?.filter(t=>t.status==='Blocked').length??0)+' blocked · '+(state.board?.tasks?.filter(t=>t.status==='Done').length??0)+' done'):'Evidence → calculations → human decision'));
 $('export-passphrase').disabled=guide.verified!==state.ledger.head;
 $('guide-time').textContent=`${Math.floor((Date.now()-guide.started)/1000)}s elapsed · guided recovery`;
}
$('guide-start').addEventListener('click',()=>busy($('guide-start'),async()=>{await api('reset');await refresh();guide={mode:$('provider').value==='sample'?'offline':'live',initialDigest:state.snapshot.snapshotDigest,inspected:false,findingsReviewed:null,acceptedInitial:false,exported:false,started:Date.now(),boardEnabled:true};guideHistory=[];reviewIndex=null;reviewContext=null;renderGuide();renderStory();recap('The recovery mission has started.','Inspect the certificate and receiving evidence. Each next step advances on recorded results.','incident');notice('Fresh guided scenario started. Follow each evidence-gated action.');}));
$('guide-next').addEventListener('click',()=>{
 if(reviewIndex!==null){const next=reviewIndex+1;if(next>=guideHistory.length-1){exitReview();focusPanel(guideStep(state,guide).target);}else viewPast(next);return;}
 const step=guideStep(state,guide);
 if(step.id==='sources'){$('evidence').parentElement.open=true;guide.inspected=true;renderGuide();focusPanel('investigate');return;}
 if(step.target==='model-output'&&run?.proposalValid&&guide.findingsReviewed!==state.snapshot.snapshotDigest){guide.findingsReviewed=state.snapshot.snapshotDigest;renderGuide();focusPanel('options');return;}
 if(['spark','wonder','sample','recover'].includes(step.id)){
  if(step.id==='spark')$('provider').value='baseten';if(step.id==='wonder')$('provider').value='wonder';if(step.id==='sample')$('provider').value='sample';if(step.id==='recover'&&step.provider)$('provider').value=step.provider;
  focusPanel('investigate');$('investigate').click();return;
 }
 if($('authorize-wall')?.open){$('authorize-confirm').click();return;}
 if(step.id==='accept'||step.id==='reaccept'){focusPanel('options');if(!envelope){const preferred=document.querySelector('[data-option="allocate_substitute"]:not(:disabled)')??document.querySelector('[data-option]:not(:disabled)');preferred?.click();}else{$('approve-option').click();}return;}
 if(step.id==='board'||step.id==='board-revised'){focusPanel('britt-draft');if(state.britt?.proposal)$('britt-approve').click();else $('britt-draft').click();return;}
 if(step.id==='shock'){$('shock').click();return;}
 if(step.id==='export'){if(guide.verified!==state.ledger.head){$('verify').click();return;}if(guide.exported!==state.ledger.head){if(passphraseFeedback($('export-passphrase').value).ok)$('encrypted-export').click();else focusPanel('export-passphrase');return;}if(guide.checkpoint!==state.ledger.head){$('checkpoint').click();return;}}
 focusPanel(step.target);
});
function renderStepRail(){
 const current=guideHistory[reviewIndex??guideHistory.length-1]?.step.id;
 $('guided-steps').replaceChildren(...guidedSteps(guide.mode,guide.boardEnabled).filter(s=>s.id!=='complete'||guideHistory.some(e=>e.step.id==='complete')).map((step,number)=>{const index=guideHistory.findLastIndex(e=>e.step.id===step.id),b=text('button',(step.id==='complete'?'✓':String(number+1).padStart(2,'0'))+' '+({sources:'Incident',sample:'Investigate',spark:'Spark',wonder:'Wonder',accept:'Decide',board:'Board',shock:'Shock',recover:'Reinvestigate',reaccept:'Revise','board-revised':'Replan',export:'Proof',complete:'Complete'}[step.id]??step.title));b.disabled=index<0;b.setAttribute('aria-current',current===step.id?'step':'false');b.setAttribute('aria-label',(index<0?'Upcoming: ':current===step.id?'Current: ':'Review completed: ')+step.title);b.addEventListener('click',()=>index===guideHistory.length-1?(exitReview(),focusPanel(guideStep(state,guide).target)):viewPast(index));return b;}));
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
function renderRouteHealth(){if(!state)return;const view=routeHealthView($('provider').value,state.routeHealth);$('provider-status').textContent=view.message;$('provider-status').dataset.light=view.light;$('route-checklist').textContent=$('provider').value==='sample'?'Offline walkthrough ready. No connection needed.':view.light==='GREEN'?'Connection verified. Selected Meta model is ready.':view.light==='RED'?'Connection could not be verified. Check another route.':'Check the connection, then start the investigation.';$('investigation-empty').hidden=Boolean(run); $('provider-check').hidden=$('provider').value==='sample';$('provider-check').disabled=reviewIndex!==null||$('provider').value==='sample'||state.operator?.role==='auditor';}
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
 const coexistenceBanner=$('board-coexistence-banner');if(coexistenceBanner){const blocked=state.board?.tasks?.filter(t=>t.status==='Blocked').length??0;const proposed=state.britt?.proposal?state.britt.proposal.board.tasks.filter(t=>t.status!=='Done').length:0;const show=Boolean(state.britt?.proposal);coexistenceBanner.hidden=!show;if(show)coexistenceBanner.textContent=blocked+' BLOCKED prior (plan retained) · '+proposed+' PROPOSED replacements · UNTRACKED UNTIL APPROVAL';}if(!guide)$('britt-activity').replaceChildren(text('strong','THE BRITT'),text('span',state.britt?.proposal?'PROPOSED · UNTRACKED UNTIL APPROVAL':state.decision.status==='invalidated'?'Second shock · evidence and plan review required':accepted?('Human recovery accepted · '+(state.board?.tasks?.length??0)+' tracked · '+(state.board?.tasks?.filter(t=>t.status==='Blocked').length??0)+' blocked · '+(state.board?.tasks?.filter(t=>t.status==='Done').length??0)+' done'):'Evidence → calculations → human decision'));
 $('factory-status').textContent=accepted?'RECOVERY ACCEPTED · '+titles[state.decision.optionId]:'MATERIAL HOLD · '+(state.decision.status==='invalidated'?'SECOND SHOCK':'CERTIFICATE DISCREPANCY');
 const previousSnapshot=guideHistory[0]?.state;const changedSnapshot=previousSnapshot&&previousSnapshot.snapshot.snapshotDigest!==state.snapshot.snapshotDigest;$('factory-delta').hidden=!changedSnapshot;if(changedSnapshot){const delta=state.snapshot.cells.filter(c=>!c.online).map(c=>c.cellId+' OFFLINE').join(' · ');$('factory-delta').textContent=delta+' · '+previousSnapshot.analysis.recovery.feasibleCount+' → '+state.analysis.recovery.feasibleCount+' feasible paths';}if($('constraint-change'))$('constraint-change').hidden=changedSnapshot||!$('constraint-change').textContent;

 const stage=document.body.dataset.activeStage,scene=stageScene(stage,state,guide);
 // Match viewBox aspect to the live SVG box exactly — any fixed floor letterboxes and fails the fill gate.
 const svgW=Math.max(320,svg.clientWidth||900),svgH=Math.max(200,svg.clientHeight||520);
 const height=Math.max(200,Math.round(900*svgH/svgW));
 svg.setAttribute('viewBox',`0 0 900 ${height}`);svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.dataset.scene=scene.kind;
 const defs=add('defs',{});const previewHatch=add('pattern',{id:'preview-hatch',width:10,height:10,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},null,defs);add('rect',{width:10,height:10,fill:'#19271f'},null,previewHatch);add('path',{d:'M 0 0 V 10',stroke:'#C5CCD4','stroke-width':2},null,previewHatch);
 const floorGlow=add('radialGradient',{id:'floor-glow',cx:'50%',cy:'35%',r:'65%'},null,defs);add('stop',{offset:'0%',['stop-color']:'#2a7a48',['stop-opacity']:.35},null,floorGlow);add('stop',{offset:'100%',['stop-color']:'#050705',['stop-opacity']:0},null,floorGlow);
 const zone=(name)=>add('g',{'data-layout-zone':name});
 const depth=zone('depth');add('rect',{x:0,y:0,width:900,height,fill:'url(#floor-glow)',class:'factory-floor-glow'},null,depth);
 // Layered isometric floor: rear wall, mid plane, front apron (Wonder P1 depth without overlapping stations).
 add('path',{d:`M 70 ${height*.38} L 180 ${height*.28} H 720 L 830 ${height*.38} Z`,fill:'#0a140f',stroke:'#2f4a3a','stroke-width':1,opacity:.42,class:'factory-floor-rear'},null,depth);
 add('path',{d:`M 40 ${height-18} L 180 ${height*.42} H 720 L 860 ${height-18} Z`,fill:'#0c1610',stroke:'#3a5444','stroke-width':1,opacity:.58,class:'factory-floor-plane'},null,depth);
 add('path',{d:`M 30 ${height-8} L 160 ${height*.58} H 740 L 870 ${height-8} Z`,fill:'#101c15',stroke:'#456555','stroke-width':1,opacity:.35,class:'factory-floor-apron'},null,depth);
 for(let g=0;g<10;g++)add('line',{x1:50+g*85,y1:height-14,x2:190+g*62,y2:height*.40,stroke:'#304e3b',['stroke-width']:1,opacity:.32,class:'factory-floor-grid'},null,depth);
 for(let g=0;g<6;g++)add('line',{x1:120+g*120,y1:height*.58,x2:210+g*90,y2:height*.30,stroke:'#A8F04A',['stroke-width']:1,opacity:.08,class:'factory-floor-glow-line'},null,depth);
 const callouts=zone('callouts'),machines=zone('machines'),routes=zone('routes'),orders=zone('orders'),paths=zone('paths');
 const label=(x,y,value,size=20,parent=callouts,extra={})=>add('text',{x,y,'font-size':size,class:'scene-size-'+size,fill:'#e4eee3',...extra},value,parent);
 const box=(x,y,width,h,parent,stroke='#71877a',fill='#132019')=>add('rect',{x,y,width,height:h,rx:8,fill,stroke,'stroke-width':2},null,parent);
 const activate=(g,fn)=>{g.setAttribute('tabindex','0');g.setAttribute('role','button');g.addEventListener('click',()=>{if(reviewIndex===null)fn();});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();g.dispatchEvent(new Event('click'));}});};
 if(scene.kind==='tasks'||scene.kind==='proof'){
  for(const child of [...svg.children]){if(child.tagName!=='defs')child.style.display='none';}
  const hero=add('g',{'data-scene-hero':scene.kind});
  if(scene.kind==='tasks'){
   if(!scene.pending){
    const statuses=['To do','In progress','Blocked','Done'];
    const cardHeight=Math.min(280,height-170);
    statuses.forEach((status,column)=>{
     const x=24+column*200;
     box(x,24,190,height-110,hero,status==='Blocked'?'#b78f7e':'#71877a');
     const tasks=scene.tasks.filter(t=>t.status===status),chosen=tasks.find(t=>scene.tasks.indexOf(t)===inspectedTask)??tasks[0];label(x+10,56,status+' · '+tasks.length,20,hero);
     (chosen?[chosen]:[]).forEach((task,row)=>{
      const y=80+row*cardHeight,index=scene.tasks.indexOf(task),tile=add('g',{'data-scene-task':index,class:'scene-task-tile','aria-label':'Inspect tracked task '+task.title},null,hero);
      box(x+8,y,174,cardHeight-10,tile,index===inspectedTask?'#A8F04A':'#71877a');
      label(x+18,y+25,task.id,18,tile);
      tileTitle(task.title,16,Math.max(2,Math.floor((cardHeight-80)/28))).forEach((line,n)=>label(x+18,y+58+n*28,line,18,tile));
      activate(tile,()=>{inspectedTask=index;renderBoard();renderFactory();});
     });
    });
    scene.tasks.forEach((task,i)=>{const g=add('g',{'aria-label':'Inspect tracked task '+(i+1)+': '+task.title},null,hero),x=24+i*(800/scene.tasks.length);box(x,height-70,Math.min(80,800/scene.tasks.length-4),44,g,i===inspectedTask?'#A8F04A':'#71877a');label(x+10,height-40,String(i+1),20,g);activate(g,()=>{inspectedTask=i;renderBoard();renderFactory();});});
   }else{
   // Scene header carries the single coexistence line; side zone repeats it once in #board-outcomes only.
   add('text',{x:24,y:32,'font-size':18,fill:'#e8ede6','font-weight':700},scene.pending?(scene.blocked+' BLOCKED · plan retained · '+scene.tasks.length+' PROPOSED'):(scene.blocked+' BLOCKED PRIOR · '+scene.tasks.length+' TRACKED'),hero);
   const machineContext=add('g',{'data-scene-band':'board-machines'},null,hero);
   // Wonder 186 step 4: compact station cards with geometry-safe gaps for title / OFFLINE / capacity.
   const stationY=52,stationH=122;
   const receivingSlot={x:24,width:200};
   const receivingCard=add('g',{'data-scene-machine':'RECEIVING',class:'factory-node board-machine'},null,machineContext);
   box(receivingSlot.x,stationY,receivingSlot.width,stationH,receivingCard,accepted?'#A8F04A':'#71877a');
   label(receivingSlot.x+16,stationY+28,'RECEIVING',18,receivingCard,{'font-weight':700});
   label(receivingSlot.x+16,stationY+56,accepted?'VERIFIED RECOVERY':'MATERIAL HOLD',16,receivingCard,{fill:'#c5ccd4'});
   label(receivingSlot.x+16,stationY+92,state.snapshot.incident.heldMaterialId,16,receivingCard);
   const boardSlots=[];
   scene.cells.forEach((cell,i)=>{
    const slot=factoryPositions(250,824,scene.cells.length,360)[i];
    boardSlots.push({cell,slot});
    const card=add('g',{'data-scene-machine':cell.cellId,class:'factory-node board-machine'+(!cell.online?' held':'')},null,machineContext);
    box(slot.x,stationY,slot.width,stationH,card,!cell.online?'#C5CCD4':accepted&&activeCells.has(cell.cellId)?'#A8F04A':'#71877a');
    if(!cell.online){
     // Hatch + corner × + OFFLINE text only — no full-card diagonals over the replan label (Wonder P1).
     card.querySelector('rect').setAttribute('fill','url(#preview-hatch)');
     label(slot.x+slot.width-26,stationY+24,'×',22,card,{fill:'#C5CCD4','font-weight':800,class:'offline-x'});
    }
    label(slot.x+18,stationY+26,cell.cellId,17,card,{'font-weight':700});
    label(slot.x+18,stationY+64,!cell.online?'OFFLINE':accepted&&activeCells.has(cell.cellId)?'IN ACCEPTED PLAN':'AVAILABLE',15,card,{fill:'#c5ccd4',class:!cell.online?'offline-label':''});
    label(slot.x+18,stationY+100,cell.online?cell.availableHours+'h capacity':'replan required',18,card,{'font-weight':700,class:!cell.online?'offline-replan':''});
   });
   // Wonder P1 step 8 / 186 step 4: living flow only along accepted Receiving → online mill; never through OFFLINE CELL-MILL-2.
   const onlineMill=boardSlots.find(s=>s.cell.online)||boardSlots[0];
   const offlineMill=boardSlots.find(s=>!s.cell.online);
   if(onlineMill){
    add('path',{d:`M ${receivingSlot.x+receivingSlot.width} ${stationY+stationH/2} H ${onlineMill.slot.x}`,class:'board-sequence-spine'+(accepted?' accepted-living-flow':''),fill:'none',stroke:'#A8F04A','stroke-width':3,'stroke-dasharray':accepted?'0':'10 6'},null,machineContext);
    if(accepted){
     const flowStart=receivingSlot.x+receivingSlot.width+8,flowEnd=onlineMill.slot.x-8,span=Math.max(flowEnd-flowStart,40);
     for(let i=0;i<8;i++){const x=flowStart+(span/8)*i;add('rect',{x,y:stationY+stationH/2-8,width:18,height:14,rx:3,fill:'#A8F04A',class:'material-flow board-accepted-lot lot-'+i},null,machineContext);}
    }
   }
   if(offlineMill){
    add('path',{d:`M ${onlineMill?onlineMill.slot.x+onlineMill.slot.width:receivingSlot.x+receivingSlot.width} ${stationY+stationH/2} H ${offlineMill.slot.x+8}`,class:'board-sequence-stop',fill:'none',stroke:'#C5CCD4','stroke-width':2,'stroke-dasharray':'4 6'},null,machineContext);
   }
   const taskSlots=proposalLayout(scene.tasks.length,height);
   const taskAnchors=[];
   scene.tasks.forEach((task,i)=>{
    const slot=taskSlots[i];if(slot.page!==taskSlots[inspectedTask]?.page)return;const {x,y}=slot,tileW=slot.width,tileH=slot.height;
    taskAnchors.push({i,x,y,tileW,tileH});
    const tile=add('g',{'data-scene-task':i,role:'button',tabindex:0,'aria-label':'Inspect proposed task '+(i+1)+': '+task.title+' · UNTRACKED UNTIL APPROVAL','aria-pressed':String(i===inspectedTask),class:'scene-task-tile'+(i===inspectedTask?' britt-focus-task':'')},null,hero);
    const select=()=>document.querySelector('[data-proposal-index="'+i+'"]')?.click();tile.addEventListener('click',select);tile.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
    box(x,y,tileW,tileH,tile,i===inspectedTask?'#A8F04A':'#71877a',i===inspectedTask?'#1b3525':'#101b14');
    // Single header line keeps PROPOSED + id without text/text overlap (Wonder P1 + visual gate).
    label(x+14,y+30,'PROPOSED · '+String(i+1).padStart(2,'0')+' · '+task.id,18,tile,{'font-weight':700,fill:'#88eba8',class:'proposal-scene-badge'});
    const titleLines=tileTitle(task.title,Math.floor((tileW-28)/8),Math.max(2,slot.titleLines-1));
    titleLines.forEach((line,n)=>label(x+14,y+58+n*28,line,16,tile,{'font-weight':600}));
    const dependsY=y+(slot.dependsY??slot.titleBottom+26);
    const dueY=y+(slot.dueY??tileH-58);
    const statusY=y+(slot.statusY??tileH-22);
    const barY=y+(slot.barY??tileH-86);
    if(dependsY+18<=barY-4)label(x+14,dependsY,task.dependsOn.length?'After '+task.dependsOn.join(', '):'Ready to begin',18,tile,{fill:'#88eba8'});
    label(x+14,dueY,'Due +'+Number(task.dueHours.toFixed(2))+'h',18,tile);
    // Compact scene label — full phrase lives on the card aria-label and board-outcomes (Wonder P1, no card bleed).
    // Compact scene label — full "UNTRACKED UNTIL APPROVAL" lives on board-outcomes (Wonder 186; geometry-safe).
    label(x+14,statusY,'UNTRACKED',16,tile,{fill:'#c5ccd4','font-weight':700,class:'proposal-untracked'});
    tile.querySelector('rect').setAttribute('stroke-dasharray',i===inspectedTask?'none':'6 4');
    tile.classList.add('proposal-focusable');
    if(tileH>230&&barY+16<=dueY-6&&dependsY+18<=barY-2){const maxDue=Math.max(...scene.tasks.map(t=>t.dueHours),1);box(x+14,barY,tileW-28,12,tile,'#71877a','#0b130e');add('rect',{x:x+14,y:barY,width:(tileW-28)*Math.max(0,task.dueHours)/maxDue,height:12,rx:4,fill:'#88eba8'},null,tile);}
   });
   // Wonder P1 step 4: t1→t3 sequence connectors between proposed cards.
   for(let i=0;i<taskAnchors.length-1;i++){
    const a=taskAnchors[i],b=taskAnchors[i+1];
    add('path',{d:`M ${a.x+a.tileW} ${a.y+a.tileH/2} H ${b.x}`,class:'proposal-sequence-line',fill:'none',stroke:'#A8F04A','stroke-width':2,'stroke-dasharray':'8 5'},null,hero);
   }
   if(onlineMill&&taskAnchors[0]){
    const t0=taskAnchors[0];
    add('path',{d:`M ${onlineMill.slot.x+onlineMill.slot.width/2} ${stationY+stationH} V ${t0.y}`,class:'board-sequence-spine',fill:'none',stroke:'#A8F04A','stroke-width':2,'stroke-dasharray':'8 6'},null,hero);
   }
   }
  }else{
   add('text',{x:24,y:48,'font-size':32,fill:'#e8ede6','font-weight':700},scene.gates.every(Boolean)?'Recovery complete. Evidence sealed.':scene.events+' events. One verified chain.',hero);
   const chainY=78;
   add('path',{d:`M 150 ${chainY} H 750`,class:'proof-chain-spine',fill:'none',stroke:scene.gates.every(Boolean)?'#A8F04A':'#5f7a68','stroke-width':4},null,hero);
   // Wonder 191 step 9: one status word per card BELOW the event track — never READY/LOCKED on the dashed spine.
   add('path',{d:`M 155 ${chainY} H 745`,class:'proof-progress-trace',fill:'none',stroke:'#A8F04A','stroke-width':3,'stroke-dasharray':'14 8'},null,hero);
   ['VERIFY LEDGER','SEAL PACKET','RETAIN CHECKPOINT'].forEach((label,i)=>{
    const x=18+i*292,done=scene.gates[i],ready=i===0||scene.gates[i-1];
    const firstReady=ready&&!done&&scene.gates.findIndex((g,j)=>(j===0||scene.gates[j-1])&&!g)===i;
    const status=done?'SEALED':firstReady?'READY':'LOCKED';
    add('circle',{cx:x+137,cy:chainY,r:14,fill:done?'#A8F04A':firstReady?'#A8F04A':'#C5CCD4',stroke:'#C5CCD4','stroke-width':2,class:done?'proof-chain-node sealed':firstReady?'proof-chain-node ready':'proof-chain-node'},null,hero);
    add('rect',{x,y:90,width:276,height:height-140,rx:10,fill:done?'#193422':firstReady?'#163224':'#12181a',stroke:done?'#c6ed8d':firstReady?'#A8F04A':'#C5CCD4','stroke-width':firstReady?3:2,'stroke-dasharray':ready?'none':'6 5',class:done?'proof-station sealed':firstReady?'proof-station ready':'proof-station'},null,hero);
    add('rect',{x:x+4,y:94,width:268,height:12,rx:3,fill:done?'#A8F04A33':firstReady?'#A8F04A22':'#C5CCD422',class:'proof-station-bevel'},null,hero);
    add('text',{x:x+18,y:90+(height-140)*.18,'font-size':48,fill:done?'#c6ed8d':firstReady?'#A8F04A':'#C5CCD4'},done?'✓':String(i+1).padStart(2,'0'),hero);
    add('text',{x:x+18,y:90+(height-140)*.36,'font-size':16,fill:'#e8ede6','font-weight':650,class:'proof-card-body'},label,hero);
    const chain=add('g',{'aria-label':scene.events+' recorded events · '+(done?'sealed':'awaiting this step')},null,hero);const marks=Math.min(scene.events,24),cols=8;for(let n=0;n<marks;n++){add('rect',{x:x+18+(n%cols)*27,y:90+(height-140)*.48+Math.floor(n/cols)*16,width:18,height:7,rx:2,fill:done?'#88eba8':'#52685a'},null,chain);}
    add('text',{x:x+18,y:90+(height-140)*.78,'font-size':26,fill:done?'#c6ed8d':firstReady?'#A8F04A':'#C5CCD4','font-weight':700,class:'proof-status-word'},status,hero);
    if(!ready)add('text',{x:x+18,y:90+(height-140)*.92,'font-size':14,fill:'#A8B0A8',class:'proof-locked-helper'},'Dashed · complete prior step first',hero);
   });
  }

 }else{
  // Reserved vertical bands: compare/callout | bay | machines | jobs | options.
  // Shock capacity preview sits in the top callout band ABOVE stations — never beside or over them.
  const shockStage=stage==='shock';
  // Compare/callout band must clear certificate rows before DOCK/QA; never share glyphs with the bay.
  // Wonder 186 step 1: keep stations/jobs dominant (>=70%) while option labels stay geometry-safe.
  const topBand=shockStage?Math.max(100,Math.min(118,Math.round(height*0.17))):Math.max(104,Math.min(128,Math.round(height*0.14)));
  const bayY=topBand+6;
  const machineY=bayY+26;
  const optionH=Math.min(76,Math.max(56,Math.round(height*0.11)));
  const optionY=height-optionH-8;
  // Keep jobs and options in separate reserved bands even when the stage is short.
  const bandGap=Math.max(12,Math.round(height*0.022));
  const available=Math.max(120,optionY-machineY-bandGap);
  const nodeH=Math.min(136,Math.max(58,Math.floor((available-bandGap)/2)));
  const jobY=Math.min(optionY-nodeH-bandGap,machineY+nodeH+bandGap);
  const lineRight=876;
  const receivingWidth=210-16-14;
  const cellCount=Math.max(cells.length,1),machineSlots=factoryPositions(210,lineRight,cellCount,Math.max(210,Math.floor((lineRight-210-13*(cellCount-1))/cellCount)));
  if(shockStage){
   const cell=cells.find(c=>c.cellId===$('shock-cell').value);
   const panel=add('g',{'data-layout-zone':'callouts','data-scene-band':'callout','data-scene-callout':'capacity-preview'},null,callouts);
   box(24,8,852,96,panel,'#9caea0','#152019');
   // Silver hatch + × + OFFLINE chip live in the reserved callout band (Wonder P1), never over stations.
   add('rect',{x:24,y:8,width:852,height:96,fill:'url(#preview-hatch)',opacity:.55},null,panel);
   label(40,40,cell?cell.cellId:'CAPACITY',24,panel,{'font-weight':700});
   label(40,72,'CAPACITY PREVIEW',18,panel,{fill:'#c5ccd4'});
   // Keep the 26px+ capacity metric alone in the center; OFFLINE chip sits in its own right column (no text/text overlap).
   label(300,62,cell?cell.availableHours+'h → 0h':'Outage applied',32,panel,{'font-weight':700,class:'capacity-metric capacity-drain'});
   label(560,40,'× WILL GO OFFLINE',18,panel,{fill:'#C5CCD4','font-weight':800,class:'offline-x'});
   label(560,72,cell?'Apply → invalidate acceptance':'Fresh decision',18,panel,{fill:'#c5ccd4'});
   // Side-zone preview mirror: hatched pattern + text for pattern-plus-text redundancy (Wonder step 5).
   const shockPreviewEl=$('shock-preview');
   if(shockPreviewEl){shockPreviewEl.classList.add('shock-preview-hatch');shockPreviewEl.textContent=cell?(cell.cellId+' · × WILL GO OFFLINE · '+cell.availableHours+'h → 0h'):'Selecting a machine previews the offline state on the factory line.';}
   // Leader ends in the bay band above stations — never through machine faces.
   if(cell){const idx=Math.max(0,cells.findIndex(c=>c.cellId===cell.cellId));const slot=machineSlots[idx]??{x:210,width:186};add('path',{d:`M ${slot.x+slot.width/2} 104 V ${bayY+16}`,class:'route-held shock-withdraw',fill:'none','stroke-width':2,'stroke-dasharray':'4 4','data-scene-band':'callout'},null,routes);}
   // Wonder P1 step 5: hatch sweep class on the capacity preview panel (CSS carries motion).
   panel.classList.add('shock-hatch-sweep');
  }else{
   const allQuantities=state.evidence.filter(e=>e.quantity&&e.source.field==='quantity'),qty=comparisonRange(allQuantities),comparison=certificateComparison(qty,420);
   // Keep quantity rows clear of each other after SVG scale — font-34 glyphs need >=56px bands.
   const compareRows=Math.max(qty.length,1),compareRow=Math.max(56,Math.min(64,Math.floor((topBand-12)/compareRows)));
   qty.forEach((e,i)=>{const g=add('g',{'data-evidence':e.evidenceId,'data-scene-band':'compare','aria-label':evidencePlainEnglish(e)},null,callouts),y=6+i*compareRow;
    activate(g,()=>{$('evidence').parentElement.open=true;focusPanel('evidence');$(e.evidenceId)?.focus();});g.addEventListener('focus',()=>highlightEvidence(e.evidenceId));g.addEventListener('pointerenter',()=>highlightEvidence(e.evidenceId));
    const role=allQuantities.length>2?(i?'lowest':'highest'):(i?'receiving':'certificate');
    g.setAttribute('data-compare-role',role);
    label(24,y+28,allQuantities.length>2?(i?'Lowest source':'Highest source'):(i?'Receiving':'Certificate'),22,g);label(210,y+28,String(e.quantity.value),30,g,{'text-anchor':'end'});
    box(230,y+2,420,Math.min(34,compareRow-16),g);add('rect',{x:230,y:y+2,width:comparison.widths[i],height:Math.min(34,compareRow-16),rx:5,fill:i?'#A8F04A':'#c5ccd4','data-compare-role':role,class:'compare-track'},null,g);
   });
   label(660,40,'DOES NOT MATCH',24,callouts,{class:'mismatch-label scene-size-22','font-weight':800});
   // Wonder 189: emerald brackets spanning the 120→80 gap; crack cue static under reduced motion.
   add('path',{d:'M 640 12 H 655 V 68 H 640',class:'mismatch-bracket',fill:'none',stroke:'#A8F04A','stroke-width':2.5},null,callouts);
   add('path',{d:'M 640 18 L 652 40 L 640 62',class:'mismatch-crack',fill:'none',stroke:'#A8F04A','stroke-width':3},null,callouts);
  }
  const bay=add('g',{'data-scene-band':'bay'},null,callouts);
  label(24,bayY+18,'DOCK',20,bay,{class:'dock-bay scene-size-18'});label(110,bayY+18,'QA',20,bay,{class:'qa-gate scene-size-18'});
  add('path',{d:`M 180 ${bayY+14} H ${lineRight}`,class:'conveyor-belt',stroke:'#496353','stroke-width':14},null,routes);
  add('path',{d:`M 180 ${bayY+14} H ${lineRight}`,class:accepted?'route-running living-spine':'route-held living-spine',fill:'none','stroke-width':5,'stroke-dasharray':accepted?'0':'10 8'},null,routes);
  // Wonder P1 step 1: brushed-silver machine volume + emerald lots Dock→QA→Receiving; held flow stops at × HOLD.
  for(let i=0;i<8;i++)add('rect',{x:180+i*92,y:machineY-18,width:84,height:18,rx:3,fill:'#1a2420',stroke:'#C5CCD466','stroke-width':1,opacity:.75,class:'machine-silhouette machine-volume'},null,depth);
  for(let i=0;i<7;i++)add('rect',{x:210+i*100,y:machineY-34,width:60,height:12,rx:2,fill:'#121a16',stroke:'#C5CCD444','stroke-width':1,opacity:.55,class:'machine-silhouette rear-silhouette'},null,depth);
  for(let i=0;i<6;i++)add('rect',{x:240+i*110,y:machineY-48,width:44,height:8,rx:2,fill:'#0a100c',stroke:'#C5CCD433','stroke-width':1,opacity:.4,class:'machine-silhouette far-silhouette'},null,depth);
  const holdStopX=16+receivingWidth+8;
  const flowLimit=accepted?lineRight:holdStopX;
  for(let i=0;i<20;i++){const x=176+i*36;if(x+12>flowLimit)break;add('rect',{x,y:bayY+3,width:24,height:20,rx:3,fill:accepted?'#A8F04A':'#8aa396',class:(accepted?'material-flow':'material-flow held-flow')+' lot-'+i},null,routes);}
  for(let i=0;i<14;i++){const cx=184+i*58;if(cx>flowLimit)break;add('circle',{cx,cy:bayY+14,r:4.5,fill:accepted?'#dafb9a':'#c5ccd4',class:(accepted?'material-spark':'material-spark held-spark')+' spark-'+i},null,routes);}
  // Hold stop marker sits on the conveyor end only — RECEIVING already carries × HOLD text (geometry-safe).
  if(!accepted){add('circle',{cx:holdStopX,cy:bayY+14,r:7,fill:'#C5CCD4',stroke:'#050705','stroke-width':2,class:'hold-flow-stop'},null,routes);add('text',{x:holdStopX,y:bayY+18,'font-size':12,fill:'#050705','text-anchor':'middle','font-weight':800,class:'hold-flow-stop'},'×',routes);}
  // Wonder P1 step 1: Certificate → Receiving → mills feed animates into station faces (audit38).
  if(!shockStage){
   const feed=add('g',{'data-scene-band':'compare','class':'cert-recv-feed','aria-hidden':'true'},null,routes);
   for(let i=0;i<5;i++)add('circle',{cx:250+i*70,cy:bayY-8,r:3.5,fill:i%2?'#A8F04A':'#c5ccd4',class:'cert-feed-spark spark-'+i},null,feed);
   add('path',{d:`M 230 40 C 280 ${bayY-4}, 320 ${bayY+4}, 110 ${bayY+14}`,class:'cert-recv-trace',fill:'none',stroke:'#A8F04A','stroke-width':2,'stroke-dasharray':'8 6'},null,feed);
  }
  const legend=$('factory-legend');
  if(legend){
   const launcher=legend.querySelector('#plant-launcher');
   legend.replaceChildren();
   // Guided mode: launcher only — legend chips collided with the action bar at 1366 (audit41). Pattern+text stay on nodes (× OFFLINE / hatch).
   if(!guide){
    for(const [mark,label] of [['●','RUNNING'],['▣','HELD / BLOCKED'],['✕','OFFLINE'],['◆','FEASIBLE RECOVERY']]){
     const chip=document.createElement('span');chip.className='scene-legend-chip';chip.textContent=mark+' '+label;legend.append(chip);
    }
   }
   if(launcher){legend.append(launcher);}
  }
  const node=(x,y,title,sub,kind,parent,width=186,detail='')=>{
   const g=add('g',{class:'factory-node '+kind,'data-scene-band':parent===orders?'jobs':'machines','aria-label':title+' '+(title===previewOffline?'PREVIEW - not applied':sub)+(detail?' · '+detail:'')},null,parent);
   const stopped=kind==='held',preview=title===previewOffline,stroke=stopped?'#C5CCD4':preview?'#c5ccd4':kind==='running'?'#A8F04A':'#71877a';
   // Three live status lines fill the card — Captions stay inside the node box so they cannot intersect the next reserved band.
   // Layered machine body — bevels stay strictly inside the node rect so bands never collide.
   const face=stopped?'#13231b':kind==='running'?'#1b3524':'#1c2620';
   box(x,y,width,nodeH,g,stroke,face);
   // Brushed-silver machine volume (Wonder P1 step 1) — bevels stay inside the node rect.
   add('rect',{x:x+3,y:y+3,width:width-6,height:12,rx:3,fill:stopped?'#C5CCD444':kind==='running'?'#A8F04A44':'#C5CCD433',class:'machine-bevel machine-volume-top'},null,g);
   add('rect',{x:x+width-14,y:y+14,width:10,height:nodeH-20,rx:2,fill:stopped?'#C5CCD466':kind==='running'?'#163826cc':'#C5CCD455',class:'machine-bevel machine-volume-side'},null,g);
   add('rect',{x:x+6,y:y+nodeH-10,width:width-20,height:5,rx:2,fill:'#05070588',class:'machine-bevel machine-volume-base'},null,g);
  if(stopped){g.querySelector('rect').setAttribute('fill','url(#preview-hatch)');}
  // Pattern fill + corner × + plain OFFLINE text — no full-card diagonals crossing labels (Wonder P1 / audit33).
  if(stopped){label(x+width-28,y+Math.round(nodeH*0.26),'×',26,g,{fill:'#C5CCD4','font-weight':800,class:'offline-x'});}
  if(preview){g.classList.add('preview-offline');g.querySelector('rect').setAttribute('stroke-dasharray','8 5');label(x+width-30,y+Math.round(nodeH*0.28),'×',24,g,{fill:'#C5CCD4','font-weight':800,class:'offline-x'});}
  if(kind==='running')add('circle',{cx:x+width-18,cy:y+18,r:6,fill:'#A8F04A',class:'machine-live-light'},null,g);
  const clip=Math.max(18,Math.floor(width/9));
  label(x+12,y+Math.round(nodeH*0.24),title,22,g,{'font-weight':700});
  label(x+12,y+Math.round(nodeH*0.52),(stopped?'OFFLINE':preview?'WILL GO OFFLINE':sub).slice(0,clip),18,g,{fill:'#c5ccd4',class:'node-caption scene-size-18'});
  if(detail)label(x+12,y+Math.round(nodeH*0.78),detail.slice(0,clip),18,g,{fill:'#88eba8',class:'node-caption scene-size-18'});
  activate(g,()=>{for(const old of svg.querySelectorAll('.selected-node'))old.classList.remove('selected-node');g.classList.add('selected-node');$('factory-selection').hidden=false;$('factory-selection').textContent=title+' · '+sub+(detail?' · '+detail:'');});
  return g;
 };
 const receivingNode=node(16,machineY,'RECEIVING',accepted?'VERIFIED RECOVERY':'× HOLD','idle',machines,receivingWidth,state.snapshot.incident.heldMaterialId);receivingNode.setAttribute('data-scene-machine','RECEIVING');receivingNode.classList.toggle('material-stopped',!accepted&&cells.every(c=>c.online));
  // Wonder 186: RECEIVING focus lights Certificate discrepancy tracks (bidirectional with highlightEvidence).
  receivingNode.addEventListener('focus',()=>highlightEvidence('ev-cert-qty'));
  receivingNode.addEventListener('pointerenter',()=>highlightEvidence('ev-recv-qty'));
 cells.forEach((c,i)=>{const machine=node(machineSlots[i].x,machineY,c.cellId,c.online?(activeCells.has(c.cellId)&&accepted?'RECOVERY FLOW':'AVAILABLE'):'OFFLINE',!c.online?'held':accepted&&activeCells.has(c.cellId)?'running':'idle',machines,machineSlots[i].width,c.cellId===previewOffline?'WILL GO OFFLINE':c.online?c.availableHours+'h capacity':'0h · replan');machine.setAttribute('data-scene-machine',c.cellId);});
  const jobSlots=factoryPositions(24,lineRight,Math.max(jobs.length,1),Math.max(210,Math.floor((lineRight-24-13*(Math.max(jobs.length,1)-1))/Math.max(jobs.length,1))));
  // Wonder 170 step 1: living emerald risk trace from RECEIVING hold into every at-risk job.
  if(!accepted&&!shockStage&&jobs.length){
   const risk=add('g',{'data-scene-band':'bay','class':'receiving-job-risk','aria-hidden':'true'},null,routes);
   jobs.forEach((j,i)=>{
    const slot=jobSlots[i];
    const midY=machineY+nodeH+8+i*10;
    add('path',{d:`M ${16+receivingWidth} ${machineY+nodeH/2} H ${16+receivingWidth+18} V ${midY} H ${slot.x+slot.width/2} V ${jobY}`,class:'risk-job-trace',fill:'none',stroke:'#A8F04A','stroke-width':2.5,'stroke-dasharray':'7 5'},null,risk);
    add('circle',{cx:slot.x+slot.width/2,cy:midY,r:3.5,fill:'#A8F04A',class:'risk-job-spark spark-'+i},null,risk);
   });
  }
  jobs.forEach((j,i)=>{
   const slot=jobSlots[i];
   node(slot.x,jobY,j.jobId,j.unitsRequired+' parts · +'+j.dueHours+'h',accepted?'running':'idle',orders,slot.width,accepted?'ON ACCEPTED PATH':'AT RISK');
   const cell=allocations.find(a=>a.jobId===j.jobId)?.cellId??allocations[0]?.cellId??cells.find(c=>c.online&&c.cellId!==previewOffline)?.cellId;
   const index=cells.findIndex(c=>c.cellId===cell&&c.online&&c.cellId!==previewOffline);
   if(index>=0){const routeY=machineY+nodeH+14+i*14;const machine=machineSlots[index];
    add('path',{d:`M ${machine.x+machine.width} ${machineY+nodeH/2} h 14 V ${routeY} H ${slot.x+slot.width/2} V ${jobY} `,class:accepted?'route-running selected-route':'route-held',fill:'none','stroke-width':3},null,routes);
   }
  });
  const optionCount=Math.max(state.analysis.recovery.options.length,1),optionPitch=(876-24)/optionCount;
  state.analysis.recovery.options.forEach((o,i)=>{
   const x=24+i*optionPitch,g=add('g',{'data-scene-band':'options','data-scene-option':o.optionId,'aria-label':titles[o.optionId]+(o.feasible?'':' constrained')},null,paths);
   const selected=o.optionId===(envelope?.optionId??state.decision.optionId);
   box(x,optionY,Math.min(278,optionPitch-12),optionH,g,selected?'#A8F04A':o.feasible?'#71877a':'#C5CCD4',o.feasible?'#132019':'url(#preview-hatch)');
   // Hatch fill carries constrained meaning; avoid a second × glyph that intersects the caption (visual gate).
   if(!o.feasible)g.classList.add('option-constrained');
   if(selected)g.classList.add('path-linked');
   g.addEventListener('pointerenter',()=>highlightPath(o.optionId));g.addEventListener('focus',()=>highlightPath(o.optionId));
   label(x+10,optionY+Math.round(optionH*0.32),(selected?'✓ ':!o.feasible?'× ':'')+titles[o.optionId],Math.min(18,Math.max(15,Math.round(optionH*0.24))),g);
   label(x+10,optionY+Math.round(optionH*0.78),o.feasible?o.finishHours+'h · $'+o.incrementalCostUsd.toLocaleString(undefined,{maximumFractionDigits:2}):'× CONSTRAINED · OFFLINE-ADJACENT',Math.min(16,Math.max(14,Math.round(optionH*0.2))),g);
   if(o.feasible)activate(g,()=>document.querySelector('[data-option="'+o.optionId+'"]')?.click());
   // Wonder P1 step 3: emerald route trace from selected feasible path through online cells into jobs.
   if(selected&&o.feasible){
    const online=machineSlots.filter((_,idx)=>cells[idx]?.online);
    if(online[0]){
     add('path',{d:`M ${online[0].x+online[0].width/2} ${machineY+nodeH} V ${jobY-8} H ${x+Math.min(278,optionPitch-12)/2} V ${optionY}`,class:'selected-path-trace',fill:'none',stroke:'#A8F04A','stroke-width':3,'stroke-dasharray':'10 6'},null,routes);
    }
   }
  });
  // Compact in-scene legend in the bay gutter (Wonder P1 step 6) — never over stations/jobs/options.
  if(guide){
   add('text',{x:300,y:bayY+18,'font-size':12,fill:'#C5CCD4',class:'scene-inline-legend'},'● RUNNING  ▣ HELD  ✕ OFFLINE  ◆ FEASIBLE',bay);
  }
  // Wonder P1 steps 6–7: when only two paths remain feasible, mark the constrained Split fade in the scene.
  if(state.analysis.recovery.feasibleCount===2){
   const constrained=paths.querySelector('.option-constrained');
   if(constrained)constrained.classList.add('path-fade-constrained');
  }
  if(!shockStage&&document.body.dataset.activeStage==='investigation'&&run?.proposalValid){
   const compare=callouts.querySelector('[data-scene-band="compare"]');
   if(compare){add('path',{d:'M 230 34 H 650',class:'finding-compare-trace',fill:'none',stroke:'#A8F04A','stroke-width':3,'stroke-dasharray':'10 6'},null,callouts);}
  }
 }
}
let sceneResizeFrame;
new ResizeObserver(()=>{cancelAnimationFrame(sceneResizeFrame);sceneResizeFrame=requestAnimationFrame(()=>{if(state)renderFactory();});}).observe($('factory-svg'));

async function draftBritt(){
 const provider=$('provider').value==='sample'?'sample':'wonder';if(provider==='wonder')$('provider').value='wonder';
 const started=Date.now();const update=()=>{$('britt-feed').textContent='The Britt · reading accepted decision and source evidence · '+Math.floor((Date.now()-started)/1000)+'s elapsed · '+Math.max(0,45-Math.floor((Date.now()-started)/1000))+'s request limit remaining. Tasks await your approval.';};update();const timer=setInterval(update,1000);$('britt-panel').setAttribute('aria-busy','true');
 try{await api('britt-draft',{provider});await refresh();const panel=$('britt-panel');const banner=$('britt-signature-banner');panel?.classList.add('britt-signature');if(banner)banner.hidden=false;focusPanel('britt-approve');}finally{clearInterval(timer);$('britt-panel').removeAttribute('aria-busy');}
}
$('britt-draft').addEventListener('click',()=>busy($('britt-draft'),draftBritt));
for(const [id,action] of [['britt-approve','approve'],['britt-decline','decline']])$(id).addEventListener('click',()=>{if(action==='decline')return busy($(id),async()=>{await api('britt-decide',{proposalId:state.britt.proposal.id,action});await refresh();recap('Proposal declined.','The human decision is recorded in the ledger.','recovery-board');});openAuthorize('Authorize The Britt’s recovery board proposal against the sealed decision.',()=>busy($('authorize-confirm'),async()=>{await api('britt-decide',{proposalId:state.britt.proposal.id,action:'approve'});closeAuthorize();await refresh();recap('Recovery tasks are tracked.','The human decision is recorded in the ledger.','recovery-board');}));});
function renderBoard(){
 const board=state.board??{tasks:[]},proposal=state.britt?.proposal;
 const feedLines=proposal
  ?[]
  :[(run?.run.sample?'Sample · offline walkthrough; no live AI':'Meta investigation'),...((run?.run.trace??[]).filter(t=>t.type==='tool_result').map(t=>'✓ '+({get_incident:'Source records read',compare_recovery_options:'Recovery paths calculated'}[t.name]??'Evidence checked'))),'Awaiting operator direction'];
 $('britt-feed').replaceChildren(...feedLines.map(v=>text('p',v)));
 $('britt-feed').hidden=Boolean(proposal);
 // Keep human gates above the proposal list so they never fall below the fold.
 const panel=$('britt-panel'),feed=$('britt-feed');
 if(panel&&feed){const title=panel.querySelector('h2');const blurb=[...panel.children].find(el=>el.tagName==='P');(blurb??title??panel).after(feed);feed.after($('britt-draft'),$('britt-approve'),$('britt-decline'));}
 $('recovery-board').hidden=Boolean(proposal);$('britt-draft').hidden=Boolean(proposal);$('britt-approve').hidden=$('britt-decline').hidden=!proposal;$('britt-draft').disabled=state.decision.status!=='accepted'||Boolean(proposal);
 $('britt-approve').classList.add('secondary');
 $('britt-approve').textContent=guide?'Review proposed tasks':'Approve The Britt’s proposal';
 $('britt-decline').classList.add('quiet');
 $('britt-work').setAttribute('aria-label','Prior tracked work and proposed replacement tasks');$('britt-work').setAttribute('role','region');$('britt-proposal').setAttribute('aria-label','Proposed tasks · scroll to inspect every task');$('britt-proposal').setAttribute('role','region');
 const banner=proposalBanner(board,proposal);const blockedPrior=board.tasks.filter(t=>t.status==='Blocked').length;const proposedCountLive=proposal?proposal.board.tasks.filter(t=>t.status!=='Done').length:0;$('board-outcomes').textContent=proposal?(blockedPrior+' BLOCKED prior, approved plan retained, '+proposedCountLive+' PROPOSED replacements UNTRACKED UNTIL APPROVAL'):banner||(board.tasks.length+' tracked · '+board.tasks.filter(t=>t.status==='Done').length+' done · '+board.tasks.filter(t=>t.status==='Blocked').length+' blocked');
 const blockedCount=board.tasks.filter(t=>t.status==='Blocked').length;const proposedCount=proposal?proposal.board.tasks.filter(t=>t.status!=='Done').length:0;
 $('britt-work').scrollTop=0;$('britt-proposal').scrollTop=0;
 // Coexistence line stays in #board-outcomes only (Wonder: do not repeat four times). Task cards keep PROPOSED badge.
 $('britt-proposal').replaceChildren(...(banner&&proposal?[text('p','The Britt is building the board','britt-signature-line'),text('p','Task 1 of '+proposedCount+' · inspect with the steppers','proposal-explain'),...(proposal.board.tasks.map((t,i)=>{const card=text('div','','proposal-task britt-build-card'+(i===0?' britt-focus-task':' proposal-compact'));card.tabIndex=0;card.style.setProperty('--build-delay',(i*90)+'ms');const guided=document.body.dataset.guided==='true';const title=t.id+' · '+t.title;const short=guided?(t.id+' · '+(t.title.length>18?t.title.slice(0,16)+'…':t.title)):title;if(guided){card.append(text('strong',short+' · UNTRACKED'));card.setAttribute('aria-label',(t.status==='Done'?'Completed':'Proposed')+' '+title+' · UNTRACKED UNTIL APPROVAL');}else{card.append(text('small',t.status==='Done'?'COMPLETED WORK RETAINED':'PROPOSED','proposal-badge'),text('small','UNTRACKED UNTIL APPROVAL · Awaiting approval','proposal-awaiting'),text('strong',title),text('small',t.owner+' · due +'+Number(t.dueHours.toFixed(2))+'h · after '+(t.dependsOn.join(', ')||'Ready')));}return card;}))]:[]));if(!proposal){$('britt-panel')?.classList.remove('britt-signature');const banner=$('britt-signature-banner');if(banner)banner.hidden=true;}
 if(proposal){const cards=[...$('britt-proposal').querySelectorAll('.proposal-task')],nav=text('nav','','proposal-pages');nav.setAttribute('aria-label','Inspect proposed tasks');const label=$('britt-proposal').querySelector('.proposal-explain');const choose=index=>{inspectedTask=index;cards.forEach((c,i)=>{c.hidden=false;c.classList.toggle('britt-focus-task',i===index);c.classList.toggle('proposal-compact',i!==index);c.classList.toggle('proposal-focus-ring',i===index);});for(const [i,b]of [...nav.children].entries()){b.setAttribute('aria-pressed',String(i===index));if(i===index)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');}label.textContent='Task '+(index+1)+' of '+cards.length+' · use Approve when ready';renderFactory();};cards.forEach((card,index)=>{card.addEventListener('focus',()=>choose(index));const b=text('button',String(index+1),'secondary');b.dataset.proposalIndex=String(index);b.setAttribute('aria-label','Inspect proposed task '+(index+1)+': '+proposal.board.tasks[index].title);b.addEventListener('click',()=>choose(index));nav.append(b);});nav.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();event.stopPropagation();const buttons=[...nav.children],i=buttons.indexOf(document.activeElement),next=buttons[(i+(event.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length];next.click();next.focus();});label.after(nav);choose(Math.min(inspectedTask,cards.length-1));}
 $('prior-work').hidden=!(proposal&&board.tasks.length);if(proposal&&board.tasks.length)$('prior-work').open=true;$('prior-work').querySelector('summary').textContent=blockedCount+' BLOCKED prior tasks · separate from proposed replacements';$('prior-work-list').replaceChildren();
 if(proposal&&board.tasks.length){
  inspectedPriorTask=Math.min(inspectedPriorTask,board.tasks.length-1);
  const nav=text('nav','','prior-task-pages');nav.setAttribute('aria-label','Inspect prior tracked tasks');
  board.tasks.forEach((task,i)=>{const b=text('button',String(i+1),'secondary');b.setAttribute('aria-label','Inspect prior task '+(i+1)+': '+task.title);b.setAttribute('aria-pressed',String(i===inspectedPriorTask));b.addEventListener('click',()=>{inspectedPriorTask=i;renderBoard();});nav.append(b);});
  const t=board.tasks[inspectedPriorTask];$('prior-work-list').append(nav,text('p','■ '+t.status+' · '+t.id+' · '+t.title));
 }

 $('recovery-board').replaceChildren(...['To do','In progress','Blocked','Done'].map(status=>{const column=text('section','','board-column');column.append(text('h3',status));for(const task of board.tasks.filter(t=>t.status===status)){const card=text('article','','task-card');card.append(text('strong',task.title),text('p',task.owner+' · due +'+Number(task.dueHours.toFixed(2))+'h from shock'),text('small','Depends on: '+(task.dependsOn.join(', ')||'Ready')),text('p',task.change?.reason??task.evidenceIds.join(' · ')));const select=text('select');select.setAttribute('aria-label','Move '+task.title);for(const label of ['To do','In progress','Blocked','Done']){const o=text('option',label);o.value=label;select.append(o);}select.value=status;select.disabled=Boolean(task.change?.requiresReview)||state.operator?.role==='auditor';select.addEventListener('change',()=>busy(select,async()=>{await api('task-move',{taskId:task.id,status:select.value,idempotencyKey:crypto.randomUUID()});await refresh();}));card.append(select);card.hidden=board.tasks.indexOf(task)!==Math.min(inspectedTask,board.tasks.length-1);column.append(card);}column.hidden=![...column.querySelectorAll('.task-card')].some(c=>!c.hidden);return column;}));
 if(!proposal&&board.tasks.length){const nav=text('nav','','tracked-task-pages');nav.setAttribute('aria-label','Inspect tracked tasks');board.tasks.forEach((task,i)=>{const b=text('button',String(i+1),'secondary');b.setAttribute('aria-label','Inspect tracked task '+(i+1)+': '+task.title);b.setAttribute('aria-pressed',String(i===inspectedTask));b.addEventListener('click',()=>{inspectedTask=i;renderBoard();renderFactory();});nav.append(b);});$('recovery-board').prepend(nav);}
}

for(const container of [$('guided-steps'),$('factory-svg'),$('britt-work')])container.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;const items=[...container.querySelectorAll('button,[tabindex="0"]')],index=items.indexOf(document.activeElement);if(index<0)return;event.preventDefault();items[(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+items.length)%items.length]?.focus();});

$('options').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||reviewIndex!==null)return;const buttons=[...$('options').querySelectorAll('[role=radio]:not(:disabled)')],index=buttons.indexOf(document.activeElement);if(index<0||requestBusy)return;event.preventDefault();const next=buttons[(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+buttons.length)%buttons.length];next.focus();next.click();});

$('approve-option').addEventListener('focus',()=>{if(guide&&reviewIndex===null)renderGuide();});

$('options').addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||reviewIndex!==null)return;
 const current=event.target.closest('[data-option]');if(!current)return;event.preventDefault();
 const next=adjacentPath(state.analysis.recovery.options,current.dataset.option,['ArrowLeft','ArrowUp'].includes(event.key)?-1:1);
 const target=[...$('options').querySelectorAll('button[data-option]')].find(b=>b.dataset.option===next&&!b.disabled);target?.focus();
});

document.querySelector('.route-preflight').addEventListener('toggle',()=>{if(document.querySelector('.route-preflight').open)$('model-output').open=false;});
$('model-output').addEventListener('toggle',()=>{if($('model-output').open)document.querySelector('.route-preflight').open=false;});

const plantLauncher=text('a','Explore the full shop ↗');plantLauncher.href='#full-shop';plantLauncher.id='plant-launcher';document.querySelector('.factory-legend').append(document.createTextNode(' · '),plantLauncher);
mountCascade({launcher:plantLauncher,loadPlant:async()=>{const response=await fetch('/api/plant',{headers:auth});if(!response.ok)throw Error('Session required');return response.json();},workflow:{api,afterAccept:async()=>{await refresh();showStage('board');await draftBritt();}}});

const sourceDialog=text('dialog','','source-dialog');sourceDialog.id='source-dialog';sourceDialog.setAttribute('aria-label','Source detail');document.body.append(sourceDialog);
function openSourceDetail(record){const close=text('button','Close source detail','secondary');close.addEventListener('click',()=>sourceDialog.close());sourceDialog.replaceChildren(text('h2',evidencePlainEnglish(record)),text('p',record.excerpt),text('code',evidenceDetailLabel(record)),close);sourceDialog.showModal();}
