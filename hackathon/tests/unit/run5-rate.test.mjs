import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClientLimiter} from '../../src/security/client-limit.mjs';
import {createApp} from '../../server.mjs';
test('one client cannot consume another client allowance; forwarded headers cannot rotate identity; windows expire',()=>{
 let now=0;const limit=createClientLimiter({maximum:2,windowMs:1000,now:()=>now});const a={socket:{remoteAddress:'a'},headers:{}},b={socket:{remoteAddress:'b'},headers:{}};
 assert.equal(limit(a).allowed,true);assert.equal(limit(a).allowed,true);a.headers['x-forwarded-for']='spoof';assert.equal(limit(a).allowed,false);assert.equal(limit(b).allowed,true);now=1001;assert.equal(limit(a).allowed,true);
});
test('legacy API routes keep the 240 ceiling while authenticated workflow routes enforce a separate 120 ceiling',async()=>{
 const app=createApp({models:{env:{HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-rate-layers-')),HACKATHON_LEDGER_KEY:'synthetic-ledger',HACKATHON_ADMIN_TOKEN:'synthetic-admin'}}});
 const addr=await app.listen(0);const base=`http://127.0.0.1:${addr.port}`;
 try{
  let scenario;for(let i=0;i<150;i++)scenario=await fetch(base+'/api/scenario');
  assert.equal(scenario.status,401);
  const login=await (await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer synthetic-admin'}})).json();
  const headers={'Content-Type':'application/json','X-Session-Token':login.session,'X-CSRF-Token':login.csrf};
  let workflow;for(let i=0;i<121;i++)workflow=await fetch(base+'/api/workflow/status',{method:'POST',headers,body:'{}'});
  assert.equal(workflow.status,429);assert.ok(Number(workflow.headers.get('Retry-After'))>0);
 }finally{await app.close();}
});
