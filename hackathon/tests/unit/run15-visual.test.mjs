import test from 'node:test';
import assert from 'node:assert/strict';
import {focusResult} from '../../public/command-center.mjs';
test('focus reveals the nearest result without scrolling its inspector heading away',()=>{
 let scroll;
 const element={matches:()=>true,classList:{add(){}},scrollIntoView:options=>{scroll=options;},focus(){}};
 focusResult('typed',{document:{getElementById:()=>element,querySelectorAll:()=>[]},reducedMotion:true});
 assert.equal(scroll.block,'nearest');
 assert.equal(scroll.inline,'nearest');
});

test('outage preview distinguishes selected online machine from applied offline state',async()=>{
 const {capacityStatus}=await import('../../public/command-center.mjs');
 assert.equal(capacityStatus({cellId:'m2',online:true},'m2'),'PREVIEW: WILL GO OFFLINE');
 assert.equal(capacityStatus({cellId:'m1',online:true},'m2'),'ONLINE');
 assert.equal(capacityStatus({cellId:'m2',online:false},''),'OFFLINE');
});
