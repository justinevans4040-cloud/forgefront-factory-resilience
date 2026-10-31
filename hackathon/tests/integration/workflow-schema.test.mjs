import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('workflow request schemas reject null, arrays, unknown fields and wrong field types before transitions',async()=>{
 const app=createApp({models:{env:{HACKATHON_ADMIN_TOKEN:'synthetic-admin',HACKATHON_LEDGER_KEY:'synthetic-ledger',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-schema-'))}}});const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
 try{
 const session=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer synthetic-admin'}}).then(r=>r.json());const headers={'Content-Type':'application/json','X-Session-Token':session.session,'X-CSRF-Token':session.csrf};
 for(const [action,body]of [['review',null],['status',[]],['status',{operator:'invented'}],['shock',{cellId:42}],['confirm',{nonce:'x',typed:{approve:true}}],['investigation-status',{jobId:'x'.repeat(200)}]]){
 const r=await fetch(base+'/api/workflow/'+action,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(r.status,400,action);
 }
 const status=await fetch(base+'/api/workflow/status',{method:'POST',headers,body:'{}'}).then(r=>r.json());assert.equal(status.ledger.count,0);
 }finally{await app.close();}
});
