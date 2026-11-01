import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function patch(rel, transform) {
  const path = join(root, rel);
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error('No change for ' + rel);
  writeFileSync(path, after);
  console.log('patched', rel, before.length, '->', after.length);
}

patch('public/index.html', (html) => html
  .replace(
    '<details id="workspace-switcher"><summary>Workspaces</summary><nav class="workspace-nav" aria-label="Workspace views">',
    '<nav id="workspace-switcher" class="workspace-nav" aria-label="Workspace views">'
  )
  .replace('</nav></details><div class="rail-signal">', '</nav><div class="rail-signal">')
  .replace(
    '<label for="shock-cell">Machine to take offline</label><select id="shock-cell">',
    '<label for="shock-cell">Machine to take offline</label><p id="shock-preview" class="shock-preview" role="status">Selecting a machine previews the offline state on the factory line.</p><select id="shock-cell">'
  )
  .replace(
    '<div class="footer-actions"><button id="verify">Verify ledger</button>',
    '<fieldset class="proof-action"><legend>Verify ledger</legend><button id="verify">Verify ledger</button></fieldset><div class="footer-actions">'
  )
  .replace(
    '<label>Export passphrase <small id="passphrase-feedback"></small><input id="export-passphrase" type="password" autocomplete="new-password"></label><button id="encrypted-export">Export encrypted packet</button><button id="checkpoint">Export independent checkpoint</button>',
    '<fieldset class="proof-action"><legend>Seal encrypted packet</legend><label>Export passphrase <small id="passphrase-feedback"></small><input id="export-passphrase" type="password" autocomplete="new-password"></label><button id="encrypted-export">Export encrypted packet</button></fieldset><fieldset class="proof-action"><legend>Retain independent checkpoint</legend><button id="checkpoint">Export independent checkpoint</button></fieldset>'
  )
);

patch('public/style.css', (css) => {
  let next = css;
  const guidedHide = 'body[data-guided=true] .story-hero{display:none!important}';
  if (!next.includes(guidedHide)) next += '\n' + guidedHide + '\n';
  next = next.replace(
    '#workspace-switcher{margin:8px 0 0;padding:8px 0;border-top:1px solid #34483b}#workspace-switcher>summary{font-size:10px;padding:5px;color:#b9ccbe}#workspace-switcher .workspace-nav{display:grid;grid-template-columns:1fr;gap:3px}#workspace-switcher button{width:100%;font-size:10px;text-align:left}',
    '#workspace-switcher{margin:8px 0 0;padding:8px 0;border-top:1px solid #34483b;display:grid;grid-template-columns:1fr;gap:3px}#workspace-switcher button{width:100%;font-size:10px;text-align:left}'
  );
  next = next.replace(
    '@media(max-width:900px){#workspace-switcher{margin:0;padding:0}#workspace-switcher>summary{font-size:9px;padding:3px 8px}#workspace-switcher .workspace-nav{display:flex;overflow:auto}#workspace-switcher button{width:auto;white-space:nowrap}#stage-rail{max-height:95px;overflow:auto}}',
    '@media(max-width:900px){#workspace-switcher{margin:0;padding:0;display:flex;overflow:auto}#workspace-switcher button{width:auto;white-space:nowrap}#stage-rail{max-height:95px;overflow:auto}}'
  );
  const extras = `
.shock-preview{font-size:11px;color:#c5ccd4;margin:4px 0 8px}.factory-node.preview-offline rect{stroke:#E5484D;filter:drop-shadow(0 0 10px #E5484D88)}.factory-node.preview-offline .node-caption{fill:#E5484D}.qa-gate{fill:#1a241c;stroke:#7d9484}.conveyor-belt{fill:#101713;stroke:#536457}.dock-bay{fill:#141c16;stroke:#6d8574}.proof-action{border:1px solid #34483b;border-radius:6px;padding:8px;margin:8px 0;min-width:0}.proof-action legend{padding:0 6px;color:#c5ccd4;font-size:10px;letter-spacing:.4px}.factory-svg-cinematic .material-flow{animation:lot-flow 1.4s linear infinite}@keyframes lot-flow{from{opacity:.35}to{opacity:1}}@media(prefers-reduced-motion:reduce){.factory-svg-cinematic .material-flow{animation:none}}
`;
  if (!next.includes('.shock-preview{')) next += extras;
  return next;
});

patch('public/app.mjs', (app) => {
  let next = app.replace(
    "for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{showStage(button.dataset.view);$('workspace-switcher').open=false;const panel=document.querySelector('[data-stage=\"'+button.dataset.view+'\"]');panel.tabIndex=-1;panel.focus({preventScroll:true});});",
    "for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{showStage(button.dataset.view);const panel=document.querySelector('[data-stage=\"'+button.dataset.view+'\"]');panel.tabIndex=-1;panel.focus({preventScroll:true});});"
  );
  if (!next.includes("shock-cell').addEventListener('change'")) {
    next = next.replace(
      "$('shock').addEventListener('click',()=>busy($('shock'),async()=>{await api('shock',{cellId:$('shock-cell').value});await refresh();recap('The second shock changed the plan.','The prior acceptance is invalid. Investigate the recalculated capacity before a fresh decision.','capacity');notice('Machine outage applied. Prior acceptance is invalid; investigate the changed snapshot.');}));",
      "$('shock-cell').addEventListener('change',()=>{const preview=$('shock-preview');if(preview)preview.textContent=$('shock-cell').value+' will show OFFLINE with red cross-hatch before Apply second shock.';renderFactory?.();});\n$('shock').addEventListener('click',()=>busy($('shock'),async()=>{await api('shock',{cellId:$('shock-cell').value});await refresh();recap('The second shock changed the plan.','The prior acceptance is invalid. Investigate the recalculated capacity before a fresh decision.','capacity');notice('Machine outage applied. Prior acceptance is invalid; investigate the changed snapshot.');}));"
    );
  }
  // Replace renderFactory body with cinematic binding while preserving real state.
  const start = next.indexOf('function renderFactory(){');
  const end = next.indexOf('async function draftBritt(){');
  if (start < 0 || end < 0) throw new Error('renderFactory bounds missing');
  const cinematic = `function renderFactory(){
 const svg=$('factory-svg'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();svg.classList.add('factory-svg-cinematic');
 const add=(tag,attrs,value,parent=svg)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(value!=null)e.textContent=value;parent.append(e);return e;};
 const accepted=state.decision.status==='accepted',cells=state.snapshot.cells,jobs=state.snapshot.jobs;
 const selected=state.analysis.recovery.options.find(o=>o.optionId===(envelope?.optionId??state.decision.optionId));const allocations=selected?.detail?.allocations??selected?.detail?.draws?.flatMap(d=>d.cells)??[];const activeCells=new Set(allocations.map(a=>a.cellId));
 const previewOffline=$('shock-cell')?.value;
 $('britt-activity').replaceChildren(text('strong','BRITT 4.0'),text('span',state.britt?.proposal?'Task proposal awaiting human approval':state.decision.status==='invalidated'?'Second shock · evidence and plan review required':accepted?'Human recovery accepted · '+(state.board?.tasks?.length??0)+' tracked tasks':'Evidence → calculations → human decision'));
 $('factory-status').textContent=accepted?'RECOVERY ACCEPTED · '+titles[state.decision.optionId]:'MATERIAL HOLD · '+(state.decision.status==='invalidated'?'SECOND SHOCK':'CERTIFICATE DISCREPANCY');
 const defs=add('defs',{});const hatch=add('pattern',{id:'hold-hatch',width:8,height:8,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},null,defs);add('rect',{width:8,height:8,fill:'#16251b'},null,hatch);add('path',{d:'M 0 0 V 8',stroke:'#839d8b','stroke-width':2},null,hatch);const offlineHatch=add('pattern',{id:'offline-hatch',width:10,height:10,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},null,defs);add('rect',{width:10,height:10,fill:'#2a1212'},null,offlineHatch);add('path',{d:'M 0 0 V 10',stroke:'#E5484D','stroke-width':2},null,offlineHatch);const gradient=add('linearGradient',{id:'machine-metal',x2:'0',y2:'1'},null,defs);add('stop',{offset:'0%','stop-color':'#38433e'},null,gradient);add('stop',{offset:'100%','stop-color':'#101713'},null,gradient);
 add('rect',{x:18,y:92,width:120,height:78,rx:6,class:'dock-bay'});add('text',{x:28,y:118,class:'node-caption'},'DOCK');add('text',{x:28,y:138,class:'node-caption'},state.snapshot.incident.heldMaterialId??'HELD LOT');
 add('rect',{x:150,y:108,width:54,height:46,rx:4,class:'qa-gate'});add('text',{x:158,y:136,class:'node-caption'},'QA');
 add('rect',{x:70,y:168,width:730,height:18,rx:3,class:'conveyor-belt'});add('path',{d:'M 70 177 H 800',class:'factory-track'});
 for(let i=0;i<8;i++)add('rect',{x:90+i*88,y:172,width:28,height:10,rx:2,fill:accepted?'#c6ed8d55':'#6d857455'});
 add('text',{x:585,y:43,class:'mismatch-label'},'DOES NOT MATCH');
 state.evidence.filter(e=>e.quantity&&e.source.field==='quantity').slice(0,2).forEach((e,i)=>{add('text',{x:24,y:28+i*26,class:'node-caption'},e.source.documentId+' · '+e.quantity.value+' '+e.quantity.unit);add('rect',{x:295,y:14+i*26,width:e.quantity.value*2,height:12,rx:2,fill:i?'#c6ed8d':'#e49180'});});
 const node=(x,y,title,sub,kind)=>{const preview=title===previewOffline&&!$('shock')?.disabled&&state.decision.status==='accepted'&&state.snapshot.cells.find(c=>c.cellId===title)?.online;const g=add('g',{class:'factory-node '+kind+(title.startsWith('JOB')?' order-bay':'')+(preview?' preview-offline':''),tabindex:'0',role:'button','aria-label':title+' '+(preview?'PREVIEW OFFLINE':sub)});add('polygon',{points:\`\${x},\${y} \${x+18},\${y-16} \${x+172},\${y-16} \${x+154},\${y}\`,fill:'#52635a',stroke:'#9caf9f'},null,g);add('polygon',{points:\`\${x+154},\${y} \${x+172},\${y-16} \${x+172},\${y+72} \${x+154},\${y+88}\`,fill:'#1b2820',stroke:'#617b6a'},null,g);add('rect',{x,y,width:154,height:88,rx:5,fill:preview||sub==='OFFLINE'?'url(#offline-hatch)':'url(#machine-metal)',stroke:preview||sub==='OFFLINE'?'#E5484D':'#9caf9f'},null,g);add('path',{d:\`M \${x+12} \${y+12} h 60 v 30 h -60 z M \${x+86} \${y+12} h 52 v 50 h -52 z\`,class:'machine-detail'},null,g);if(title.startsWith('CELL')){add('path',{d:\`M \${x+42} \${y+16} v 22 m -12 0 h 24 m -12 0 v 13 m -24 7 h 48\`,stroke:'#c5ccd4','stroke-width':4,fill:'none'},null,g);for(let n=0;n<3;n++)add('circle',{cx:x+130,cy:y+20+n*11,r:3,fill:n?'#71877a':'#c6ed8d'},null,g);}if(sub==='OFFLINE'||preview){add('path',{d:\`M \${x+10} \${y+8} l 130 54 m 0 -54 l -130 54\`,stroke:'#E5484D','stroke-width':2,'stroke-dasharray':'5 4'},null,g);add('text',{x:x+42,y:y+52,fill:'#E5484D','font-size':12,'font-weight':700},preview?'PREVIEW':'STOPPED');}add('text',{x:x+12,y:y+78},title,g);add('text',{x:x+4,y:y+112,class:'node-caption'},preview?'OFFLINE PREVIEW':sub,g);g.addEventListener('click',()=>{if(reviewIndex!==null)return;for(const node of svg.querySelectorAll('.selected-node'))node.classList.remove('selected-node');g.classList.add('selected-node');$('factory-selection').hidden=false;$('factory-selection').textContent=title+' · '+(preview?'OFFLINE PREVIEW':sub)+(title==='RECEIVING'?' · '+state.snapshot.incident.discrepancy:'');});g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();g.dispatchEvent(new Event('click'));}});return g;};
 node(24,110,'RECEIVING',state.snapshot.incident.heldMaterialId??'Source evidence','held');
 cells.forEach((c,i)=>{const x=230+i*195;node(x,110,c.cellId,c.online?(accepted?(activeCells.has(c.cellId)?'RECOVERY FLOW':'AVAILABLE'):'AWAITING DECISION'):'OFFLINE',!c.online?'held':accepted&&activeCells.has(c.cellId)?'running':'idle');});
 if(accepted&&allocations.length){const material=selected.detail?.materialId??selected.detail?.draws?.[0]?.materialId;add('rect',{x:24,y:232,width:240,height:36,rx:4,fill:'#143322',stroke:'#c6ed8d'});add('text',{x:34,y:254,class:'node-caption'},material+' · '+state.analysis.impacted.impactedUnits+' parts');add('path',{d:\`M 264 250 H \${230+Math.max(0,cells.findIndex(c=>c.cellId===allocations[0].cellId))*195+77} V 205\`,class:'route-running'});for(let n=0;n<3;n++)add('circle',{cx:266+n*9,cy:250,r:3,class:'material-flow'});}
 const jobWidth=760/Math.max(jobs.length,1);jobs.forEach((j,i)=>{const x=30+i*jobWidth;const routeCell=allocations[0]?.cellId??(cells.find(c=>c.cellId===j.preferredCellId&&c.online)?.cellId??cells.find(c=>c.online)?.cellId);if(routeCell&&cells.find(c=>c.cellId===routeCell)?.online!==false)add('path',{d:\`M \${230+Math.max(0,cells.findIndex(c=>c.cellId===routeCell))*195+77} 205 V \${255+i*22} H \${x+60} V 308\`,class:accepted?'route-running':'route-held'});node(x,310,j.jobId,j.unitsRequired+' parts · due +'+j.dueHours+'h',accepted?'running':'held');});
 state.analysis.recovery.options.forEach((o,i)=>{const g=add('g',{tabindex:0,role:'img','aria-label':titles[o.optionId]+(o.feasible?' '+o.finishHours+' hours':' constrained')});add('rect',{x:24+i*270,y:440,width:252,height:40,rx:5,fill:'#101d15',stroke:o.optionId===(envelope?.optionId??state.decision.optionId)?'#c6ed8d':'#496353'},null,g);add('text',{x:34+i*270,y:457,class:'node-caption'},titles[o.optionId],g);add('text',{x:34+i*270,y:473,class:'node-caption'},o.feasible?o.finishHours+'h · $'+o.incrementalCostUsd.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'CONSTRAINED · capacity changed',g);});
 state.evidence.slice(0,6).forEach((e,i)=>{const sourceNode=add('g',{tabindex:0,role:'button','aria-label':'Inspect '+e.evidenceId});sourceNode.addEventListener('click',()=>{if(reviewIndex!==null)return;$('evidence').parentElement.open=true;focusPanel('evidence');$(e.evidenceId)?.focus();});sourceNode.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();sourceNode.dispatchEvent(new Event('click'));}});add('circle',{cx:52+i*125,cy:490,r:5,class:!$('investigation-pending').hidden?'evidence-check':'sealed'},null,sourceNode);add('text',{x:32+i*125,y:514,class:'node-caption'},e.evidenceId,sourceNode);if(!$('investigation-pending').hidden)add('path',{d:\`M \${52+i*125} 495 V 520\`,class:'route-running'},null,sourceNode);});
 const count=Math.min(state.ledger.count,12);for(let i=0;i<count;i++){add('rect',{x:38+i*58,y:548,width:42,height:22,rx:3,class:'ledger-block'});if(i)add('path',{d:\`M \${22+i*58} 559 h 16\`,class:'factory-track'});}add('text',{x:38,y:595,class:'node-caption'},state.ledger.count+' EVENTS · '+(guide?.exported===state.ledger.head?'PACKET SEALED':'HASH-CHAINED, TAMPER-EVIDENT'));
}
`;
  next = next.slice(0, start) + cinematic + next.slice(end);
  return next;
});

function patchSmoke(rel) {
  patch(rel, (src) => src
    .replaceAll(
      "if(!await evaluate(`document.querySelector('#workspace-switcher').open`)){if(keyboardOnly){await tabTo('#workspace-switcher summary');await press('Enter','Enter',13,{text:'\\r'});}else await evaluate(`document.querySelector('#workspace-switcher').open=true`);}",
      ''
    )
    .replace(
      "assert.ok(await evaluate(`document.activeElement.hasAttribute('data-view')||document.activeElement.id==='guide-start'||document.activeElement.matches('#workspace-switcher summary')`));",
      "assert.ok(await evaluate(`document.activeElement.hasAttribute('data-view')||document.activeElement.id==='guide-start'||document.activeElement.closest('#workspace-switcher')`));"
    )
  );
}
patchSmoke('scripts/primary-guide-smoke.mjs');
patchSmoke('scripts/browser-smoke.mjs');
console.log('audit11 patch complete');
