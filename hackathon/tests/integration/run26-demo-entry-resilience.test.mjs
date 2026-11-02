import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server.mjs';
import {createStateCodec} from '../../src/security/state-codec.mjs';

test('demo-entry stays available after quota corruption and full session table',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'ffr-demo-entry-'));
 const key='synthetic-ledger-key-for-demo-entry';
 const codec=createStateCodec(key);
 writeFileSync(join(directory,'quota-login.json'),codec.encode({maximum:12,windowMs:60000,clients:[['not-a-hash',{start:1,count:1}]]},'client-quota'));
 const env={HACKATHON_DEMO_MODE:'1',HACKATHON_ADMIN_TOKEN:'synthetic-admin-token',HACKATHON_LEDGER_KEY:key,HACKATHON_STATE_DIR:directory,HACKATHON_OPERATORS_JSON:''};
 const app=createApp({models:{env,fetchImpl:async()=>{throw Error('No network');}}});
 const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
 try{
  for(let i=0;i<105;i++){
   const response=await fetch(base+'/api/meta/demo-entry',{method:'POST'});
   assert.equal(response.status,200,'demo-entry must not 500 at attempt '+i);
   const body=await response.json();
   assert.equal(typeof body.session,'string');
   assert.equal(typeof body.csrf,'string');
  }
 }finally{await app.close();rmSync(directory,{recursive:true,force:true});}
});
