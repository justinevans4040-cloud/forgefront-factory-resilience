import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {readablePacket} from '../../src/packet.mjs';
import {designIteration,assertNewIteration,backupReviewFile,directionBeats} from '../../scripts/design-director.mjs';
const state={snapshot:{snapshotDigest:'a',jobs:[{jobId:'one',dueHours:10},{jobId:'two',dueHours:22}]},analysis:{impacted:{impactedJobCount:2,impactedUnits:70},recovery:{options:[{optionId:'wait_replenishment',feasible:true,finishHours:83},{optionId:'allocate_substitute',feasible:true,finishHours:35}]}},decision:{status:'none'},ledger:{ok:true,count:9,head:'h'},runs:[]};
const direction=JSON.parse(readFileSync(new URL('../../design/design-direction.json',import.meta.url),'utf8'));
const weaker={steps:direction.steps.map(s=>({...s,score:Math.max(0,(s.score??0)-1)}))};
const stronger={steps:direction.steps.map(s=>({...s,score:(s.score??0)+1}))};
// Retained unchanged from audit11-visual.test.mjs
test('Meta product routes keep Fireworks optional and never auto-call it from Britt drafting', async () => {
  const board = readFileSync(new URL('../../src/recovery-board.mjs', import.meta.url), 'utf8');
  assert.match(board, /PRIMARY_META_ROUTE_REQUIRED/);
  assert.match(board, /\['meta-model-api','baseten'\]/);
  assert.doesNotMatch(board, /fireworks/);
  const {checkProviders} = await import('../../scripts/provider-check.mjs');
  const seen = [];
  const result = await checkProviders({
    env: {MUSE_API_KEY: 'synthetic-wonder', BASETEN_API_KEY: 'synthetic-baseten', FIREWORKS_API_KEY: 'synthetic-backup'},
    fetchImpl: async (url, options) => {
      seen.push(String(url));
      const body = JSON.parse(options.body);
      const prompt = body.input ?? body.messages[0].content;
      const nonce = prompt.match(/SMOKE_OK_[a-f0-9]+/)[0];
      return new Response(JSON.stringify(body.input ? {model: body.model, output_text: nonce} : {model: body.model, choices: [{message: {content: nonce}}]}));
    },
  });
  assert.equal(result.passed, true);
  assert.ok(!seen.some((url) => url.includes('fireworks')));
});

// Retained unchanged from command-center.test.mjs
test('investigation prompts export only the live system prompt builder',async()=>{
 const prompts=await import('../../src/agent/prompts.mjs');
 assert.equal(typeof prompts.buildInvestigationSystemPrompt,'function');
 assert.equal(prompts.buildWonderNarrativePrompt,undefined);
 assert.match(prompts.buildInvestigationSystemPrompt({snapshotDigest:'abc',label:'demo'}),/abc/);
});

// Retained unchanged from command-center.test.mjs
test('readable report presents professional labels and preserves source and human-validation boundaries',()=>{
 const packet={...state,evidence:[],events:[],runs:[{runId:'r',run:{snapshotDigest:'a',sample:true,stopReason:'done'},calls:[],claims:{accepted:[],rejected:[]},narrative:'Human reviews the calculated plan.'}]};
 packet.analysis=structuredClone(packet.analysis);for(const option of packet.analysis.recovery.options){option.constraints=[];option.evidenceIds=[];}
 const report=readablePacket(packet);assert.match(report,/Demo scenario data/);assert.match(report,/Model analysis/);assert.match(report,/human review/i);assert.doesNotMatch(report,/ADVISORY ONLY|ILLUSTRATIVE COSTS|Operational release:|UNVALIDATED ADVISORY TEXT/);
});

// Retained unchanged from command-center.test.mjs
test('provider preflight excludes the optional backup even when its credential is inherited',async()=>{
 const {checkProviders}=await import('../../scripts/provider-check.mjs');const seen=[];
 const fetchImpl=async(url,options)=>{seen.push(String(url));const b=JSON.parse(options.body),prompt=b.input??b.messages[0].content,nonce=prompt.match(/SMOKE_OK_[a-f0-9]+/)[0];return new Response(JSON.stringify(b.input?{model:b.model,output_text:nonce}:{model:b.model,choices:[{message:{content:nonce}}]}));};
 const result=await checkProviders({env:{MUSE_API_KEY:'synthetic-wonder',BASETEN_API_KEY:'synthetic-baseten',FIREWORKS_API_KEY:'synthetic-backup'},fetchImpl});assert.equal(result.passed,true);assert.equal(seen.length,2);assert.ok(!seen.some(url=>url.includes('fireworks')));assert.equal(result.providers.find(p=>p.optionalBackup).light,'RED');
});

// Retained unchanged from command-center.test.mjs
test('all standard smoke entry points preserve primary-only verification defaults',async()=>{
 const {runSmoke}=await import('../../scripts/smoke-meta.mjs');let calls=0;
 await runSmoke({env:{MUSE_API_KEY:'synthetic',BASETEN_API_KEY:'synthetic',FIREWORKS_API_KEY:'synthetic'},fetchImpl:async(url,options)=>{calls++;const b=JSON.parse(options.body),prompt=b.input??b.messages[0].content,nonce=prompt.match(/SMOKE_OK_[a-f0-9]+/)[0];return new Response(JSON.stringify(b.input?{model:b.model,output_text:nonce}:{model:b.model,choices:[{message:{content:nonce}}]}));}});
 assert.equal(calls,2);
 for(const name of ['live-investigation.mjs','serve-meta-smoke.mjs']){const script=readFileSync(new URL('../../scripts/'+name,import.meta.url),'utf8');assert.doesNotMatch(script,/for\s*\(const provider of \['wonder',\s*'baseten',\s*'fireworks'\]/);}
});

// Retained unchanged from command-center.test.mjs
test('Spark Open final envelope has room for reasoning and structured output without retrying',async()=>{
 const {investigate}=await import('../../src/agent/investigation.mjs');const {createSnapshot,buildDemoScenarioInput}=await import('../../src/domain/scenario.mjs');let calls=0;const budgets=[];
 const client={id:'spark-open',sample:false,mode:'live',route:{provider:'baseten',model:'test-meta'},complete:async request=>{budgets.push(request.maxTokens);calls++;let reply=calls===1?{action:'tool',name:'get_incident',arguments:{}}:calls===2?{action:'tool',name:'compare_recovery_options',arguments:{}}:{action:'final',optionId:'allocate_substitute',narrative:'Review the verified substitute.',claims:[{evidenceId:'ev-cert-qty',value:100,unit:'each',documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'}]};return {modelId:'test-meta',text:calls===3&&request.maxTokens<8192?'{':JSON.stringify(reply)};}};
 const result=await investigate({snapshot:createSnapshot(buildDemoScenarioInput()),client});assert.equal(result.proposalValid,true);assert.equal(calls,3);assert.deepEqual(budgets,[1024,1024,8192]);
});

// Retained unchanged from run16-visual.test.mjs
test('design iteration identifiers support continued honest review beyond thirty',()=>{
 assert.equal(designIteration('31'),31);
 for(const input of ['0','-1','1.5','Infinity','junk'])assert.throws(()=>designIteration(input),/Invalid iteration/);
});

// Retained unchanged from run21-layout.test.mjs
test('design reviews refuse an existing iteration before making a model request',()=>{
 assert.throws(()=>assertNewIteration(new URL('../../design/',import.meta.url),70),/already exists/);
 assert.doesNotThrow(()=>assertNewIteration(new URL('../../design/',import.meta.url),999999));
});

// Retained unchanged from run22-owner.test.mjs
test('design review preserves an existing legacy backup and each prior round backup',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ffr-design-backup-'));
 try{const file=join(dir,'direction.json');writeFileSync(file,'current');writeFileSync(file+'.bak','protected');const first=backupReviewFile(file,80);writeFileSync(file,'next');const second=backupReviewFile(file,80);assert.notEqual(first,second);assert.equal(readFileSync(first,'utf8'),'current');assert.equal(readFileSync(second,'utf8'),'next');assert.equal(readFileSync(file+'.bak','utf8'),'protected');assert.ok(existsSync(file));}finally{rmSync(dir,{recursive:true,force:true});}
});

// Retained unchanged from run24-model-resilience.test.mjs
test('Wonder retries once then uses only Baseten within one shared deadline',async()=>{
 const {resilientWonder}=await import('../../src/models/resilient-wonder.mjs');
 const events=[],calls=[];const primary={id:'wonder',route:{provider:'meta-model-api',model:'muse-wonder-1.0'},complete:async r=>{calls.push(['wonder',r.timeoutMs]);throw Object.assign(Error('failed'),{status:503});}};
 const fallback={route:{provider:'baseten',model:'meta-models/muse-spark-open'},complete:async r=>{calls.push(['baseten',r.timeoutMs]);return {modelId:'meta-models/muse-spark-open',text:'response'};}};
 const r=await resilientWonder(primary,()=>fallback,{record:async e=>events.push(e)}).complete({timeoutMs:1000});
 assert.deepEqual(calls.map(c=>c[0]),['wonder','wonder','baseten']);assert.equal(r.fallbackUsed,true);assert.equal(r.route.provider,'baseten');assert.equal(events.length,2);assert.ok(calls.every(c=>c[1]<=1000));
});

// Retained unchanged from run24-model-resilience.test.mjs
test('resilience rejects non-Baseten fallback and never retries identity mismatch',async()=>{
 const {resilientWonder}=await import('../../src/models/resilient-wonder.mjs');let calls=0;
 const primary={route:{provider:'meta-model-api',model:'muse-wonder-1.0'},complete:async()=>{calls++;return {modelId:'wrong'};}};
 await assert.rejects(resilientWonder(primary,()=>{throw Error('must not fall back');}).complete({timeoutMs:1000}),/IDENTITY/);assert.equal(calls,1);
 await assert.rejects(resilientWonder({...primary,complete:async()=>{throw Error('network');}},()=>({route:{provider:'fireworks'}})).complete({timeoutMs:1000}),/PRIMARY_META/);
});

// Retained unchanged from run27-direction-retain.test.mjs
test('design direction retention rejects weaker Wonder rounds',()=>{
 assert.equal(directionBeats(weaker,direction),false);
 assert.equal(directionBeats(direction,direction),false);
 assert.equal(directionBeats(stronger,direction),true);
});

// Retained from run24-floor.test.mjs. Department identity comes from current
// plant records; the removed browser-only plantGroups geometry helper is historical.
test('full reference shop retains every operation across all failure policies and recovery strategies',async()=>{
 const {jobShopPlant}=await import('../../fixtures/job-shop.mjs');
 const {analyzePlant}=await import('../../public/plant-engine.mjs');
 const plant=jobShopPlant();
 assert.equal(plant.machines.length,45);
 assert.equal(new Set(plant.machines.map(machine=>machine.department)).size,7);
 for(const failure of Object.keys(plant.failurePolicies))for(const strategy of ['reroute','expedite','rework']){
  const result=analyzePlant(plant,{lotId:plant.lots[0].id,failure,strategy});
  assert.equal(result.affected.length,plant.operations.length);
  assert.equal(result.board.length,plant.operations.length);
  assert.equal(result.recovery.feasible,strategy==='reroute',failure+' '+strategy);
  assert.equal(result.recovery.assignments.length,strategy==='reroute'?35:5);
  assert.equal(result.recovery.unscheduled.length,strategy==='reroute'?0:30);
  if(strategy!=='reroute'){
   assert.deepEqual([...result.recovery.unscheduled].sort(),plant.operations.filter(operation=>operation.capability!=='cut').map(operation=>operation.id).sort());
   assert.equal(result.board.filter(task=>task.status==='Blocked').length,30);
  }
  assert.equal(result.metrics.lostHours,105);
  for(const assignment of result.recovery.assignments){
   const operation=plant.operations.find(item=>item.id===assignment.operationId);
   const machine=plant.machines.find(item=>item.id===assignment.machineId);
   assert.ok(machine.capabilities.includes(operation.capability));assert.equal(machine.online,true);
   const assignedHours=result.recovery.assignments.filter(item=>item.machineId===machine.id).reduce((total,item)=>total+item.hours,0);
   assert.ok(assignedHours<=machine.capacityHours);
   for(const dependency of operation.dependsOn){
    const parent=result.recovery.assignments.find(item=>item.operationId===dependency);
    assert.ok(parent);assert.ok(assignment.startHours>=parent.finishHours);
   }
   if(strategy==='reroute')assert.notEqual(assignment.machineId,operation.machineId);
  }
 }
});
