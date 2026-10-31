import { mkdtempSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const binary=process.argv[2]||process.env.GITLEAKS_PATH;if(!binary)throw Error('Supply the gitleaks executable path');
const config=fileURLToPath(new URL('../gitleaks.toml',import.meta.url));
const empty='LEDGER_KEY_PATH=\nLEDGER_NOTARY_SECRET=\nLEDGER_NOTARY_SECRET_PATH=\nLEDGER_VERIFY_INTERVAL_MS=\n';
const cases=[['empty-template','.env.example',empty,0],['nonempty-template','.env.example',empty+'MUSE_API_KEY='+randomBytes(32).toString('hex')+'\n',1],['other-file','fixture.txt','MUSE_API_KEY='+randomBytes(32).toString('hex')+'\n',1]];const results=[];
for(const [name,file,contents,expected]of cases){
 const dir=mkdtempSync(join(tmpdir(),'ffr-scan-fixture-'));writeFileSync(join(dir,file),contents);
 const result=spawnSync(binary,['detect','--no-git','--source',dir,'--config',config,'--redact'],{encoding:'utf8',windowsHide:true});
 assert.equal(result.status,expected,name);results.push({case:name,expectedExit:expected,observedExit:result.status,ok:true});
}
console.log(JSON.stringify({ok:true,cases:results,fixtures:'synthetic random detector inputs only; no live credentials; scratch retained'}));
