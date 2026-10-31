import assert from 'node:assert/strict';
import { it } from 'node:test';
import { runSmoke, redact } from '../../scripts/smoke-meta.mjs';

it('checks all providers independently and verifies nonce output', async () => {
  const calls=[];
  const results=await runSmoke({ env: { MUSE_API_KEY:'synthetic-wonder', BASETEN_API_KEY:'synthetic-baseten', FIREWORKS_API_KEY:'synthetic-fireworks' }, fetchImpl:async(url,init)=>{
    calls.push(url); const body=JSON.parse(init.body);
    if (url.includes('baseten')) assert.ok(body.max_tokens >= 1024, 'reasoning model needs room for reasoning and final output');
    const prompt=body.input ?? body.messages[0].content;
    const token=prompt.match(/SMOKE_OK_[a-f0-9]+/)[0];
    return {ok:true, text:async()=>JSON.stringify({model:body.model, output_text:token, choices:[{message:{content:token}}]})};
  }});
  assert.equal(calls.length,3); assert.ok(results.every(r=>r.passed));
});
it('records missing credentials as blocked without invoking fetch',async()=>{
  const results=await runSmoke({env:{},fetchImpl:()=>{throw Error('must not call');}});
  assert.equal(results.length,3); assert.ok(results.every(r=>r.status==='BLOCKED'&&!r.passed));
});
it('redacts exact credentials even when echoed without a recognizable prefix',()=>{
  assert.equal(redact('echo opaque-secret', {BASETEN_API_KEY:'opaque-secret'}),'echo [REDACTED]');
});
it('does not treat HTTP success with incorrect output as passing',async()=>{
  const results=await runSmoke({env:{MUSE_API_KEY:'synthetic'},fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({model:'muse-wonder-1.0',output_text:'wrong'})})});
  assert.equal(results[0].status,'FAIL');
});
