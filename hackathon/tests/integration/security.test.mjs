import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server.mjs';
test('HTML grants no seat, every data route is protected, and wrong-port origins fail',async()=>{
 const app=createApp({models:{env:{HACKATHON_ADMIN_TOKEN:'test-admin-ok'}}});const a=await app.listen(0);const base=`http://127.0.0.1:${a.port}`;
 try{
 assert.equal((await fetch(base)).status,200);
 for(const path of ['/api/scenario','/api/analysis','/api/tools'])assert.equal((await fetch(base+path)).status,401);
 assert.equal((await fetch(base+'/api/meta/session',{method:'POST'})).status,401);
 const login=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer test-admin-ok'}});const s=await login.json();const headers={'X-Session-Token':s.session,'X-CSRF-Token':s.csrf};
 assert.equal((await fetch(base+'/api/scenario',{headers:{...headers,Origin:'http://127.0.0.1:1'}})).status,403);
 assert.equal((await fetch(base+'/api/tools/invoke',{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await fetch(base+'/api/scenario',{headers})).status,200);
 }finally{await app.close();}
});
test('API attempts are rate limited with Retry-After',async()=>{
 const app=createApp({models:{env:{}}});const a=await app.listen(0);const base=`http://127.0.0.1:${a.port}`;
 try{let response;for(let i=0;i<245;i++)response=await fetch(base+'/api/scenario');assert.equal(response.status,429);assert.ok(response.headers.get('Retry-After'));}finally{await app.close();}
});
test('live Meta routes fail closed without keys and never return sample bodies',async()=>{
 const {mkdtempSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const app=createApp({models:{env:{HACKATHON_ADMIN_TOKEN:'test-admin-ok',HACKATHON_LEDGER_KEY:'test-ledger-ok',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-sec-'))}}});
 const a=await app.listen(0);const base=`http://127.0.0.1:${a.port}`;
 try{
  const login=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer test-admin-ok'}});const s=await login.json();
  const headers={'Content-Type':'application/json','X-Session-Token':s.session,'X-CSRF-Token':s.csrf};
  for(const provider of ['wonder','baseten','fireworks']){
   const missing=await fetch(base+'/api/workflow/investigate',{method:'POST',headers,body:JSON.stringify({provider})});
   assert.equal(missing.status,503);const missingBody=await missing.json();
   assert.match(missingBody.error.message,/API_KEY/);
   assert.equal(missingBody.sample,undefined);assert.equal(missingBody.mode,undefined);assert.equal(missingBody.text,undefined);
  }
 }finally{await app.close();}
});
