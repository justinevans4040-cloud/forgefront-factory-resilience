import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encryptPacket,decryptPacket} from '../../src/security/export-codec.mjs';
test('portable encrypted export round trips independently and rejects wrong password or altered ciphertext',async()=>{
 const packet={label:'SYNTHETIC',secret:'synthetic decision history',operationalRelease:false};
 const password='synthetic export passphrase';const a=await encryptPacket(packet,password),b=await encryptPacket(packet,password);
 assert.equal(a.format,'FFR_ENCRYPTED_EXPORT_V1');assert.equal(a.kdf,'scrypt-N16384-r8-p1');assert.ok(!JSON.stringify(a).includes(packet.secret));assert.notEqual(a.data,b.data);assert.deepEqual(await decryptPacket(a,password),packet);
 await assert.rejects(decryptPacket(a,'wrong long passphrase'));await assert.rejects(encryptPacket(packet,'short'),/16/);
 const altered={...a,data:Buffer.from('tampered').toString('base64')};await assert.rejects(decryptPacket(altered,password));
 await assert.rejects(decryptPacket({...a,iterations:1},password));
 await assert.rejects(decryptPacket({...a,kdf:'scrypt-N1024-r8-p1'},password),/INVALID_ENCRYPTED_EXPORT/);
});

test('offline decoder creates plaintext only at a new destination and never echoes a passphrase',async()=>{
 const {mkdtempSync,writeFileSync,readFileSync,existsSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const directory=mkdtempSync(join(tmpdir(),'ffr-decode-')),source=join(directory,'encrypted.json'),output=join(directory,'packet.json');
 const passphrase='synthetic portable passphrase';writeFileSync(source,JSON.stringify(await encryptPacket({synthetic:true,operationalRelease:false},passphrase)));
 const invoke=(password,destination)=>spawnSync(process.execPath,['scripts/decrypt-export.mjs',source,destination],{cwd:new URL('../../',import.meta.url),encoding:'utf8',env:{...process.env,FFR_EXPORT_PASSPHRASE:password}});
 const success=invoke(passphrase,output);assert.equal(success.status,0);assert.equal(JSON.parse(readFileSync(output,'utf8')).operationalRelease,false);assert.ok(!success.stdout.includes(passphrase));
 assert.equal(invoke(passphrase,output).status,1);const denied=join(directory,'denied.json');const failure=invoke('wrong synthetic passphrase',denied);assert.equal(failure.status,1);assert.equal(existsSync(denied),false);assert.ok(!failure.stderr.includes(passphrase));
});
