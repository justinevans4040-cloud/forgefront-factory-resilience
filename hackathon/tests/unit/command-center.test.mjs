import test from 'node:test';
import assert from 'node:assert/strict';
import * as room from '../../public/command-center.mjs';
import {readFileSync} from 'node:fs';
const state={snapshot:{snapshotDigest:'a',jobs:[{jobId:'one',dueHours:10},{jobId:'two',dueHours:22}]},analysis:{impacted:{impactedJobCount:2,impactedUnits:70},recovery:{options:[{optionId:'wait_replenishment',feasible:true,finishHours:83},{optionId:'allocate_substitute',feasible:true,finishHours:35}]}},decision:{status:'none'},ledger:{ok:true,count:9,head:'h'},runs:[]};
test('incident and final story use current calculations and never turn acceptance into physical release',()=>{
 assert.equal(typeof room.storyView,'function');
 const view=room.storyView(state,null);
 assert.match(view.opening,/70/);assert.match(view.opening,/2/);assert.match(view.schedule,/10/);
 assert.equal(view.accepted,false);assert.equal(view.finishHours,null);
 const changed=structuredClone(state);changed.analysis.impacted.impactedUnits=31;changed.decision={status:'accepted',optionId:'allocate_substitute'};
 const result=room.storyView(changed,{initialDigest:'old',acceptedInitial:true,exported:'h',verified:'h',checkpoint:'h'});
 assert.match(result.opening,/31/);assert.equal(result.finishHours,35);assert.equal(result.savedHours,48);assert.equal(result.proofComplete,true);assert.equal(result.secondShock,true);
 changed.ledger.head='new';assert.equal(room.storyView(changed,{exported:'h',verified:'h',checkpoint:'h'}).proofComplete,false);
});
test('all guided actions map to focused stages, with invalid targets rejected',()=>{
 assert.equal(typeof room.stageFor,'function');
 for(const [target,stage] of [['evidence','incident'],['investigate','investigation'],['options','decision'],['typed','decision'],['shock','shock'],['encrypted-export','proof']])assert.equal(room.stageFor(target),stage);
 assert.equal(room.stageFor('absent'),null);
});
test('result transition reveals stage before focus, highlights result and honors reduced motion',()=>{
 assert.equal(typeof room.focusResult,'function');
 const calls=[];const element={tabIndex:0,matches:()=>false,classList:{add:x=>calls.push(x)},scrollIntoView:o=>calls.push(o),focus:o=>calls.push(o)};
 const document={getElementById:()=>element,querySelectorAll:()=>[]};
 room.focusResult('options',{document,reducedMotion:true,showStage:s=>calls.push(s)});
 assert.equal(calls[0],'decision');assert.ok(calls.includes('result-highlight'));assert.ok(calls.some(c=>c?.behavior==='auto'));assert.ok(calls.some(c=>c?.preventScroll===true));assert.equal(element.tabIndex,-1);
});
test('the command center has exact company branding and distinct responsive stages',()=>{
 const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
 assert.match(html,/<title>Forgefront Systems - Factory Resilience<\/title>/);
 assert.match(html,/Forgefront Systems <small>/);
 assert.match(html,/src="\/forgefront-systems-logo\.png"/);
 assert.match(html,/href="\/favicon\.png"/);
 assert.match(html,/class="story-logo"/);
 for(const stage of ['incident','investigation','decision','shock','proof'])assert.match(html,new RegExp('data-stage="'+stage+'"'));
 assert.match(html,/id="story-opening"/);assert.match(html,/id="story-results"/);assert.match(html,/id="stage-rail"/);
});
test('official Forgefront Systems logo is byte-identical in brand assets and wired for judges',async()=>{
 const {createHash}=await import('node:crypto');
 const {publicFiles}=await import('../../scripts/public-set.mjs');
 const {fileURLToPath}=await import('node:url');
 const {readFileSync:read}=await import('node:fs');
 const repo=fileURLToPath(new URL('../../../',import.meta.url));
 const canonical=read(new URL('../../../assets/brand/forgefront-systems-logo.png',import.meta.url));
 assert.equal(createHash('sha256').update(canonical).digest('hex'),'5d3333eb8a5d97e97d5b868ed81008c6994c19f3f756101208add0e7e526f707');
 const files=publicFiles(repo);
 assert.ok(files.includes('assets/brand/forgefront-systems-logo.png'));
 assert.ok(files.includes('hackathon/public/forgefront-systems-logo.png'));
 assert.ok(files.includes('hackathon/public/favicon.png'));
 const served=read(new URL('../../public/forgefront-systems-logo.png',import.meta.url));
 assert.equal(createHash('sha256').update(served).digest('hex'),'5d3333eb8a5d97e97d5b868ed81008c6994c19f3f756101208add0e7e526f707');
 assert.deepEqual(served,canonical);
 const readme=read(new URL('../../../README.md',import.meta.url),'utf8');
 assert.match(readme,/assets\/brand\/forgefront-systems-logo\.png/);
 assert.ok(readme.indexOf('assets/brand/forgefront-systems-logo.png')<readme.indexOf('assets/showcase/factory-resilience-hero.jpg'));
 const css=read(new URL('../../public/style.css',import.meta.url),'utf8');
 assert.match(css,/--accent:#c6ed8d/);
 assert.match(css,/background:#050705/);
});
test('investigation prompts export only the live system prompt builder',async()=>{
 const prompts=await import('../../src/agent/prompts.mjs');
 assert.equal(typeof prompts.buildInvestigationSystemPrompt,'function');
 assert.equal(prompts.buildWonderNarrativePrompt,undefined);
 assert.match(prompts.buildInvestigationSystemPrompt({snapshotDigest:'abc',label:'demo'}),/abc/);
});

import {guideStep} from '../../public/guide.mjs';
import {readablePacket} from '../../src/packet.mjs';
test('explicit offline guide advances only on a successful Sample result and still requires changed-snapshot proof',()=>{
 const s=structuredClone(state),g={mode:'offline',initialDigest:'a',inspected:true};
 assert.equal(guideStep(s,g).id,'sample');
 s.runs=[{proposalValid:false,run:{sample:true,snapshotDigest:'a'},calls:[]}];assert.equal(guideStep(s,g).id,'sample');
 s.runs[0].proposalValid=true;assert.equal(guideStep(s,g).id,'findings');g.findingsReviewed='a';assert.equal(guideStep(s,g).id,'accept');
 g.acceptedInitial=true;s.snapshot.snapshotDigest='b';assert.equal(guideStep(s,g).id,'recover');
 s.runs.push({proposalValid:true,run:{sample:true,snapshotDigest:'b'},calls:[]});assert.equal(guideStep(s,g).id,'findings');g.findingsReviewed='b';assert.equal(guideStep(s,g).id,'reaccept');
 s.decision.status='accepted';assert.equal(guideStep(s,g).id,'export');g.verified=g.exported=g.checkpoint='h';assert.equal(guideStep(s,g).id,'complete');
});
test('readable report presents professional labels and preserves source and human-validation boundaries',()=>{
 const packet={...state,evidence:[],events:[],runs:[{runId:'r',run:{snapshotDigest:'a',sample:true,stopReason:'done'},calls:[],claims:{accepted:[],rejected:[]},narrative:'Human reviews the calculated plan.'}]};
 packet.analysis=structuredClone(packet.analysis);for(const option of packet.analysis.recovery.options){option.constraints=[];option.evidenceIds=[];}
 const report=readablePacket(packet);assert.match(report,/Demo scenario data/);assert.match(report,/Model analysis/);assert.match(report,/human review/i);assert.doesNotMatch(report,/ADVISORY ONLY|ILLUSTRATIVE COSTS|Operational release:|UNVALIDATED ADVISORY TEXT/);
});

test('provider preflight excludes the optional backup even when its credential is inherited',async()=>{
 const {checkProviders}=await import('../../scripts/provider-check.mjs');const seen=[];
 const fetchImpl=async(url,options)=>{seen.push(String(url));const b=JSON.parse(options.body),prompt=b.input??b.messages[0].content,nonce=prompt.match(/SMOKE_OK_[a-f0-9]+/)[0];return new Response(JSON.stringify(b.input?{model:b.model,output_text:nonce}:{model:b.model,choices:[{message:{content:nonce}}]}));};
 const result=await checkProviders({env:{MUSE_API_KEY:'synthetic-wonder',BASETEN_API_KEY:'synthetic-baseten',FIREWORKS_API_KEY:'synthetic-backup'},fetchImpl});assert.equal(result.passed,true);assert.equal(seen.length,2);assert.ok(!seen.some(url=>url.includes('fireworks')));assert.equal(result.providers.find(p=>p.optionalBackup).light,'RED');
});

test('live narration exposes only tool results already returned on that model turn',async()=>{
 const {investigate}=await import('../../src/agent/investigation.mjs');const {createSnapshot,buildDemoScenarioInput}=await import('../../src/domain/scenario.mjs');const {investigationStatus}=await import('../../public/investigation-status.mjs');
 const replies=[{action:'tool',name:'get_incident',arguments:{}},{action:'tool',name:'compare_recovery_options',arguments:{}},{action:'final',optionId:'allocate_substitute',narrative:'Review the recovery.',claims:[]}];const progress=[];
 await investigate({snapshot:createSnapshot(buildDemoScenarioInput()),client:{sample:false,mode:'live',route:{model:'test-meta'},complete:async()=>({modelId:'test-meta',text:JSON.stringify(replies.shift())})},progress:c=>progress.push(c)});
 const waiting=progress.filter(p=>p.status==='waiting');assert.equal(waiting[0].sourcesRead,0);assert.ok(waiting[1].sourcesRead>0);assert.equal(waiting[1].feasiblePaths,null);assert.equal(waiting[2].feasiblePaths,3);
 assert.match(investigationStatus({phase:'running',route:'Muse Wonder',call:{...waiting[2],remainingMs:5000}}),/source records read/);assert.match(investigationStatus({phase:'running',call:{...waiting[2],remainingMs:5000}}),/3 feasible paths/);
});

test('changing guide mode after a shock offers a real restart instead of an unreachable old-snapshot call',()=>{
 const changed=structuredClone(state);changed.snapshot.snapshotDigest='changed';
 const guide={mode:'live',initialDigest:'a',inspected:true,acceptedInitial:true};
 changed.runs=[{proposalValid:true,run:{sample:true,snapshotDigest:'a'},calls:[]}];
 const step=guideStep(changed,guide);assert.equal(step.id,'restart');assert.equal(step.target,'guide-start');
 guide.mode='offline';changed.runs=[{proposalValid:true,run:{sample:false,snapshotDigest:'a'},calls:[{provider:'baseten'}]}];assert.equal(guideStep(changed,guide).id,'restart');
});

test('all standard smoke entry points preserve primary-only verification defaults',async()=>{
 const {runSmoke}=await import('../../scripts/smoke-meta.mjs');let calls=0;
 await runSmoke({env:{MUSE_API_KEY:'synthetic',BASETEN_API_KEY:'synthetic',FIREWORKS_API_KEY:'synthetic'},fetchImpl:async(url,options)=>{calls++;const b=JSON.parse(options.body),prompt=b.input??b.messages[0].content,nonce=prompt.match(/SMOKE_OK_[a-f0-9]+/)[0];return new Response(JSON.stringify(b.input?{model:b.model,output_text:nonce}:{model:b.model,choices:[{message:{content:nonce}}]}));}});
 assert.equal(calls,2);
 for(const name of ['live-investigation.mjs','serve-meta-smoke.mjs']){const script=readFileSync(new URL('../../scripts/'+name,import.meta.url),'utf8');assert.doesNotMatch(script,/for\s*\(const provider of \['wonder',\s*'baseten',\s*'fireworks'\]/);}
});

test('Spark Open final envelope has room for reasoning and structured output without retrying',async()=>{
 const {investigate}=await import('../../src/agent/investigation.mjs');const {createSnapshot,buildDemoScenarioInput}=await import('../../src/domain/scenario.mjs');let calls=0;const budgets=[];
 const client={id:'spark-open',sample:false,mode:'live',route:{provider:'baseten',model:'test-meta'},complete:async request=>{budgets.push(request.maxTokens);calls++;let reply=calls===1?{action:'tool',name:'get_incident',arguments:{}}:calls===2?{action:'tool',name:'compare_recovery_options',arguments:{}}:{action:'final',optionId:'allocate_substitute',narrative:'Review the verified substitute.',claims:[{evidenceId:'ev-cert-qty',value:120,unit:'each',documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'}]};return {modelId:'test-meta',text:calls===3&&request.maxTokens<8192?'{':JSON.stringify(reply)};}};
 const result=await investigate({snapshot:createSnapshot(buildDemoScenarioInput()),client});assert.equal(result.proposalValid,true);assert.equal(calls,3);assert.deepEqual(budgets,[1024,1024,8192]);
});

test('guided itinerary and rail share complete state order with an unnumbered completion',async()=>{const {guidedSteps}=await import('../../public/guide.mjs');assert.deepEqual(guidedSteps('offline',true).map(s=>s.id),['sources','sample','accept','board','shock','recover','reaccept','board-revised','export','complete']);assert.equal(guidedSteps('live',true).filter(s=>s.id!=='complete').length,10);});
