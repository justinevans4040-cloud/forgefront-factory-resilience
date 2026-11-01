const fail=message=>{throw Object.assign(Error(message),{status:409});};
export const COLUMNS=Object.freeze(['To do','In progress','Blocked','Done']);
export function sampleDraft(c){return {summary:'Verify material, coordinate capacity and confirm the accepted recovery.',tasks:[{id:'t1',title:'Verify accepted source records',owner:c.owner,dueHours:c.shockHours+c.option.finishHours/4,dependsOn:[],evidenceIds:c.option.evidenceIds},{id:'t2',title:'Coordinate the accepted capacity plan',owner:c.owner,dueHours:c.shockHours+c.option.finishHours/2,dependsOn:['t1'],evidenceIds:c.option.evidenceIds},{id:'t3',title:'Confirm recovery completion with the operator',owner:c.owner,dueHours:c.shockHours+c.option.finishHours,dependsOn:['t2'],evidenceIds:c.option.evidenceIds}]};}
export function validateDraft(d,c){
 if(!d||Object.keys(d).sort().join(',')!=='summary,tasks'||typeof d.summary!=='string'||!d.summary.trim()||d.summary.length>800||!Array.isArray(d.tasks)||d.tasks.length<1||d.tasks.length>12)fail('INVALID_TASK_DRAFT');
 const ids=new Set();
 for(const t of d.tasks){
  if(!t||Object.keys(t).sort().join(',')!=='dependsOn,dueHours,evidenceIds,id,owner,title'||typeof t.id!=='string'||!/^t[1-9][0-9]?$/.test(t.id)||ids.has(t.id)||typeof t.title!=='string'||!t.title.trim()||t.title.length>160||t.owner!==c.owner||!Number.isFinite(t.dueHours)||t.dueHours<c.shockHours||t.dueHours>c.shockHours+c.option.finishHours||!Array.isArray(t.dependsOn)||new Set(t.dependsOn).size!==t.dependsOn.length||!Array.isArray(t.evidenceIds)||!t.evidenceIds.length||t.evidenceIds.some(id=>!c.option.evidenceIds.includes(id)))fail('INVALID_TASK_FIELDS');ids.add(t.id);
 }
 const visit=(id,path=[])=>{if(path.includes(id))fail('DEPENDENCY_CYCLE');const t=d.tasks.find(t=>t.id===id);if(!t)fail('UNKNOWN_DEPENDENCY');for(const dep of t.dependsOn){visit(dep,[...path,id]);if(d.tasks.find(t=>t.id===dep).dueHours>t.dueHours)fail('DEPENDENCY_DEADLINE');}};
 d.tasks.forEach(t=>visit(t.id));return {snapshotDigest:c.snapshotDigest,optionId:c.option.optionId,summary:d.summary,tasks:d.tasks.map(t=>({...structuredClone(t),status:'To do'}))};
}
export function moveTask(board,id,status){
 if(!COLUMNS.includes(status))fail('INVALID_TASK_STATUS');const b=structuredClone(board),t=b.tasks.find(t=>t.id===id);if(!t)fail('UNKNOWN_TASK');
 if(['In progress','Done'].includes(status)&&t.dependsOn.some(dep=>b.tasks.find(t=>t.id===dep)?.status!=='Done'))fail('DEPENDENCY_NOT_DONE');
 if(t.change?.requiresReview&&status!=='Blocked')fail('REPLAN_APPROVAL_REQUIRED');
 if(t.status==='Done'&&status!=='Done'&&b.tasks.some(other=>other.dependsOn.includes(id)&&['Done','In progress'].includes(other.status)))fail('DEPENDENT_WORK_ACTIVE');t.status=status;return b;
}
export function replanBoard(board,snapshotDigest,cellId){return {...structuredClone(board),snapshotDigest,tasks:board.tasks.map(t=>t.status==='Done'?structuredClone(t):({...structuredClone(t),status:'Blocked',change:{previousStatus:t.status,previousDueHours:t.dueHours,reason:cellId+' unavailable; fresh recovery acceptance and task review required',requiresReview:true}}))};}
export function approveProposal(p,action,scope,snapshotDigest){if(p?.status!=='pending'||action!=='approve')fail('APPROVAL_REQUIRED');if(p.scope!==scope)fail('PROPOSAL_SCOPE_MISMATCH');if(p.snapshotDigest!==snapshotDigest)fail('STALE_PROPOSAL');return structuredClone(p.board);}
export async function draftBoard(client,context,timeoutMs=45000){
 if(!client.sample&&!['meta-model-api','baseten'].includes(client.route?.provider))fail('PRIMARY_META_ROUTE_REQUIRED');
 if(client.sample)return {board:validateDraft(sampleDraft(context),context),sample:true,model:'Sample',provider:'sample'};
 const result=await client.complete({prompt:'You are Britt 4.0, Forgefront Systems sovereign agent. Draft recovery tasks for human approval. Return ONLY strict JSON with summary and tasks. Each task has ONLY id (t1 etc), title, owner (exactly context.owner), dueHours (hours relative to shock, between context.shockHours and context.shockHours + context.option.finishHours), dependsOn (task IDs, acyclic), evidenceIds (nonempty subset of context.option.evidenceIds). Use 3 to 6 tasks. Explain blockers and evidence in summary. Context: '+JSON.stringify(context),maxTokens:8192,timeoutMs});
 if(result.sample||result.modelId!==client.route.model)fail('MODEL_IDENTITY_MISMATCH');let draft;try{draft=JSON.parse(result.text);}catch{fail('INVALID_TASK_JSON');}return {board:validateDraft(draft,context),sample:false,model:result.modelId,provider:client.route.provider};
}

export async function draftBoardWithFallback(primary,makeFallback,context){
 const started=Date.now();
 try{return {...await draftBoard(primary,context,makeFallback?25000:45000),fallbackUsed:false};}
 catch(error){if(!makeFallback||primary.sample||primary.route?.provider!=='meta-model-api')throw error;
  const remaining=45000-(Date.now()-started);if(remaining<=0)throw error;
  const fallback=makeFallback();if(fallback?.route?.provider!=='baseten')fail('PRIMARY_META_ROUTE_REQUIRED');
  return {...await draftBoard(fallback,context,remaining),fallbackUsed:true,primaryFailure:'PRIMARY_DRAFT_FAILED_VALIDATION_OR_PROVIDER'};
 }
}
