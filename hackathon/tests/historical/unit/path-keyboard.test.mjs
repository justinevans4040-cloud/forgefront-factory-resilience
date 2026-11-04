import test from 'node:test';
import assert from 'node:assert/strict';
import * as layout from '../../public/factory-layout.mjs';
test('path keyboard navigation wraps feasible options and skips constrained ones',()=>{
 const options=[{optionId:'wait',feasible:true},{optionId:'sub',feasible:true},{optionId:'split',feasible:false}];
 assert.equal(layout.adjacentPath(options,'wait',-1),'sub');assert.equal(layout.adjacentPath(options,'sub',1),'wait');assert.equal(layout.adjacentPath(options,'split',1),'wait');assert.equal(layout.adjacentPath([],null,1),null);
});
