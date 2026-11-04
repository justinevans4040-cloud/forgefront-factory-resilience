import test from 'node:test';
import assert from 'node:assert/strict';
import {certificateComparison, completionStatus} from '../../public/factory-layout.mjs';
import {designIteration} from '../../scripts/design-director.mjs';

test('certificate comparison scales source quantities and isolates the disputed segment',()=>{
 const evidence=[120,80].map(value=>({quantity:{value},source:{field:'quantity'}}));
 assert.deepEqual(certificateComparison(evidence,420),{widths:[420,280],mismatchStart:280,mismatchWidth:140});
 assert.deepEqual(certificateComparison(evidence.toReversed(),300),{widths:[200,300],mismatchStart:200,mismatchWidth:100});
 assert.deepEqual(certificateComparison([],420),{widths:[],mismatchStart:0,mismatchWidth:0});
 assert.equal(certificateComparison([evidence[0],evidence[0]],420).mismatchWidth,0);
});

test('completion summary uses the actual offline machines and ledger count',()=>{
 assert.equal(completionStatus({ledger:{count:27},snapshot:{cells:[{cellId:'CELL-LATHE-3',online:false},{cellId:'CELL-MILL-2',online:true}]}}),'PACKET SEALED · 27 events · revised plan accepted · CELL-LATHE-3 offline retained');
 assert.match(completionStatus({ledger:{count:4},snapshot:{cells:[]}}),/all cells online/);
});

test('design iteration identifiers support continued honest review beyond thirty',()=>{
 assert.equal(designIteration('31'),31);
 for(const input of ['0','-1','1.5','Infinity','junk'])assert.throws(()=>designIteration(input),/Invalid iteration/);
});
