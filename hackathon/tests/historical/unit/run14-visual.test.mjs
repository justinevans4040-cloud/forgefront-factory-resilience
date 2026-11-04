import test from 'node:test';
import assert from 'node:assert/strict';
import * as center from '../../public/command-center.mjs';
test('shock preview remains visible during busy handoff and excludes other stages',()=>{
 const state={decision:{status:'accepted'},snapshot:{cells:[{cellId:'mill',online:true},{cellId:'down',online:false}]}};
 assert.equal(center.shockPreview?.(state,'shock','mill'),'mill');
 for(const stage of ['board','proof','investigation'])assert.equal(center.shockPreview?.(state,stage,'mill'),'');
 assert.equal(center.shockPreview?.(state,'shock','down'),'');
 state.decision.status='invalidated';assert.equal(center.shockPreview?.(state,'shock','mill'),'');
});

test('proof checklist is bound to current ledger head and separate completion outcomes',()=>{
 const view=center.proofChecklist?.({ledger:{head:'new'}},{verified:'old',exported:'new',checkpoint:'new'});
 assert.deepEqual(view,[{id:'verify',label:'1 · Verify ledger',done:false},{id:'encrypted-export',label:'2 · Seal encrypted packet',done:true},{id:'checkpoint',label:'3 · Retain independent checkpoint',done:true}]);
});
