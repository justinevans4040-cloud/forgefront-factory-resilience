import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {cleanupSmokeScratch} from '../../scripts/smoke-cleanup.mjs';
test('smoke cleanup removes only the explicitly owned temporary directory',async()=>{
 const owned=mkdtempSync(join(tmpdir(),'ffr-ui-smoke-'));
 mkdirSync(join(owned,'browser'));
 await assert.rejects(()=>cleanupSmokeScratch(tmpdir()),/Refuse/);
 await assert.rejects(()=>cleanupSmokeScratch(join(tmpdir(),'unowned')),/Refuse/);
 await assert.rejects(()=>cleanupSmokeScratch(join(tmpdir(),'ffr-ui-smoke-other','nested')),/Refuse/);
 await cleanupSmokeScratch(owned);
 assert.equal(existsSync(owned),false);
});
