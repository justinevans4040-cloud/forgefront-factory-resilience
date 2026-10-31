import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
test('single-command demo entry exposes actual loopback URL and readiness without starting AI, then stops',async()=>{
 const child=spawn(process.execPath,['scripts/rehearse.mjs'],{cwd:fileURLToPath(new URL('../../',import.meta.url)),env:{...process.env,HACKATHON_DEMO_PORT:'0',MUSE_API_KEY:'',MODEL_API_KEY:'',BASETEN_API_KEY:'',FIREWORKS_API_KEY:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
 const closed=once(child,'close');let output='';child.stdout.on('data',d=>output+=d.toString());
 try{
 const deadline=Date.now()+10000;while(!output.includes('No model runs until')&&Date.now()<deadline)await new Promise(r=>setTimeout(r,30));
 assert.match(output,/Muse Wonder.*KEY UNAVAILABLE/);assert.match(output,/Muse Spark Open.*KEY UNAVAILABLE/);const base=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];assert.ok(base);
 assert.equal((await fetch(base+'/health')).status,200);assert.equal((await fetch(base)).status,200);
 }finally{child.kill();await closed;}
});
