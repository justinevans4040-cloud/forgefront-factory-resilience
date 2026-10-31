import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflow } from '../../src/workflow.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('async investigations return an owner-bound job and expose completion without bypassing active lock',async()=>{
 const w=createWorkflow({directory:mkdtempSync(join(tmpdir(),'ffr-job-')),key:'synthetic-job-key'});let finish;
 const client={mode:'sample',sample:true,complete:()=>new Promise(r=>finish=r)};
 const job=w.startInvestigation(client,'actor');assert.equal(job.status,'running');assert.throws(()=>w.investigationStatus(job.jobId,'other'));
 assert.throws(()=>w.startInvestigation(client,'actor'),/INVESTIGATION_IN_PROGRESS/);
 finish({sample:true,text:'Offline',toolCalls:[]});await new Promise(r=>setTimeout(r,10));assert.equal(w.investigationStatus(job.jobId,'actor').status,'completed');
 assert.equal(w.investigationStatus(job.jobId,'actor').result.run.sample,true);
});
