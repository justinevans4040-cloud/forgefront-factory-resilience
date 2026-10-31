import { createModelClient } from '../../src/models/client.mjs';
import assert from 'node:assert/strict';
import { it } from 'node:test';
it('rejects arbitrary Spark endpoints and model overrides before network access',()=>{
 assert.throws(()=>createModelClient('spark-open',{apiKey:'synthetic',route:{provider:'other',model:'other',endpoint:'https://attacker.invalid'}}),/allowlisted/);
});
for(const kind of ['wonder','spark-open']) it(`${kind} preserves absent provider identity as unknown`,async()=>{
 const client=createModelClient(kind,{env:{MUSE_API_KEY:'synthetic',BASETEN_API_KEY:'synthetic'},fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({output_text:'hello',choices:[{message:{content:'hello'}}]})})});
 assert.equal((await client.complete({prompt:'hello'})).modelId,null);
});
