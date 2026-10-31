import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('one-command demo cold starts without persisted configuration and stops cleanly',async()=>{
 const child=spawn(process.execPath,[fileURLToPath(new URL('../../scripts/rehearse.mjs',import.meta.url))],{env:{...process.env,HACKATHON_DEMO_PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let output='';child.stdout.on('data',chunk=>output+=chunk);let timer;
 try{await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('cold start timed out')),15000);child.stdout.on('data',()=>{if(output.includes('No model runs'))resolve();});child.on('exit',()=>reject(Error('demo exited early')));});const base=output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/Meta/);assert.ok(!output.includes('undefined'));}finally{clearTimeout(timer);child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));}
});

