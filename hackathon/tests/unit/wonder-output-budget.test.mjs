import test from 'node:test';
import assert from 'node:assert/strict';
import {createWonderClient} from '../../src/models/wonder.mjs';
test('Wonder applies the caller output budget and disables remote storage',async()=>{
 const payloads=[];const client=createWonderClient({env:{MUSE_API_KEY:'test-only-not-a-secret'},fetchImpl:async(_url,init)=>{payloads.push(JSON.parse(init.body));return {ok:true,text:async()=>JSON.stringify({model:'muse-wonder-1.0',output_text:'{}'})};}});
 await client.complete({prompt:'Source-bound tradeoff',maxTokens:2048});
 await client.complete({prompt:'Source-bound board',maxTokens:8192});
 assert.deepEqual(payloads.map(p=>p.max_output_tokens),[2048,8192]);
 assert.ok(payloads.every(p=>p.store===false));
});
