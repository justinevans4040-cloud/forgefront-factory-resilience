import test from 'node:test';import assert from 'node:assert/strict';
import {openingStakes,certificateComparison} from '../../public/factory-layout.mjs';
test('opening quantity gap includes every comparable record',()=>{
 const state={snapshot:{jobs:[],incident:{heldMaterialId:'m'}},analysis:{impacted:{impactedUnits:0,impactedJobCount:0}},evidence:[120,80,10,160].map(value=>({quantity:{value,unit:'each'},source:{field:'quantity'}}))};
 assert.equal(openingStakes(state).quantityGap,150);assert.equal(certificateComparison(state.evidence,420).widths.length,4);
});
