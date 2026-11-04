import test from 'node:test';
import assert from 'node:assert/strict';
import {guideStep} from '../../public/guide.mjs';
const live=(digest,provider)=>({proposalValid:true,run:{snapshotDigest:digest,sample:false},calls:[{provider}]});
test('second shock repeats Spark then Wonder before revised human acceptance',()=>{
 const state={snapshot:{snapshotDigest:'new'},runs:[live('old','baseten'),live('old','meta-model-api')],decision:{status:'invalidated'},board:{tasks:[{}]},ledger:{}};
 const guide={mode:'live',initialDigest:'old',inspected:true,acceptedInitial:true,boardEnabled:true};
 assert.equal(guideStep(state,guide).provider,'baseten');
 state.runs.push(live('new','baseten'));assert.equal(guideStep(state,guide).id,'recover');assert.equal(guideStep(state,guide).provider,'wonder');
 state.runs.push(live('new','meta-model-api'));assert.equal(guideStep(state,guide).id,'findings');guide.findingsReviewed='new';assert.equal(guideStep(state,guide).id,'reaccept');
});
