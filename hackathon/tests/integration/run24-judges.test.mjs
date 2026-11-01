import test from 'node:test';import assert from 'node:assert/strict';
import {createApp} from '../../server.mjs';import {publicEnvironment} from '../../scripts/serve-public.mjs';
test('prepared judge mode accepts each environment-only sponsor pool and rejects wrong code',async()=>{
 const pools=[{id:'MetaAI',token:'MetaAI-Judge'},{id:'Baseten',token:'Baseten-Judge'},{id:'Fireworks',token:'Fireworks-Judge'}];
 const accounts=pools.map(p=>({id:p.id,role:'operator',token:p.token}));
 const env=publicEnvironment({HACKATHON_DEMO_MODE:'0',HACKATHON_OPERATORS_JSON:JSON.stringify(accounts),HACKATHON_ADMIN_TOKEN:'Judge-Admin-Access',HACKATHON_STATE_DIR:'unused-test-only'});
 assert.equal(env.HACKATHON_DEMO_MODE,'0');assert.equal(JSON.parse(env.HACKATHON_OPERATORS_JSON).length,3);
 // No persistent key is needed to prove authentication; avoid filesystem state.
 delete env.HACKATHON_LEDGER_KEY;
 const app=createApp({models:{env}}),address=await app.listen(0),base='http://127.0.0.1:'+address.port;
 try{
  assert.equal((await fetch(base+'/api/meta/demo-entry',{method:'POST'})).status,404);
  for(const account of accounts){const response=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer '+account.token}});assert.equal(response.status,200);assert.equal((await response.json()).operator.id,account.id);}
  assert.equal((await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer test-only-wrong-code'}})).status,401);
  assert.equal(publicEnvironment({HACKATHON_STATE_DIR:'unused-test-only'}).HACKATHON_DEMO_MODE,'1');
 }finally{await app.close();}
});
