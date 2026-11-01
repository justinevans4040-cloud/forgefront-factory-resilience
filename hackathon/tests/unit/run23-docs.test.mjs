import test from 'node:test';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../../'+p,import.meta.url),'utf8');
test('public entry docs show the shared live URL before local instructions',async()=>{
 const {LIVE_DEMO_URL,checkLiveDemoDocs}=await import('../../scripts/live-demo.mjs');
 assert.equal(LIVE_DEMO_URL,'https://forgefront-factory-resilience.onrender.com');
 assert.deepEqual(checkLiveDemoDocs(),[]);
 for(const file of ['README.md','hackathon/README.md','hackathon/RUN_GUIDE.md']){
  const text=read(file);
  if(file.endsWith('RUN_GUIDE.md'))assert.ok(text.indexOf('Live demo')<text.indexOf('## Run locally'),file);
  else assert.doesNotMatch(text,/## Run locally/);
  assert.doesNotMatch(text,/(?<![`\w])https?:\/\/(?:127\.0\.0\.1|localhost)[^`\s]*/i,file);
 }
});
test('partner badges precede the hero in model and serving order',()=>{
 const text=read('README.md');
 const hero=text.indexOf('assets/showcase/factory-resilience-hero.jpg');
 const powered=text.indexOf('## Powered by');
 assert.ok(powered<hero&&powered>text.indexOf('# Forgefront Factory Resilience'));
 const block=text.slice(powered,hero);
 assert.ok(block.indexOf('partner-meta.svg')<block.indexOf('partner-baseten.svg'));
 assert.ok(block.indexOf('partner-baseten.svg')<block.indexOf('partner-fireworks.svg'));
 for(const partner of ['meta','baseten','fireworks']){
  const badge=read('hackathon/public/partner-'+partner+'.svg');
  assert.match(badge,/#00e59b/i);assert.doesNotMatch(badge,/#(?:ff0000|e5484d)/i);
 }
});
test('Render blueprint belongs to the exact public copy set',async()=>{
 const {publicFiles}=await import('../../scripts/public-set.mjs');
 assert.ok(publicFiles(fileURLToPath(new URL('../../../',import.meta.url))).includes('render.yaml'));
});

test('public operation documents limits, disk, secret names and the shared URL command',()=>{
 const guide=read('hackathon/RUN_GUIDE.md');
 for(const phrase of ['serve:public','30','10','300','HACKATHON_STATE_DIR','HACKATHON_LEDGER_KEY','sync: false','live-demo.mjs --write'])assert.ok(guide.includes(phrase),phrase);
 const controls=read('hackathon/SECURITY_CONTROLS.md');
 for(const phrase of ['public-budget.mjs','run23-public','trusted','session'])assert.ok(controls.includes(phrase),phrase);
});
