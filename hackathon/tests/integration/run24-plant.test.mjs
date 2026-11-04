import test from 'node:test';import assert from 'node:assert/strict';
import {createApp} from '../../server.mjs';
test('full shop source requires session and CSRF and is served without a model call',async()=>{
 const app=createApp({models:{env:{HACKATHON_DEMO_MODE:'1',HACKATHON_ADMIN_TOKEN:'test-only-admin-code'},fetchImpl:async()=>{throw Error('Unexpected inference');}}});const address=await app.listen(0),base='http://127.0.0.1:'+address.port;
 try{
  assert.equal((await fetch(base+'/api/plant')).status,401);
  const session=await(await fetch(base+'/api/meta/demo-entry',{method:'POST'})).json();
  assert.equal((await fetch(base+'/api/plant',{headers:{'X-Session-Token':session.session}})).status,403);
  const response=await fetch(base+'/api/plant',{headers:{'X-Session-Token':session.session,'X-CSRF-Token':session.csrf}});assert.equal(response.status,200);const p=await response.json();assert.equal(p.machines.length,45);
  for(const file of ['plant-engine.mjs','ui/kit.mjs','ui/screen-shop.mjs','ui/screen-shop.css'])assert.equal((await fetch(base+'/'+file)).status,200,file);
 }finally{await app.close();}
});
