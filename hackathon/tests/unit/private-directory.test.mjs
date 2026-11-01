import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { protectDirectory } from '../../src/security/private-directory.mjs';
test('private synthetic state restricts filesystem access before persistence',()=>{
 const directory=mkdtempSync(join(tmpdir(),'ffr-private-'));
 try{
  const result=protectDirectory(directory);assert.equal(result.protected,true);
  if(process.platform==='win32'){const acl=execFileSync('icacls',[directory],{encoding:'utf8',windowsHide:true});assert.doesNotMatch(acl,/Everyone:|BUILTIN\\Users:|Authenticated Users:/i);}else assert.equal(statSync(directory).mode&0o777,0o700);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('private directory continues when chmod is refused by the host',()=>{
 const directory=mkdtempSync(join(tmpdir(),'ffr-private-eperm-'));
 try{
  const result=protectDirectory(directory,{chmodSync:()=>{const error=new Error('operation not permitted');error.code='EPERM';throw error;}});
  assert.equal(result.protected,true);
  if(process.platform==='win32')assert.equal(result.mechanism,'WINDOWS_OWNER_SYSTEM_ACL');
  else{assert.equal(result.mechanism,'POSIX_CREATED_NO_CHMOD');assert.equal(result.warning,'EPERM');}
 }finally{rmSync(directory,{recursive:true,force:true});}
});
