import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const read=rel=>readFileSync(new URL(rel,import.meta.url),'utf8');

test('judge introductions and local guide describe the current eight-screen workflow and explicit sample boundary',()=>{
 for(const file of ['../../../README.md','../../README.md']){
  const text=read(file);assert.match(text,/ForgeFront Factory Resilience/);assert.match(text,/Live demo/);assert.match(text,/Demo video/);assert.match(text,/The Britt/);
  assert.doesNotMatch(text,/synthetic-browser-rehearsal|enter the rehearsal token/i);
 }
 const guide=read('../../RUN_GUIDE.md');for(const name of ['Incident','Findings','Decision','The Britt plan','Disrupt','Evidence','Shop','Settings'])assert.ok(guide.includes(name));
 assert.match(guide,/no live AI request/);assert.match(guide,/no feasible/);assert.match(guide,/npm run demo --prefix hackathon/);
});
test('current visible brand is consistent in entry title and shell logo',()=>{
 const html=read('../../public/index.html'),kit=read('../../public/ui/kit.mjs');
 assert.match(html,/<title>ForgeFront Factory Resilience<\/title>/);assert.match(kit,/alt="ForgeFront Systems"/);assert.match(kit,/src="\/ui\/forgefront-logo.png"/);assert.match(html,/href="\/favicon.png"/);
});

test('provider preflight treats Fireworks as optional backup that never fails the overall check',async()=>{
 const {checkProviders}=await import('../../scripts/provider-check.mjs');
 const fetchImpl=async(url,options)=>{const b=JSON.parse(options.body);const prompt=b.input??b.messages[0].content;const nonce=prompt.match(/SMOKE_OK_[a-f0-9]+/)[0];return new Response(JSON.stringify(b.input?{model:b.model,output_text:nonce}:{model:b.model,choices:[{message:{content:nonce}}]}));};
 const primary=await checkProviders({env:{MODEL_API_KEY:'synthetic-wonder',BASETEN_API_KEY:'synthetic-baseten'},fetchImpl});
 assert.equal(primary.passed,true);
 const fireworks=primary.providers.find(p=>p.provider==='spark-fireworks');
 assert.equal(fireworks.light,'RED');
 assert.match(primary.policy,/optional backup/i);
 const all=await checkProviders({includeBackup:true,env:{MODEL_API_KEY:'synthetic-wonder',BASETEN_API_KEY:'synthetic-baseten',FIREWORKS_API_KEY:'synthetic-fireworks'},fetchImpl});
 assert.equal(all.passed,true);assert.ok(all.providers.every(p=>p.light==='GREEN'));
});
