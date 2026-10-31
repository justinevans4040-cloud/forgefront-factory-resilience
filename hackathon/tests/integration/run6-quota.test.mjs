import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createApp} from '../../server.mjs';
test('normal startup preserves exhausted login quota across server restart with Retry-After',async()=>{
 const env={HACKATHON_LEDGER_KEY:'synthetic-ledger',HACKATHON_ADMIN_TOKEN:'synthetic-admin',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-restart-quota-'))};
 let app=createApp({models:{env}});let address=await app.listen(0);
 try{for(let i=0;i<12;i++)assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/meta/session`,{method:'POST',headers:{Authorization:'Bearer invalid'}})).status,401);}finally{await app.close();}
 app=createApp({models:{env}});address=await app.listen(0);
 try{const response=await fetch(`http://127.0.0.1:${address.port}/api/meta/session`,{method:'POST',headers:{Authorization:'Bearer synthetic-admin'}});assert.equal(response.status,429);assert.ok(Number(response.headers.get('Retry-After'))>0);}finally{await app.close();}
});
