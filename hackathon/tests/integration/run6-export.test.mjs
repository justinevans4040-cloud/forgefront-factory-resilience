import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createApp} from '../../server.mjs';
test('encrypted export requires session, accepts auditor and never needs plaintext acknowledgement',async()=>{
 const env={HACKATHON_LEDGER_KEY:'synthetic-ledger',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-export-')),HACKATHON_OPERATORS_JSON:JSON.stringify([{id:'reader',role:'auditor',token:'synthetic-auditor'}])};
 const app=createApp({models:{env}});const addr=await app.listen(0);const base=`http://127.0.0.1:${addr.port}`;
 try{
  const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await post('/api/workflow/encrypted-export',{passphrase:'synthetic passphrase long'})).status,401);
  const login=await (await post('/api/meta/session',{}, {Authorization:'Bearer synthetic-auditor'})).json();const headers={'X-Session-Token':login.session,'X-CSRF-Token':login.csrf};
  const response=await post('/api/workflow/encrypted-export',{passphrase:'synthetic passphrase long'},headers);assert.equal(response.status,200);
  const envelope=await response.json();assert.equal(envelope.format,'FFR_ENCRYPTED_EXPORT_V1');assert.equal(envelope.kdf,'scrypt-N16384-r8-p1');
  assert.ok(!JSON.stringify(envelope).includes('events'));
  assert.equal((await post('/api/workflow/encrypted-export',{passphrase:'short'},headers)).status,400);
  for(const passphrase of ['aaaaaaaaaaaaaaaa','passwordpasswordpassword','one one one one one'])assert.equal((await post('/api/workflow/encrypted-export',{passphrase},headers)).status,400);
  assert.equal((await post('/api/workflow/export',{},headers)).status,400);
  assert.equal((await post('/api/workflow/export',{acknowledgePlaintext:'EXPORT PLAINTEXT'},headers)).status,200);
 }finally{await app.close();}
});
