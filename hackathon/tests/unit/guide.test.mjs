import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideStep } from '../../public/guide.mjs';
const run=(provider,digest='initial')=>({proposalValid:true,run:{sample:false,snapshotDigest:digest},calls:[{provider}]});
const state={snapshot:{snapshotDigest:'initial'},runs:[],decision:{status:'none'},ledger:{head:'head'}};
test('guided story requires source inspection, both live Meta routes and deliberate decisions across shock',()=>{
 const g={initialDigest:'initial',inspected:false,acceptedInitial:false,exported:false};
 assert.equal(guideStep(state,g).id,'sources');g.inspected=true;assert.equal(guideStep(state,g).id,'spark');
 state.runs=[{...run('baseten'),run:{sample:true,snapshotDigest:'initial'}}];assert.equal(guideStep(state,g).id,'spark');
 state.runs=[run('baseten')];assert.equal(guideStep(state,g).id,'wonder');state.runs.push(run('meta-model-api'));assert.equal(guideStep(state,g).id,'accept');
 state.decision={status:'accepted'};g.acceptedInitial=true;assert.equal(guideStep(state,g).id,'shock');
 state.snapshot.snapshotDigest='changed';state.decision={status:'invalidated'};assert.equal(guideStep(state,g).id,'recover');
 state.runs.push(run('baseten','changed'));assert.equal(guideStep(state,g).id,'reaccept');state.decision.status='accepted';assert.equal(guideStep(state,g).id,'export');
 g.exported='head';assert.equal(guideStep(state,g).id,'export');g.verified='head';g.checkpoint='head';assert.equal(guideStep(state,g).id,'complete');
});
