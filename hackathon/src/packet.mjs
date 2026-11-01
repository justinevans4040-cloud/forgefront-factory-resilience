import { createHash } from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Trust starts with a checkpoint retained separately BEFORE a suspected rollback.
// No secret is needed to prove that a later chain includes that pinned head.
export function verifyCheckpoint(packet,checkpoint){
 try{
  if(checkpoint.format!=='FORGEFRONT_CHECKPOINT_V1'||!Number.isSafeInteger(checkpoint.count)||checkpoint.count<0)throw Error();
  if(!Array.isArray(packet.events)||packet.events.length<checkpoint.count)throw Error();
  let head='GENESIS',pinned=checkpoint.count===0?'GENESIS':null;
  for(const [i,event]of packet.events.entries()){
   const {eventHash,...body}=event;
   if(body.sequence!==i+1||body.previousHash!==head||hash(body)!==eventHash)throw Error();
   head=eventHash;if(i+1===checkpoint.count)pinned=head;
  }
  // Secret-free verifier proves only that the retained head appears as a valid prefix.
  // Checkpoint.signature is an optional HMAC for keyed verification elsewhere; it is not checked here.
  if(pinned!==checkpoint.head||packet.ledger.head!==head||packet.ledger.count!==packet.events.length)throw Error();
  return {ok:true,count:packet.events.length,head,trust:'PREFIX_INCLUDES_RETAINED_CHECKPOINT_HEAD'};
 }catch{return {ok:false,reason:'CHECKPOINT_OR_CHAIN_MISMATCH'};}
}
export function readablePacket(packet){
 const lines=['# Forgefront recovery evidence','PLAINTEXT EXPORT; Demo scenario data','Decision authority: human review and typed acceptance',
  'Snapshot: '+packet.snapshot.snapshotDigest,'Decision: '+packet.decision.status,'Named operator: '+(packet.decision.operatorId??'not recorded'),'Review actor digest: '+(packet.decision.actor??'none'),'Confirmation actor digest: '+(packet.decision.confirmationActor??'not recorded in this history'),'Resumed after restart: '+(packet.decision.resumedAfterRestart??'not recorded in this history'),'Plan digest: '+(packet.decision.planDigest??'none'),'Accepted run: '+(packet.decision.runId??'none'),'Ledger: hash-chained, tamper-evident',
  'Verified head: '+packet.ledger.head,'Events: '+packet.ledger.count,'','## Deterministic options'];
 for(const o of packet.analysis.recovery.options)lines.push(`${o.optionId}: ${o.feasible?'feasible':'infeasible'}; finish ${o.finishHours??'unavailable'} hours; incremental USD ${o.incrementalCostUsd??'unavailable'}`,`Assumptions: ${(o.assumptions??[]).join('; ')}`,`Constraints: ${o.constraints.join('; ')}`,`Sources: ${o.evidenceIds.join(', ')}`);
 lines.push('','## Investigations');
 for(const r of packet.runs){lines.push(`Run ${r.runId}; snapshot ${r.run.snapshotDigest}; ${r.run.sample?'SAMPLE - OFFLINE; NO LIVE AI':'LIVE META'}; ${r.run.stopReason}`,`Models: ${r.calls.map(c=>c.returnedModel??'unavailable').join(', ')}`,`Validated source claims: ${r.claims.accepted.length}; rejected: ${r.claims.rejected.length}`,`Model analysis (human review; source validation listed separately): ${String(r.narrative).replaceAll('<','&lt;').replaceAll('>','&gt;')}`);for(const c of r.claims.accepted)lines.push(`Validated: ${c.evidenceId}; ${c.documentId}/${c.recordId}/${c.field}; ${c.value} ${c.unit}`);for(const c of r.claims.rejected)lines.push(`Rejected: ${c.evidenceId}; ${c.reason}`);}
 lines.push('','## Snapshot transitions');for(const e of packet.events.filter(e=>e.type==='snapshot_changed'))lines.push(`${e.data.priorDigest} -> ${e.data.snapshot.snapshotDigest}`);
 lines.push('','## Exact source registry');for(const e of packet.evidence)lines.push(`${e.evidenceId}: ${e.source.documentId}/${e.source.recordId}/${e.source.field}: ${e.excerpt}`);
 lines.push('','Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.');return lines.join('\n');
}
