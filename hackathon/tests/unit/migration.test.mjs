import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import { migrateLegacyState } from '../../src/security/migrate-state.mjs';
import { createWorkflow } from '../../src/workflow.mjs';
test('explicit migration verifies source and writes encrypted copy without altering source',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-migroot-'));
 const source=join(root,'source'),destination=join(root,'encrypted-copy'),key='synthetic-key';
 mkdirSync(source);
 const body={sequence:1,type:'decision_revoked',epochMs:1,previousHash:'GENESIS',data:{status:'revoked',operationalRelease:false}};
 const event={...body,eventHash:createHash('sha256').update(JSON.stringify(body)).digest('hex')};const log=JSON.stringify(event)+'\n';
 writeFileSync(join(source,'events.jsonl'),log);writeFileSync(join(source,'anchor.json'),JSON.stringify({count:1,head:event.eventHash,signature:createHmac('sha256',key).update(event.eventHash).digest('hex')}));
 assert.throws(()=>migrateLegacyState({source,destination,key:'wrong-key!!!!'}));migrateLegacyState({source,destination,key});
 assert.equal(readFileSync(join(source,'events.jsonl'),'utf8'),log);assert.equal(createWorkflow({directory:destination,key}).status().decision.status,'revoked');assert.throws(()=>migrateLegacyState({source,destination,key}));
});
