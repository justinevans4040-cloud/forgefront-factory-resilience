import test from 'node:test';import assert from 'node:assert/strict';
import {entityCaps,auditPlantCaps} from '../../scripts/plant-cap-audit.mjs';
test('entity cap regression gate rejects numeric plant truncation and task ceilings',()=>{
 for(const source of ['machines.slice(0,50)','state.evidence.filter(e=>e.quantity).slice(0,2)','memory.filter(e=>e.scope).slice(-6)','tasks.length>12','final.claims.length<=100'])assert.ok(entityCaps(source).length,source);
 assert.deepEqual(entityCaps('buffer.slice(0,3); const timeout=Math.min(remaining,60000);'),[]);
 assert.deepEqual(auditPlantCaps(),[]);
});
