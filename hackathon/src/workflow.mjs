import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync, openSync, fsyncSync, closeSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createSnapshot, buildDemoScenarioInput } from './domain/scenario.mjs';
import { analyzeSnapshot } from './domain/engine.mjs';
import { buildEvidenceRegistry } from './domain/evidence.mjs';
import { investigate } from './agent/investigation.mjs';
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
    verify();if(type!=='login_failed'&&type!=='snapshot_initialized'&&!events.some(e=>e.type==='snapshot_initialized'))append('snapshot_initialized',{snapshot});const body={sequence:events.length+1,type,epochMs:now(),previousHash:events.at(-1)?.eventHash??'GENESIS',data};
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
    pendingFor(session,operator){verify();return [...pending.values()].filter(e=>e.expires>now()&&e.operatorId===operator.id&&e.operatorRole===operator.role&&(e.actor===hash(session)||recoveredNonces.has(e.nonce)));},
    recordLoginFailure(client){
      // Global rolling budget, recovered from verified events: address rotation/restart cannot reset it.
      verify();const recent=events.filter(e=>e.type==='login_failed'&&e.epochMs>now()-60000);
      if(recent.length>=12)return {recorded:false,reason:'GLOBAL_AUDIT_CAP_REACHED'};
      return append('login_failed',{clientDigest:hash(client),reason:recent.length===11?'GLOBAL_AUDIT_CAP_REACHED':'INVALID_CREDENTIAL',furtherAttemptsOmitted:recent.length===11,operationalRelease:false});
    },
    recordModelCall(entry){return append('model_call',redact(entry));},
    status(){verify();return {snapshot,pendingConsents:[...pending.values()].filter(e=>e.expires>now()),analysis:analyzeSnapshot(snapshot),evidence:buildEvidenceRegistry(snapshot).list(),runs,decision,busy:active,ledger:verify(),storageProtection:{...storageProtection,encryption:'AES-256-GCM; HKDF-SHA256 domain-separated key'},synthetic:true,operationalRelease:false};},
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
      try{const result=await investigate({snapshot:bound,client,secrets,progress,record:async entry=>append('model_call',{...entry,operatorId:operator.id,operatorRole:operator.role})});const r={...result,operatorId:operator.id,operatorRole:operator.role};
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
      const next=createSnapshot(input);append('snapshot_changed',{priorDigest:snapshot.snapshotDigest,snapshot:next,operatorId:operator.id});snapshot=next;pending.clear();decision={status:'invalidated',operationalRelease:false};return this.status();
    },
    reset(operator={id:'local-operator'}){verify();const next=createSnapshot({...buildDemoScenarioInput(),scenarioId:'scenario-cert-hold-'+randomUUID()});append('snapshot_changed',{priorDigest:snapshot.snapshotDigest,snapshot:next,reset:true,operatorId:operator.id});snapshot=next;pending.clear();decision={status:'none',operationalRelease:false};return this.status();},
    exportCheckpoint(){const v=verify();return {format:'FORGEFRONT_CHECKPOINT_V1',count:v.count,head:v.head,signature:v.signature??hmac(v.head),synthetic:true,operationalRelease:false};},
    exportReport(){return {text:readablePacket(this.exportPacket()),format:'MARKDOWN',synthetic:true,operationalRelease:false};},
    exportPacket(){const state=this.status();return {...state,snapshots:[...new Map([...events.filter(e=>['snapshot_initialized','snapshot_changed'].includes(e.type)).map(e=>e.data.snapshot),snapshot].map(s=>[s.snapshotDigest,s])).values()],format:'FORGEFRONT_ADVISORY_PACKET',label:'PLAINTEXT EXPORT; SYNTHETIC; ILLUSTRATIVE COSTS; ADVISORY ONLY',ledgerDescription:'hash-chained, tamper-evident',events,operationalRelease:false};}
  };
}
