import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStateCodec } from '../../src/security/state-codec.mjs';
import { verifyCheckpoint, readablePacket } from '../../src/packet.mjs';
import { createWorkflow } from '../../src/workflow.mjs';
import { mkdtempSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('AES GCM state uses unique nonces, authenticates purpose and fails on wrong key or modification',()=>{
 const codec=createStateCodec('synthetic-key');const value={secret:'synthetic private incident'};
 const a=codec.encode(value,'event'),b=codec.encode(value,'event');assert.notEqual(a,b);assert.ok(!a.includes(value.secret));assert.deepEqual(codec.decode(a,'event'),value);
 assert.throws(()=>codec.decode(a,'anchor'));assert.throws(()=>createStateCodec('wrong-key!!!!').decode(a,'event'));
 const changed=JSON.parse(a);changed.tag=Buffer.alloc(16).toString('base64');assert.throws(()=>codec.decode(JSON.stringify(changed),'event'));
 assert.throws(()=>codec.decode(JSON.stringify(value),'event'),/STATE_ENCRYPTION_REQUIRED/);
});
test('encrypted workflow restarts and independent checkpoint detects rollback and chain corruption',()=>{
 const options={directory:mkdtempSync(join(tmpdir(),'ffr-encrypted-')),key:'synthetic-key'};const w=createWorkflow(options);
 w.shock('CELL-MILL-2');const earlier=w.exportPacket();const checkpoint=w.exportCheckpoint();w.reset();const later=w.exportPacket();
 assert.equal(verifyCheckpoint(later,checkpoint).ok,true);assert.equal(verifyCheckpoint(earlier,w.exportCheckpoint()).ok,false);
 const altered=structuredClone(later);altered.events[0].data.priorDigest='forged';assert.equal(verifyCheckpoint(altered,checkpoint).ok,false);
 assert.equal(createWorkflow(options).status().ledger.head,later.ledger.head);
 assert.ok(!readFileSync(join(options.directory,'events.jsonl'),'utf8').includes('snapshot_changed'));
 assert.match(readablePacket(later),/Demo scenario data/);assert.match(readablePacket(later),new RegExp(later.snapshot.snapshotDigest));
 const anchor=join(options.directory,'anchor.json');writeFileSync(anchor,'{}');assert.throws(()=>w.exportCheckpoint(),/LEDGER_TAMPERED/);
});

test('removing both authoritative files during a running workflow cannot silently return genesis',()=>{
 const directory=mkdtempSync(join(tmpdir(),'ffr-missing-'));const w=createWorkflow({directory,key:'synthetic-key'});w.shock('CELL-MILL-2');
 for(const name of ['events.jsonl','anchor.json'])renameSync(join(directory,name),join(directory,name+'.preserved'));
 assert.throws(()=>w.status(),/LEDGER_TAMPERED/);
});

test('readable report binds actor, plan, accepted run and source records and escapes model HTML',async()=>{
 const w=createWorkflow({directory:mkdtempSync(join(tmpdir(),'ffr-readable-')),key:'synthetic-key'});
 const r=await w.investigate({sample:true,mode:'sample',complete:async()=>({sample:true,text:'<script>untrusted</script>',toolCalls:[]})});const optionId=r.analysis.recovery.options.find(o=>o.feasible).optionId;
 const e=w.review(r.runId,optionId,'synthetic-actor');w.confirm(e.nonce,`APPROVE ${optionId}`,'synthetic-actor');const report=w.exportReport().text;
 assert.ok(report.includes(e.actor));assert.ok(report.includes(e.planDigest));assert.ok(report.includes(r.runId));assert.match(report,/doc-cert-441/);assert.ok(!report.includes('<script>'));assert.ok(report.includes('&lt;script&gt;'));
});

test('packet retains full immutable initial and changed snapshots for independent replay',()=>{
 const options={directory:mkdtempSync(join(tmpdir(),'ffr-snapshots-')),key:'synthetic-key'};const w=createWorkflow(options);const initial=w.status().snapshot;
 w.shock('CELL-MILL-2');const packet=w.exportPacket();assert.equal(packet.snapshots.length,2);assert.deepEqual(packet.snapshots[0],initial);
 assert.equal(packet.snapshots[1].snapshotDigest,packet.snapshot.snapshotDigest);assert.deepEqual(createWorkflow(options).exportPacket().snapshots,packet.snapshots);
});
