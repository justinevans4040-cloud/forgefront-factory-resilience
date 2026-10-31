import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { protectDirectory } from '../../src/security/private-directory.mjs';
test('private synthetic state restricts filesystem access before persistence',()=>{
 const directory=mkdtempSync(join(tmpdir(),'ffr-private-'));const result=protectDirectory(directory);assert.equal(result.protected,true);
 if(process.platform==='win32'){const acl=execFileSync('icacls',[directory],{encoding:'utf8',windowsHide:true});assert.doesNotMatch(acl,/Everyone:|BUILTIN\\Users:|Authenticated Users:/i);}else assert.equal(statSync(directory).mode&0o777,0o700);
});
