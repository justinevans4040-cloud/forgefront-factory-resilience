const targets={'britt-draft':'board','britt-approve':'board','recovery-board':'board',evidence:'incident',incident:'incident',capacity:'shock',shock:'shock','shock-cell':'shock',reset:'shock',investigate:'investigation',provider:'investigation','provider-check':'investigation','provider-status':'investigation','model-output':'investigation','investigation-status':'investigation',options:'decision',typed:'decision',consent:'decision','decision-state':'decision',revoke:'decision','encrypted-export':'proof','export-passphrase':'proof',ledger:'proof',verify:'proof',checkpoint:'proof',export:'proof',report:'proof','story-results':'proof'};
export const stageFor=id=>targets[id]??null;
export function focusResult(id,{document=globalThis.document,reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,showStage=()=>{}}={}){
 const stage=stageFor(id);if(stage)showStage(stage);
 const element=document.getElementById(id);if(!element)return false;
 for(const old of document.querySelectorAll('.result-highlight'))old.classList.remove('result-highlight');
 element.classList.add('result-highlight');
 if(!element.matches('button,input,select,a,summary'))element.tabIndex=-1;
 element.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'nearest',inline:'nearest'});
 element.focus({preventScroll:true});return true;
}
export function storyView(state,guide){
 const impact=state.analysis.impacted,options=state.analysis.recovery.options;
 const chosen=state.decision.status==='accepted'?options.find(o=>o.optionId===state.decision.optionId&&o.feasible):null;
 const wait=options.find(o=>o.optionId==='wait_replenishment'&&o.feasible);
 const due=state.snapshot.jobs.filter(j=>j.dueHours!=null&&(!state.snapshot.incident?.heldMaterialId||j.materialId===state.snapshot.incident.heldMaterialId)).map(j=>j.dueHours);
 return {opening:`A disputed material certificate has stopped the affected work. ${impact.impactedUnits} parts across ${impact.impactedJobCount} production orders need a recovery path.`,schedule:due.length?`Order due windows begin in ${Math.min(...due)} hours. Compare calculated completion times before deciding.`:'Compare calculated completion times before deciding.',accepted:state.decision.status==='accepted',finishHours:chosen?.finishHours??null,savedHours:chosen&&wait?Math.round((wait.finishHours-chosen.finishHours)*100)/100:null,secondShock:Boolean(guide?.acceptedInitial&&state.snapshot.snapshotDigest!==guide.initialDigest),proofComplete:Boolean(state.ledger.ok&&guide?.verified===state.ledger.head&&guide?.exported===state.ledger.head&&guide?.checkpoint===state.ledger.head)};
}

export function shockPreview(state,stage,selected){return stage==='shock'&&state.decision.status==='accepted'&&state.snapshot.cells.some(c=>c.cellId===selected&&c.online)?selected:'';}

export function proofChecklist(state,guide={}){return [['verify','1 · Verify ledger','verified'],['encrypted-export','2 · Seal encrypted packet','exported'],['checkpoint','3 · Retain independent checkpoint','checkpoint']].map(([id,label,key])=>({id,label,done:guide[key]===state.ledger.head}));}

export function consentProgress(phrase,value){
 const target=String(phrase??''),typed=String(value??'');
 if(typed===target&&target)return {match:true,label:'Exact phrase matched. Acceptance enabled.',enabled:true};
 if(target.startsWith(typed))return {match:false,label:`${typed.length}/${target.length} typed`,enabled:false};
 return {match:false,label:'Match the displayed phrase exactly.',enabled:false};
}

export function proposalBanner(board={tasks:[]},proposal=null){
 if(!proposal)return '';
 const blocked=board.tasks.filter(t=>t.status==='Blocked').length;
 if(board.tasks.length)return `Prior tracked work · ${blocked} BLOCKED remains visible · revised proposal stays PROPOSED · UNTRACKED UNTIL APPROVAL.`;
 return '0 tracked · PROPOSED tasks stay untracked until you approve Britt’s proposal.';
}

export function proofActionGate(state,guide={}){
 const head=state.ledger.head;
 return {
  verify:true,
  'encrypted-export':guide.verified===head,
  checkpoint:guide.verified===head&&guide.exported===head,
 };
}

export function capacityStatus(cell,preview){return !cell.online?'OFFLINE':cell.cellId===preview?'PREVIEW: WILL GO OFFLINE':'ONLINE';}
