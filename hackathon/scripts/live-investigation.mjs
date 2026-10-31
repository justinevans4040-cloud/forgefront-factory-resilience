import { createModelClient } from '../src/models/client.mjs';
import { SPARK_BASETEN_ROUTE,SPARK_FIREWORKS_ROUTE } from '../src/models/routes.mjs';
import { createWorkflow } from '../src/workflow.mjs';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory=mkdtempSync(join(tmpdir(),'ffr-live-investigation-'));
const workflow=createWorkflow({directory,key:randomBytes(32).toString('hex'),secrets:[process.env.MUSE_API_KEY,process.env.MODEL_API_KEY,process.env.BASETEN_API_KEY,process.env.FIREWORKS_API_KEY]});
const outcomes=[];
for(const provider of ['wonder','baseten','fireworks']){
 const apiKey=provider==='wonder'?(process.env.MUSE_API_KEY||process.env.MODEL_API_KEY):process.env[provider==='baseten'?'BASETEN_API_KEY':'FIREWORKS_API_KEY'];
 if(!apiKey){outcomes.push({provider,ok:false,reason:'KEY_UNAVAILABLE'});continue;}
 const client=provider==='wonder'?createModelClient('wonder',{apiKey}):createModelClient('spark-open',{apiKey,route:provider==='baseten'?SPARK_BASETEN_ROUTE:SPARK_FIREWORKS_ROUTE});
 const result=await workflow.investigate(client);
 outcomes.push({provider,ok:result.proposalValid && result.run.toolCalls>=2 && result.claims.accepted.length>0,stopReason:result.run.stopReason,turns:result.run.turns,toolCalls:result.run.toolCalls,validatedClaims:result.claims.accepted.length,rejectedClaims:result.claims.rejected.length,elapsedMs:result.run.elapsedMs,runId:result.runId});
 console.log(JSON.stringify(outcomes.at(-1)));
}
const evidence=new URL('../evidence/run5/investigation/',import.meta.url);mkdirSync(evidence,{recursive:true});
for(const [name,value]of [['summary.json',outcomes],['packet.json',workflow.exportPacket()]]){const file=new URL(name,evidence);if(existsSync(file))copyFileSync(file,new URL(name+'.bak',evidence));writeFileSync(file,JSON.stringify(value,null,2));}
if(outcomes.some(r=>!r.ok))process.exitCode=1;
