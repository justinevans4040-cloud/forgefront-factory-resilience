import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createApp } from '../../server.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('authenticates Meta requests, enforces CSRF and origin, and returns provider text',async()=>{
  let calls=0;
  const app=createApp({models:{env:{HACKATHON_ADMIN_TOKEN:'synthetic-admin',MUSE_API_KEY:'synthetic-wonder',HACKATHON_LEDGER_KEY:'test-ledger-ok',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-diagnostic-'))},fetchImpl:async()=>{calls++;return {ok:true,text:async()=>JSON.stringify({model:'muse-wonder-1.0',output_text:'Live-shaped synthetic-wonder response'})};}}});
  const address=await app.listen(0); const base=`http://127.0.0.1:${address.port}`;
  const post=(path,body={},headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  try {
    assert.equal((await post('/api/meta/respond')).status,401);
    assert.equal((await post('/api/meta/session')).status,401);
    const login=await post('/api/meta/session',{}, {Authorization:'Bearer synthetic-admin'});
    const {session,csrf}=await login.json();assert.ok(session&&csrf);
    const headers={'X-Session-Token':session,'X-CSRF-Token':csrf};
    assert.equal((await post('/api/meta/respond',{provider:'wonder',prompt:'hello'},{...headers,Origin:'https://attacker.invalid'})).status,403);
    assert.equal((await post('/api/meta/respond',{provider:'wonder',prompt:'hello'},{'X-Session-Token':session})).status,403);
    assert.equal((await post('/api/meta/respond',{provider:'other',prompt:'hello'},headers)).status,400);
    const response=await post('/api/meta/respond',{provider:'wonder',prompt:'hello'},headers);
    assert.equal(response.status,200); const result=await response.json();
    assert.equal(result.text,'Live-shaped [REDACTED] response');assert.equal(result.operationalRelease,false);
    assert.equal(result.validation,'UNVALIDATED_MODEL_OUTPUT');assert.equal(calls,1);
    assert.equal((await post('/api/meta/respond',{provider:'fireworks',prompt:'hello'},headers)).status,503);
  } finally {await app.close();}
});
