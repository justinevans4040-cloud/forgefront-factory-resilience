import {test} from 'node:test';
import assert from 'node:assert/strict';
import {passphraseFeedback} from '../../public/passphrase.mjs';
import {encryptPacket,decryptPacket} from '../../src/security/export-codec.mjs';
test('export strength rejects repeated and predictable secrets and accepts varied long phrases',async()=>{
 for(const value of ['aaaaaaaaaaaaaaaa','passwordpasswordpassword','one one one one one','1234567890123456']){
  assert.equal(passphraseFeedback(value).ok,false);
  await assert.rejects(encryptPacket({},value),/passphrase/i);
 }
 for(const value of ['synthetic export passphrase','Cobalt!River_Orchid83'])assert.equal(passphraseFeedback(value).ok,true);
 assert.equal(passphraseFeedback('').message,'Use a separate export passphrase of 16 to 160 characters.');
 const strong='synthetic export passphrase';
 assert.deepEqual(await decryptPacket(await encryptPacket({ok:true},strong),strong),{ok:true});
});

test('reset returns to opening decision state while retaining verified history across restart',async()=>{
 const {createWorkflow}=await import('../../src/workflow.mjs');const {mkdtempSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const options={directory:mkdtempSync(join(tmpdir(),'ffr-reset-')),key:(await import('node:crypto')).randomBytes(32).toString('hex')};
 const w=createWorkflow(options);const before=w.status().snapshot.snapshotDigest;w.shock('CELL-MILL-2');w.reset();assert.equal(w.status().decision.status,'none');assert.notEqual(w.status().snapshot.snapshotDigest,before);const restored=createWorkflow(options);assert.equal(restored.status().decision.status,'none');assert.equal(restored.status().ledger.ok,true);
});
