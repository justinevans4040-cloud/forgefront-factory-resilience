import test from 'node:test';
import assert from 'node:assert/strict';
test('investigation choreography distinguishes empty, pending, slow, complete and stopped without invented progress',async()=>{
 const {investigationStatus}=await import('../../public/investigation-status.mjs');
 assert.match(investigationStatus({phase:'empty'}),/Choose a route/);
 assert.match(investigationStatus({phase:'running',elapsedMs:2000,route:'Muse Wonder'}),/2s.*Waiting/);
 assert.match(investigationStatus({phase:'running',elapsedMs:15000,route:'Muse Wonder'}),/15s.*Still waiting.*No automatic retry/);
 assert.match(investigationStatus({phase:'failed',route:'Muse Wonder'}),/Stopped.*retry explicitly/);
 assert.match(investigationStatus({phase:'complete'}),/Ready for review/);
});
