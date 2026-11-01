import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

test('workflow unit tests remove the temporary directories they create',()=>{
 const source=readFileSync(fileURLToPath(new URL('./workflow.test.mjs',import.meta.url)),'utf8');
 assert.match(source,/after\s*\(\s*\(\)\s*=>\s*\{[\s\S]*rmSync\(/);
 assert.match(source,/mkdtempSync\(join\(tmpdir\(\),'ffr-workflow-'/);
});
