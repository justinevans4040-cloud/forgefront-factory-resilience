import test from 'node:test';import assert from 'node:assert/strict';
test('Wonder retries once then uses only Baseten within one shared deadline',async()=>{
 const {resilientWonder}=await import('../../src/models/resilient-wonder.mjs');
 const events=[],calls=[];const primary={id:'wonder',route:{provider:'meta-model-api',model:'muse-wonder-1.0'},complete:async r=>{calls.push(['wonder',r.timeoutMs]);throw Object.assign(Error('failed'),{status:503});}};
 const fallback={route:{provider:'baseten',model:'meta-models/muse-spark-open'},complete:async r=>{calls.push(['baseten',r.timeoutMs]);return {modelId:'meta-models/muse-spark-open',text:'response'};}};
 const r=await resilientWonder(primary,()=>fallback,{record:async e=>events.push(e)}).complete({timeoutMs:1000});
 assert.deepEqual(calls.map(c=>c[0]),['wonder','wonder','baseten']);assert.equal(r.fallbackUsed,true);assert.equal(r.route.provider,'baseten');assert.equal(events.length,2);assert.ok(calls.every(c=>c[1]<=1000));
});
test('resilience rejects non-Baseten fallback and never retries identity mismatch',async()=>{
 const {resilientWonder}=await import('../../src/models/resilient-wonder.mjs');let calls=0;
 const primary={route:{provider:'meta-model-api',model:'muse-wonder-1.0'},complete:async()=>{calls++;return {modelId:'wrong'};}};
 await assert.rejects(resilientWonder(primary,()=>{throw Error('must not fall back');}).complete({timeoutMs:1000}),/IDENTITY/);assert.equal(calls,1);
 await assert.rejects(resilientWonder({...primary,complete:async()=>{throw Error('network');}},()=>({route:{provider:'fireworks'}})).complete({timeoutMs:1000}),/PRIMARY_META/);
});

test('validated Baseten fallback completes the requested Wonder stage without claiming Wonder answered',async()=>{
 const {guideStep}=await import('../../public/guide.mjs');
 const state={snapshot:{snapshotDigest:'current'},runs:[{proposalValid:true,run:{sample:false,snapshotDigest:'current'},calls:[{provider:'baseten'}]},{proposalValid:true,run:{sample:false,snapshotDigest:'current'},calls:[{provider:'baseten',primaryProvider:'meta-model-api',fallbackUsed:true}]}],decision:{status:'none'},ledger:{}};
 assert.equal(guideStep(state,{mode:'live',initialDigest:'current',inspected:true,acceptedInitial:false}).id,'accept');
 assert.equal(state.runs[1].calls[0].provider,'baseten');
});
