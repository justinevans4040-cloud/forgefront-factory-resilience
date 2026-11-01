import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkJudgePitch} from '../../scripts/judge-check.mjs';
test('judge pitch rejects setup and jargon and requires the owner presentation order',()=>{
 for(const text of ['npm run demo','MUSE_API_KEY','Run locally','consent phrase','tamper-evident ledger','encrypted evidence packet','independent checkpoint'])assert.ok(checkJudgePitch(text).length,text);
 for(const file of ['../../../README.md','../../README.md'])assert.deepEqual(checkJudgePitch(readFileSync(new URL(file,import.meta.url),'utf8')),[],file);
});
