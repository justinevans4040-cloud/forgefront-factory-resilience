import test from 'node:test';
import assert from 'node:assert/strict';
import * as layout from '../../public/factory-layout.mjs';
test('opening stakes follow affected demand, due windows and source discrepancy',()=>{
 const state={analysis:{impacted:{impactedUnits:93,impactedJobCount:3}},snapshot:{incident:{heldMaterialId:'held'},jobs:[{materialId:'held',dueHours:21},{materialId:'other',dueHours:2}]},evidence:[{quantity:{value:140},source:{field:'quantity'}},{quantity:{value:90},source:{field:'quantity'}}]};
 assert.deepEqual(layout.openingStakes(state),{parts:93,orders:3,dueHours:21,quantityGap:50});
 state.snapshot.jobs=[];state.evidence=[];assert.equal(layout.openingStakes(state).dueHours,null);assert.equal(layout.openingStakes(state).quantityGap,0);
});

