import {test} from 'node:test';
import assert from 'node:assert/strict';
import {promisify} from 'node:util';
import {randomBytes, scrypt as derive, createCipheriv} from 'node:crypto';
import {passphraseFeedback} from '../../public/passphrase.mjs';
import {encryptPacket, decryptPacket} from '../../src/security/export-codec.mjs';
import {createWorkflow} from '../../src/workflow.mjs';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const scrypt=promisify(derive);
const SCRYPT={N:16384,r:8,p:1,maxmem:64*1024*1024};

test('decrypt retains length-only validation so historically length-gated packets remain recoverable',async()=>{
  const weak='aaaaaaaaaaaaaaaa';
  assert.equal(passphraseFeedback(weak).ok,false);
  await assert.rejects(encryptPacket({synthetic:true},weak),/passphrase/i);
  const salt=randomBytes(16),iv=randomBytes(12),aad=Buffer.from('FFR_ENCRYPTED_EXPORT_V1');
  const key=await scrypt(weak,salt,32,SCRYPT);
  const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);
  const data=Buffer.concat([cipher.update(JSON.stringify({synthetic:true,operationalRelease:false}),'utf8'),cipher.final()]);
  const envelope={format:'FFR_ENCRYPTED_EXPORT_V1',kdf:'scrypt-N16384-r8-p1',salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
  key.fill(0);
  assert.deepEqual(await decryptPacket(envelope,weak),{synthetic:true,operationalRelease:false});
  await assert.rejects(decryptPacket(envelope,'short'),/16/);
});

test('async job failures retain the concrete stop code instead of a generic opaque label',async()=>{
  const w=createWorkflow({directory:mkdtempSync(join(tmpdir(),'ffr-audit5-job-')),key:randomBytes(32).toString('hex')});
  let finish;
  const client={mode:'sample',sample:true,complete:()=>new Promise(r=>finish=r)};
  const job=w.startInvestigation(client,'actor');
  w.shock('CELL-MILL-2');
  finish({sample:true,text:'Offline',toolCalls:[]});
  await new Promise(r=>setTimeout(r,40));
  const status=w.investigationStatus(job.jobId,'actor');
  assert.equal(status.status,'failed');
  assert.match(status.failure,/STALE_INVESTIGATION/);
});
