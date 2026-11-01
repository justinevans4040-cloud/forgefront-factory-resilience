import test from 'node:test';import assert from 'node:assert/strict';
import {validateDraft} from '../../src/recovery-board.mjs';
test('board validates plant-sized task graphs without count or two-digit ID ceilings',()=>{
 const context={snapshotDigest:'plant',option:{optionId:'route',finishHours:10000,evidenceIds:['source']},owner:'operator',shockHours:0};
 const tasks=Array.from({length:5000},(_,i)=>({id:'t'+(i+1),title:'Recover operation '+(i+1),owner:'operator',dueHours:i+1,dependsOn:i?['t'+i]:[],evidenceIds:['source']}));
 assert.equal(validateDraft({summary:'Plant recovery',tasks},context).tasks.length,5000);
 tasks[0].dependsOn=['t5000'];assert.throws(()=>validateDraft({summary:'Plant recovery',tasks},context),/CYCLE|DEADLINE/);
});
