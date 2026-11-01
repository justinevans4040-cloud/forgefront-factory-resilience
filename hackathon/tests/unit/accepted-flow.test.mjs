import test from 'node:test';
import assert from 'node:assert/strict';
import * as layout from '../../public/factory-layout.mjs';
test('accepted flow keeps machine hours separate from part demand and uses actual cells',()=>{
 assert.equal(typeof layout.acceptedFlow,'function');
 assert.deepEqual(layout.acceptedFlow({detail:{materialId:'MAT-C',allocations:[{cellId:'CELL-A',hours:12},{cellId:'CELL-B',hours:9}]}},41),{parts:41,materials:['MAT-C'],assignments:[{cellId:'CELL-A',hours:12},{cellId:'CELL-B',hours:9}]});
 assert.deepEqual(layout.acceptedFlow({detail:{draws:[{materialId:'MAT-D',cells:[{cellId:'CELL-B',hours:4}]},{materialId:'MAT-E',cells:[{cellId:'CELL-B',hours:7}]}]}},20),{parts:20,materials:['MAT-D','MAT-E'],assignments:[{cellId:'CELL-B',hours:11}]});
 assert.deepEqual(layout.acceptedFlow({detail:{}},8),{parts:8,materials:[],assignments:[]});
});
