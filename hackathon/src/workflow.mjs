import {draftBoardWithFallback,moveTask as transitionTask,replanBoard,approveProposal} from './recovery-board.mjs';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync, openSync, fsyncSync, closeSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createSnapshot, buildDemoScenarioInput } from './domain/scenario.mjs';
import { analyzeSnapshot } from './domain/engine.mjs';
import { buildEvidenceRegistry } from './domain/evidence.mjs';
import { investigate, investigationHandoff } from './agent/investigation.mjs';
import { createStateCodec } from './security/state-codec.mjs';
import { redactSecrets } from './security/redact.mjs';
import { readablePacket } from './packet.mjs';
import { protectDirectory } from './security/private-directory.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=message=>{throw Object.assign(new Error(message),{status:409});};
const safeEqual=(a,b)=>{const left=Buffer.from(String(a||''));const right=Buffer.from(String(b||''));return left.length===right.length&&timingSafeEqual(left,right);};
export function createWorkflow({directory,key,now=Date.now,secrets=[]}) {
  if(!directory || typeof key!=='string' || key.length<12 || key.length>4096)throw new Error('Workflow requires private state directory and HMAC key');
  const storageProtection=protectDirectory(directory);
  const codec=createStateCodec(key);
  const readEvents=()=>readFileSync(log,'utf8').trim().split('\n').filter(Boolean).map(line=>codec.decode(line,'event'));
  const log=join(directory,'events.jsonl'),anchor=join(directory,'anchor.json'),intent=join(directory,'intent.json');
  const hmac=head=>createHmac('sha256',key).update(head).digest('hex');
  const redact=value=>redactSecrets(value,secrets);
  let events=[];let snapshot=createSnapshot(buildDemoScenarioInput());let runs=[];let decision={status:'none',operationalRelease:false};
  let board={tasks:[]},proposals=[],memory=[];
  const scopeFor=(session,operator)=>hash({session,operatorId:operator.id,scenarioId:snapshot.scenarioId});
  const pending=new Map();const jobs=new Map();let active=false;
  function durableWrite(path,value,purpose){
    const temporary=path+'.next';const fd=openSync(temporary,'w',0o600);
    try{writeFileSync(fd,codec.encode(value,purpose));fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(temporary,path);
  }
  function durableAppend(line){appendFileSync(log,line,{mode:0o600});const fd=openSync(log,'r+');try{fsyncSync(fd);}finally{closeSync(fd);}}
  function recover(){
    if(!existsSync(intent))return;
    try{
      const transaction=codec.decode(readFileSync(intent,'utf8'),'intent');
      const a=existsSync(anchor)?codec.decode(readFileSync(anchor,'utf8'),'anchor'):{count:0,head:'GENESIS',signature:hmac('GENESIS')};
      if(transaction.status==='committed'){
        if(a.head!==transaction.head||a.count!==transaction.count)fail('LEDGER_TAMPERED');return;
      }
      const {prior,next,line,priorBytes,priorDigest}=transaction;
      if(transaction.status!=='pending'||!safeEqual(a.signature,hmac(a.head)))fail('LEDGER_TAMPERED');
      const raw=existsSync(log)?readFileSync(log,'utf8'):'';
      const prefix=raw.slice(0,priorBytes),suffix=raw.slice(priorBytes);
      if(prefix.length!==priorBytes||hash(prefix)!==priorDigest||!line.startsWith(suffix))fail('LEDGER_TAMPERED');
      let head='GENESIS',count=0;
      for(const record of prefix.trim().split('\n').filter(Boolean)){
        const {eventHash,...body}=codec.decode(record,'event');
        if(body.sequence!==++count||body.previousHash!==head||hash(body)!==eventHash)fail('LEDGER_TAMPERED');head=eventHash;
      }
      const {eventHash,...body}=codec.decode(line.trim(),'event');
      if(prior.count!==count||prior.head!==head||body.sequence!==count+1||body.previousHash!==head||hash(body)!==eventHash||next.head!==eventHash||next.count!==count+1||!safeEqual(next.signature,hmac(eventHash)))fail('LEDGER_TAMPERED');
      if(a.head===next.head&&a.count===next.count){if(suffix!==line)fail('LEDGER_TAMPERED');}
      else if(a.head===prior.head&&a.count===prior.count){if(suffix!==line)durableAppend(line.slice(suffix.length));durableWrite(anchor,next,'anchor');}
      else fail('LEDGER_TAMPERED');
      durableWrite(intent,{status:'committed',head:next.head,count:next.count},'intent');
    }catch{fail('LEDGER_TAMPERED');}
  }
  recover();
  function verify(){
    if(!existsSync(log) && !existsSync(anchor)){if(events.length)fail('LEDGER_TAMPERED');return {ok:true,count:0,head:'GENESIS'};}
    if(!existsSync(log)||!existsSync(anchor))fail('LEDGER_TAMPERED');
    try{
      const disk=readEvents();let head='GENESIS';
      for(const [index,event] of disk.entries()){const {eventHash,...body}=event;if(body.sequence!==index+1||body.previousHash!==head||hash(body)!==eventHash)fail('LEDGER_TAMPERED');head=eventHash;}
      const a=codec.decode(readFileSync(anchor,'utf8'),'anchor');if(a.head!==head||!safeEqual(a.signature,hmac(head))||a.count!==disk.length)fail('LEDGER_TAMPERED');
      if(events.length && (disk.length!==events.length||disk.at(-1)?.eventHash!==events.at(-1)?.eventHash))fail('LEDGER_TAMPERED');
      return {ok:true,count:disk.length,head,signature:a.signature};
    }catch{fail('LEDGER_TAMPERED');}
  }
  verify();
  if(existsSync(log)){
    events=readEvents();
    for(const e of events){
      if(e.type==='britt_proposed'){proposals.push(structuredClone(e.data));memory.push({scope:e.data.scope,summary:e.data.board.summary,snapshotDigest:e.data.snapshotDigest});}
      if(['task_created','task_moved','tasks_replanned'].includes(e.type))board=e.data.board;
      if(e.type==='britt_decided'){const p=proposals.find(p=>p.id===e.data.id);if(p)p.status=e.data.action==='approve'?'approved':'declined';}
      if(e.type==='snapshot_changed'&&e.data.reset){board={tasks:[]};proposals=[];memory=[];}
      if(e.type==='snapshot_initialized')snapshot=createSnapshot(e.data.snapshot);
      if(e.type==='snapshot_changed'){snapshot=createSnapshot(e.data.snapshot);decision={status:e.data.reset===true?'none':'invalidated',operationalRelease:false};pending.clear();}
      if(e.type==='investigation_completed')runs.push(e.data);
      if(e.type==='consent_reviewed'&&e.data.expires>now())pending.set(e.data.nonce,e.data);
      if(e.type==='decision_accepted'){decision=e.data;pending.delete(e.data.nonce);}
      if(e.type==='decision_revoked'){decision=e.data;pending.clear();}
    }
  }
  const recoveredNonces=new Set(pending.keys());
  function append(type,data){
    // login_failed must not bootstrap scenario state: unauthenticated callers can append it.
    verify();if(type!=='login_failed'&&type!=='snapshot_initialized'&&!events.some(e=>e.type==='snapshot_initialized'))append('snapshot_initialized',{snapshot});const body={sequence:events.length+1,type,epochMs:now(),previousHash:events.at(-1)?.eventHash??'GENESIS',data:structuredClone(data)};
    const event={...body,eventHash:hash(body)};
    const next={count:events.length+1,head:event.eventHash,signature:hmac(event.eventHash)};
    const prior={count:events.length,head:body.previousHash};
    const raw=existsSync(log)?readFileSync(log,'utf8'):'';
    const line=codec.encode(event,'event')+'\n';
    durableWrite(intent,{status:'pending',prior,next,line,priorBytes:raw.length,priorDigest:hash(raw)},'intent');
    durableAppend(line);
    durableWrite(anchor,next,'anchor');
    durableWrite(intent,{status:'committed',head:next.head,count:next.count},'intent');
    events.push(event);return event;
  }
  function currentRun(id){verify();const r=runs.find(r=>r.runId===id);if(!r||r.run.snapshotDigest!==snapshot.snapshotDigest||!r.proposalValid)fail('STALE_OR_FAILED_INVESTIGATION');return r;}
  return {
    verify,
    brittFor(session,operator){verify();const scope=scopeFor(session,operator);return {name:'Britt 4.0',proposal:structuredClone([...proposals].reverse().find(p=>p.scope===scope&&p.status==='pending')??null),memory:structuredClone(memory.filter(m=>m.scope===scope).slice(-12))};},
    async draftTasks(client,session,operator,makeFallback=null){
      verify();if(active)fail('INVESTIGATION_IN_PROGRESS');if(decision.status!=='accepted')fail('ACCEPT_RECOVERY_FIRST');active=true;const bound=snapshot.snapshotDigest;const decisionNonce=decision.nonce;
      const scope=scopeFor(session,operator);const option=analyzeSnapshot(snapshot).recovery.options.find(o=>o.optionId===decision.optionId&&o.feasible);
      const context={snapshotDigest:bound,option,owner:operator.id,shockHours:0,evidence:buildEvidenceRegistry(snapshot).list().filter(e=>option.evidenceIds.includes(e.evidenceId)),memory:memory.filter(m=>m.scope===scope).slice(-6),priorBoard:board,humanDecision:{optionId:decision.optionId,runId:decision.runId,operatorId:decision.operatorId},acceptedInvestigation:investigationHandoff(runs.find(r=>r.runId===decision.runId))};
      try{const drafted=await draftBoardWithFallback(client,makeFallback,context);const done=board.tasks.filter(t=>t.status==='Done');const doneId=id=>id.startsWith('done-')?id:'done-'+id;drafted.board.tasks.push(...done.map(t=>({...structuredClone(t),id:doneId(t.id),dependsOn:t.dependsOn.map(doneId),completedSnapshot:t.completedSnapshot??board.snapshotDigest})));verify();if(snapshot.snapshotDigest!==bound||decision.status!=='accepted'||decision.nonce!==decisionNonce)fail('STALE_PROPOSAL');
        const p=redact({id:randomUUID(),scope,snapshotDigest:bound,decisionNonce,status:'pending',...drafted,expires:now()+300000,operatorId:operator.id});append('britt_proposed',p);proposals.push(p);memory.push({scope,summary:p.board.summary,snapshotDigest:bound});return structuredClone(p);
      }catch(error){append('britt_draft_rejected',{snapshotDigest:bound,operatorId:operator.id,reason:'DRAFT_FAILED_VALIDATION_OR_PROVIDER'});throw error;}finally{active=false;}
    },
    decideTasks(id,action,session,operator){verify();if(!['approve','decline'].includes(action))fail('APPROVAL_REQUIRED');const p=proposals.find(p=>p.id===id);if(!p||p.scope!==scopeFor(session,operator))fail('PROPOSAL_SCOPE_MISMATCH');if(p.status!=='pending'||p.expires<=now()||p.snapshotDigest!==snapshot.snapshotDigest||p.decisionNonce!==decision.nonce||decision.status!=='accepted')fail('STALE_PROPOSAL');
      if(action==='approve'){const next=approveProposal(p,action,scopeFor(session,operator),snapshot.snapshotDigest);append('task_created',{board:next,proposalId:id,operatorId:operator.id});board=next;}
      append('britt_decided',{id,action,operatorId:operator.id});p.status=action==='approve'?'approved':'declined';return this.status();
    },
    moveTask(id,status,operator,idempotencyKey){verify();if(idempotencyKey!==undefined){if(typeof idempotencyKey!=='string'||idempotencyKey.length<1||idempotencyKey.length>128)fail('INVALID_IDEMPOTENCY_KEY');const prior=events.find(e=>e.type==='task_moved'&&e.data.idempotencyKey===idempotencyKey&&e.data.operatorId===operator.id);if(prior){if(prior.data.taskId!==id||prior.data.status!==status)fail('IDEMPOTENCY_CONFLICT');return this.status();}}if(board.snapshotDigest!==snapshot.snapshotDigest)fail('STALE_BOARD');const next=transitionTask(board,id,status);append('task_moved',{board:next,taskId:id,status,operatorId:operator.id,...(idempotencyKey?{idempotencyKey}:{})});board=next;return this.status();},
    pendingFor(session,operator){verify();return [...pending.values()].filter(e=>e.expires>now()&&e.operatorId===operator.id&&e.operatorRole===operator.role&&(e.actor===hash(session)||recoveredNonces.has(e.nonce)));},
    recordLoginFailure(client){
      // Global rolling budget, recovered from verified events: address rotation/restart cannot reset it.
      verify();const recent=events.filter(e=>e.type==='login_failed'&&e.epochMs>now()-60000);
      if(recent.length>=12)return {recorded:false,reason:'GLOBAL_AUDIT_CAP_REACHED'};
      return append('login_failed',{clientDigest:hash(client),reason:recent.length===11?'GLOBAL_AUDIT_CAP_REACHED':'INVALID_CREDENTIAL',furtherAttemptsOmitted:recent.length===11,operationalRelease:false});
    },
    recordModelCall(entry){return append('model_call',redact(entry));},
    status(){verify();return {snapshot,pendingConsents:[...pending.values()].filter(e=>e.expires>now()),board:structuredClone(board),analysis:analyzeSnapshot(snapshot),evidence:buildEvidenceRegistry(snapshot).list(),runs,decision,busy:active,ledger:verify(),storageProtection:{...storageProtection,encryption:'AES-256-GCM; HKDF-SHA256 domain-separated key'},synthetic:true,operationalRelease:false};},
    startInvestigation(client,actor,operator){
      verify();if(active)fail('INVESTIGATION_IN_PROGRESS');
      if(jobs.size>=32){const done=[...jobs].find(([,j])=>j.status!=='running');if(done)jobs.delete(done[0]);else fail('JOB_CAPACITY');}
      const jobId=randomUUID();const job={jobId,actor:hash(actor),status:'running'};jobs.set(jobId,job);
      this.investigate(client,operator,call=>{job.call=call;}).then(result=>{job.status='completed';job.result=result;},error=>{job.status='failed';job.failure=typeof error?.message==='string'&&error.message?error.message:'INVESTIGATION_FAILED_OR_STALE';});
      return {jobId,status:job.status};
    },
    investigationStatus(jobId,actor){verify();const job=jobs.get(jobId);if(!job||job.actor!==hash(actor))fail('UNKNOWN_INVESTIGATION_JOB');const {actor:owner,...result}=job;return {...result,...(job.call?{call:{...job.call,remainingMs:job.call.status==='waiting'?Math.max(0,job.call.timeoutMs-(Date.now()-job.call.startedAt)):0}}:{})};},
    async investigate(client,operator={id:'local-operator',role:'operator'},progress=()=>{}){
      verify();if(active)fail('INVESTIGATION_IN_PROGRESS');active=true;const bound=snapshot;
      try{const result=await investigate({snapshot:bound,client,secrets,progress,handoff:client.route?.provider==='meta-model-api'?investigationHandoff([...runs].reverse().find(r=>r.proposalValid&&r.run.snapshotDigest===bound.snapshotDigest&&r.calls.some(c=>c.provider==='baseten'))):null,record:async entry=>append('model_call',{...entry,operatorId:operator.id,operatorRole:operator.role})});const r={...result,operatorId:operator.id,operatorRole:operator.role};
        if(snapshot.snapshotDigest!==bound.snapshotDigest)fail('STALE_INVESTIGATION');
        append('investigation_completed',r);runs.push(r);return r;
      }finally{active=false;}
    },
    review(runId,optionId,session,operator={id:'local-operator',role:'operator'}){
      const r=currentRun(runId);const option=analyzeSnapshot(snapshot).recovery.options.find(o=>o.optionId===optionId&&o.feasible);if(!option)fail('INFEASIBLE_OPTION');
      const body={nonce:randomUUID(),runId,optionId,planDigest:hash(option),snapshotDigest:snapshot.snapshotDigest,actor:hash(session),operatorId:operator.id,operatorRole:operator.role,expires:now()+300000,operationalRelease:false};
      const envelope=Object.freeze({...body,signature:hmac(hash(body))});
      append('consent_reviewed',envelope);pending.set(envelope.nonce,envelope);return envelope;
    },
    confirm(nonce,typed,session,operator){
      verify();const e=pending.get(nonce);if(!e||e.expires<=now()||(e.actor!==hash(session)&&!(operator&&e.operatorId===operator.id&&e.operatorRole===operator.role&&recoveredNonces.has(nonce)))||e.snapshotDigest!==snapshot.snapshotDigest||typed!==`APPROVE ${e.optionId}`)fail('INVALID_EXPIRED_OR_STALE_CONSENT');
      const {signature,...body}=e;if(!safeEqual(signature,hmac(hash(body))))fail('CONSENT_SIGNATURE_INVALID');
      currentRun(e.runId);const option=analyzeSnapshot(snapshot).recovery.options.find(o=>o.optionId===e.optionId&&o.feasible);if(!option||hash(option)!==e.planDigest)fail('PLAN_CHANGED');
      const next={...e,status:'accepted',confirmationActor:hash(session),resumedAfterRestart:e.actor!==hash(session)&&recoveredNonces.has(nonce),operationalRelease:false};append('decision_accepted',next);pending.delete(nonce);decision=next;return decision;
    },
    revoke(operator={id:'local-operator'}){verify();pending.clear();const next={status:'revoked',operatorId:operator.id,operationalRelease:false};append('decision_revoked',next);decision=next;return next;},
    shock(cellId,operator={id:'local-operator'}){
      verify();if(!snapshot.cells.some(c=>c.cellId===cellId&&c.online))fail('UNKNOWN_OR_OFFLINE_CELL');
      const input={...snapshot,cells:snapshot.cells.map(c=>({...c,online:c.cellId===cellId?false:c.online})),incident:{...snapshot.incident,summary:snapshot.incident.summary+` Secondary shock: ${cellId} unavailable.`}};
      const next=createSnapshot(input);append('snapshot_changed',{priorDigest:snapshot.snapshotDigest,snapshot:next,operatorId:operator.id});snapshot=next;if(board.tasks.length){const nextBoard=replanBoard(board,next.snapshotDigest,cellId);append('tasks_replanned',{board:nextBoard,operatorId:operator.id});board=nextBoard;}pending.clear();decision={status:'invalidated',operationalRelease:false};return this.status();
    },
    reset(operator={id:'local-operator'}){verify();const next=createSnapshot({...buildDemoScenarioInput(),scenarioId:'scenario-cert-hold-'+randomUUID()});append('snapshot_changed',{priorDigest:snapshot.snapshotDigest,snapshot:next,reset:true,operatorId:operator.id});snapshot=next;board={tasks:[]};proposals=[];memory=[];pending.clear();decision={status:'none',operationalRelease:false};return this.status();},
    exportCheckpoint(){const v=verify();return {format:'FORGEFRONT_CHECKPOINT_V1',count:v.count,head:v.head,signature:v.signature??hmac(v.head),synthetic:true,operationalRelease:false};},
    exportReport(){return {text:readablePacket(this.exportPacket()),format:'MARKDOWN',synthetic:true,operationalRelease:false};},
    exportPacket(){const state=this.status();return {...state,snapshots:[...new Map([...events.filter(e=>['snapshot_initialized','snapshot_changed'].includes(e.type)).map(e=>e.data.snapshot),snapshot].map(s=>[s.snapshotDigest,s])).values()],brittMemory:structuredClone(memory),brittProposals:structuredClone(proposals),format:'FORGEFRONT_ADVISORY_PACKET',label:'PLAINTEXT EXPORT; SYNTHETIC; ILLUSTRATIVE COSTS; ADVISORY ONLY',ledgerDescription:'hash-chained, tamper-evident',events,operationalRelease:false};}
  };
}
