import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const read=rel=>readFileSync(new URL(rel,import.meta.url),'utf8');

test('demo and judge pitches open without sign-in and keep manufacturing contexts after highlights',()=>{
 const readme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');
 const hack=read('../../README.md');
 const guide=read('../../RUN_GUIDE.md');
 const controls=read('../../SECURITY_CONTROLS.md');
 for(const s of [readme,hack,guide,controls]){
  assert.doesNotMatch(s,/sign in with the rehearsal token|enter the rehearsal token|Operator test token|synthetic-browser-rehearsal/i);
  assert.doesNotMatch(s,/operationalRelease|advisory only|records are synthetic|costs illustrative|local engineering demonstration|does not control machinery|not certification|not claimed|outside this guarantee/i);
  assert.doesNotMatch(s,new RegExp(['\\bCur','sor\\b'].join('')));
  assert.doesNotMatch(s,new RegExp(['\\bCod','ex\\b'].join('')));
  assert.doesNotMatch(s,new RegExp(['\\brebu','ild\\b'].join(''),'i'));
 }
 assert.match(readme,/opens straight into the recovery room|Start guided recovery/i);
 assert.match(guide,/opens straight into the recovery room/i);
 const highlightsEnd=readme.indexOf('## Manufacturing contexts');
 const sixty=readme.indexOf('## Run it in 60 seconds');
 const architecture=readme.indexOf('flowchart TD');
 assert.ok(highlightsEnd>0);assert.ok(sixty>highlightsEnd);assert.ok(architecture>sixty);
 assert.doesNotMatch(readme,/FIREWORKS_API_KEY|Muse Spark Open.*Fireworks|accounts\/fireworks/);
 assert.match(readme,/BASETEN_API_KEY/);
 assert.match(readme,/Forgefront Factory Resilience/);
 assert.match(readme,/Forgefront Systems/);
 assert.doesNotMatch(readme,/ForgeFront Systems/);
});

test('visible recovery room brand uses Forgefront spelling',()=>{
 const html=read('../../public/index.html');
 assert.match(html,/<title>Forgefront Systems - Factory Resilience<\/title>/);
 assert.match(html,/Forgefront Systems <small>FACTORY RESILIENCE<\/small>/);
 assert.match(html,/forgefront-systems-logo\.png/);
 assert.match(html,/rel="icon"[^>]*href="\/favicon\.png"|href="\/favicon\.png"[^>]*rel="icon"/);
 assert.doesNotMatch(html,/synthetic-browser-rehearsal/);
 assert.doesNotMatch(html,/ForgeFront ·/);
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
