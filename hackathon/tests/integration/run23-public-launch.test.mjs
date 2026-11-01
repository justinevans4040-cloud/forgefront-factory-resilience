import {test} from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startPublicServer,publicEnvironment} from '../../scripts/serve-public.mjs';

test('public launcher binds PORT on all interfaces, retains configured state and removes standby credentials',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'ffr-public-launch-'));
 const env={PORT:'0',RENDER:'true',RENDER_EXTERNAL_HOSTNAME:'factory.example.invalid',HACKATHON_STATE_DIR:directory,HACKATHON_LEDGER_KEY:'synthetic-public-key',HACKATHON_ADMIN_TOKEN:'synthetic-public-admin',HACKATHON_OPERATORS_JSON:'invalid',FIREWORKS_API_KEY:'never-call-standby'};
 let calls=0;let launched;
 try{
  const clean=publicEnvironment(env);assert.equal(clean.FIREWORKS_API_KEY,undefined);assert.equal(clean.HACKATHON_OPERATORS_JSON,'');assert.equal(clean.HACKATHON_LEDGER_KEY,env.HACKATHON_LEDGER_KEY);assert.equal(clean.HACKATHON_DEMO_MODE,'1');
  launched=await startPublicServer({env,fetchImpl:async()=>{calls++;throw Error('Unexpected provider call');}});
  assert.equal(launched.address.address,'0.0.0.0');assert.ok(launched.address.port>0);
  const base=`http://127.0.0.1:${launched.address.port}`;
  assert.equal((await fetch(base+'/healthz')).status,200);
  const response=await new Promise((resolve,reject)=>{const request=http.request({hostname:'127.0.0.1',port:launched.address.port,path:'/api/meta/demo-entry',method:'POST',headers:{Host:'factory.example.invalid',Origin:'https://factory.example.invalid','X-Forwarded-Proto':'https'}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});request.on('error',reject);request.end();});
  assert.equal(response.status,200,response.body);assert.match(response.headers['set-cookie'][0],/Secure/);
  const entry=JSON.parse(response.body);const r=await fetch(base+'/api/workflow/investigate',{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':entry.session,'X-CSRF-Token':entry.csrf},body:JSON.stringify({provider:'fireworks'})});
  assert.equal(r.status,400);assert.equal(calls,0);
 }finally{await launched?.app.close();rmSync(directory,{recursive:true,force:true});}
});
test('Render service configuration names secrets without embedding values',()=>{
 const yaml=readFileSync(new URL('../../../render.yaml',import.meta.url),'utf8');
 for(const key of ['MUSE_API_KEY','BASETEN_API_KEY','HACKATHON_LEDGER_KEY','HACKATHON_ADMIN_TOKEN'])assert.match(yaml,new RegExp('key: '+key+'\\s+sync: false'));
 assert.match(yaml,/rootDir: hackathon/);assert.match(yaml,/branch: submission/);assert.match(yaml,/startCommand: npm run serve:public/);assert.match(yaml,/healthCheckPath: \/healthz/);
 assert.match(yaml,/name: forgefront-state/);
 assert.match(yaml,/mountPath: \/var\/data\b/);
 assert.match(yaml,/HACKATHON_STATE_DIR[\s\S]*value: \/var\/data\/forgefront/);
});
test('public launcher starts when state directory cannot be chmod locked',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'ffr-public-nochmod-'));
 const {protectDirectory}=await import('../../src/security/private-directory.mjs');
 const blocked=protectDirectory(directory,{chmodSync:()=>{const error=new Error('operation not permitted');error.code='EPERM';throw error;}});
 assert.equal(blocked.mechanism,process.platform==='win32'?'WINDOWS_OWNER_SYSTEM_ACL':'POSIX_CREATED_NO_CHMOD');
 let launched;
 try{
  launched=await startPublicServer({env:{PORT:'0',HACKATHON_STATE_DIR:directory,HACKATHON_LEDGER_KEY:'synthetic-public-key',HACKATHON_ADMIN_TOKEN:'synthetic-public-admin',FIREWORKS_API_KEY:'never-call'},fetchImpl:async()=>{throw Error('Unexpected provider call');}});
  assert.equal((await fetch(`http://127.0.0.1:${launched.address.port}/healthz`)).status,200);
 }finally{await launched?.app.close();rmSync(directory,{recursive:true,force:true});}
});
