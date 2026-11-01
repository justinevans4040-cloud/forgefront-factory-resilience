import test from 'node:test';
import assert from 'node:assert/strict';
import * as evidence from '../../scripts/public-evidence.mjs';
const evidenceRun=(env)=>evidence.evidenceRun?.(env);
test('evidence run selects a portable numbered destination and rejects traversal',()=>{
 assert.equal(evidenceRun({HACKATHON_EVIDENCE_RUN:'run14'}),'run14');
 assert.equal(evidenceRun({}),'run13');
 for(const value of ['../run14','run14/private','private','run0'])assert.throws(()=>evidenceRun({HACKATHON_EVIDENCE_RUN:value}));
});

