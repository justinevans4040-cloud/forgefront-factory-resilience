import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as layout from '../../public/factory-layout.mjs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('validated claim cards name their actual source and keep raw identity separate',()=>{
 assert.equal(typeof layout.claimPresentation,'function');
 const record={evidenceId:'ev-cert-qty',quantity:{value:137,unit:'each'},source:{documentId:'doc-cert-441',recordId:'rec-cert-line-3',field:'quantity'}};
 const view=layout.claimPresentation(record,{value:137,unit:'each',evidenceId:record.evidenceId});
 assert.equal(view.headline,'Certificate says 137');
 assert.match(view.detail,/ev-cert-qty/);assert.match(view.detail,/doc-cert-441/);
 const unknown=layout.claimPresentation(null,{value:9,unit:'hours',evidenceId:'ev-capacity'});
 assert.equal(unknown.headline,'Verified source: 9 hours');assert.match(unknown.detail,/ev-capacity/);
});
test('investigation inspector reserves independent connection and source-evidence regions',()=>{
 const html=read('public/index.html');
 assert.match(html,/data-investigation-region="connection"/);
 assert.match(html,/data-investigation-region="evidence"/);
 assert.match(html,/data-investigation-region="results"/);
 assert.match(read('public/style.css'),/investigation-workspace/);
 assert.match(read('public/app.mjs'),/claimPresentation\(/);
});
import {guideStep} from '../../public/guide.mjs';
import * as guide from '../../public/guide.mjs';
test('public spend fallback preserves offline guided progression and bounded polling',()=>{
 assert.equal(typeof guide.publicRecoveryMode,'function');
 assert.deepEqual(guide.publicRecoveryMode({publicOffline:true},'live','wonder'),{provider:'sample',mode:'offline',message:'Daily live allowance reached. Continue the complete recovery with Sample offline.'});
 assert.equal(guide.publicPollDelay({pollAfterMs:5000}),5000);assert.equal(guide.publicPollDelay({}),700);
 assert.equal(guide.publicPollDelay({pollAfterMs:-1}),700);
 assert.deepEqual(guide.publicRecoveryMode({},'live','baseten'),{provider:'baseten',mode:'live',message:null});
});
test('investigation highlights compute counts from the current validated run and snapshot',()=>{
 assert.equal(typeof layout.investigationHighlights,'function');
 assert.deepEqual(layout.investigationHighlights({claims:{accepted:[{},{}],rejected:[{}]}},{recovery:{feasibleCount:4}}),[{value:2,label:'Verified facts'},{value:1,label:'Rejected claims'},{value:4,label:'Feasible paths'}]);
});
test('handoff states name the completed route and the distinct next task',()=>{
 assert.equal(typeof layout.investigationHandoff,'function');
 assert.match(layout.investigationHandoff({run:{sample:false},calls:[{returnedModel:'meta-models/muse-spark-open'}]},'wonder'),/Spark Open findings ready.*Next: ask Muse Wonder/);
 assert.match(layout.investigationHandoff({run:{sample:true},calls:[]},'sample'),/Sample findings ready/);
});
test('public throttling retries at most once after the server wait',async()=>{
 assert.equal(typeof guide.requestWithRateLimit,'function');
 let calls=0;const waits=[],notes=[];
 const limited=()=>new Response('{}',{status:429,headers:{'Retry-After':'2'}});
 const result=await guide.requestWithRateLimit(async()=>++calls===1?limited():new Response('{}'),{sleep:async ms=>waits.push(ms),onWait:seconds=>notes.push(seconds)});
 assert.equal(result.status,200);assert.equal(calls,2);assert.deepEqual(waits,[2000]);assert.deepEqual(notes,[2]);
 calls=0;const exhausted=await guide.requestWithRateLimit(async()=>{calls++;return limited();},{sleep:async()=>{},onWait:()=>{}});assert.equal(exhausted.status,429);assert.equal(calls,2);
});
