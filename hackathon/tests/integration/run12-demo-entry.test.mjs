import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../../server.mjs';

test('demo entry opens a session without a token only when demo mode is enabled',async()=>{
 const env={HACKATHON_ADMIN_TOKEN:'synthetic-admin-token',HACKATHON_LEDGER_KEY:'synthetic-ledger-key',HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-demo-entry-')),HACKATHON_DEMO_MODE:'1'};
 const app=createApp({models:{env}});const addr=await app.listen(0);const base=`http://127.0.0.1:${addr.port}`;
 try{
  const denied=createApp({models:{env:{...env,HACKATHON_DEMO_MODE:undefined}}});const deniedAddr=await denied.listen(0);
  try{
   const blocked=await fetch(`http://127.0.0.1:${deniedAddr.port}/api/meta/demo-entry`,{method:'POST',headers:{'Content-Type':'application/json','Origin':`http://127.0.0.1:${deniedAddr.port}`},body:'{}'});
   assert.equal(blocked.status,404);
  }finally{denied.server.closeAllConnections();await denied.close();}
  const open=await fetch(base+'/api/meta/demo-entry',{method:'POST',headers:{'Content-Type':'application/json','Origin':base},body:'{}'});
  assert.equal(open.status,200);
  const session=await open.json();
  assert.equal(session.demo,true);
  assert.equal(session.operator.role,'admin');
  assert.ok(session.csrf);
  const status=await fetch(base+'/api/workflow/status',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf,'Cookie':`ffr_session=${session.session}`,'Origin':base},body:'{}'});
  assert.equal(status.status,200);
  const body=await status.json();
  assert.ok(body.snapshot?.snapshotDigest);
  assert.equal(body.operator.role,'admin');
 }finally{app.server.closeAllConnections();await app.close();}
});

test('demo rehearse announces the room without printing a sign-in token',async()=>{
 const {spawn}=await import('node:child_process');
 const {once}=await import('node:events');
 const {fileURLToPath}=await import('node:url');
 const child=spawn(process.execPath,['scripts/rehearse.mjs'],{cwd:fileURLToPath(new URL('../../',import.meta.url)),env:{...process.env,HACKATHON_DEMO_PORT:'0',MUSE_API_KEY:'',MODEL_API_KEY:'',BASETEN_API_KEY:'',FIREWORKS_API_KEY:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
 const closed=once(child,'close');let output='';child.stdout.on('data',d=>output+=d.toString());
 try{
  const deadline=Date.now()+10000;while(!output.includes('No model runs until')&&Date.now()<deadline)await new Promise(r=>setTimeout(r,30));
  const base=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];assert.ok(base);
  assert.doesNotMatch(output,/Operator test token|synthetic-browser-rehearsal|rehearsal token/i);
  assert.match(output,/opens straight into the recovery room/i);
  const page=await (await fetch(base)).text();
  assert.doesNotMatch(page,/synthetic-browser-rehearsal/);
  const entry=await fetch(base+'/api/meta/demo-entry',{method:'POST',headers:{'Content-Type':'application/json','Origin':base},body:'{}'});
  assert.equal(entry.status,200);
 }finally{child.kill();await closed;}
});
