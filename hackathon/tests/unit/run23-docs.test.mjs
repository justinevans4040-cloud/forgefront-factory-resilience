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
test('public README gallery covers every current screen with complete widescreen captures',()=>{
 const text=read('README.md');
 assert.ok(text.indexOf('**Live demo:**')<text.indexOf('# ForgeFront Factory Resilience'));
 assert.match(text,/Muse Spark Open on Baseten/);
 assert.match(text,/The Britt/);
 assert.doesNotMatch(text,/emerald|Hero:|command center|\b20\d{2}[-/]\d/i);
 const images=[...text.matchAll(/!\[[^\]]+\]\((assets\/showcase\/[^)]+)\)/g)].map(m=>m[1]);
 const names=['shop','incident','findings','decision','authorize','the-britt-plan','disrupt','evidence','settings'];
 assert.deepEqual(images,names.map(name=>'assets/showcase/current/'+name+'.png'));
 for(const file of images){
  const bytes=readFileSync(new URL('../../../'+file,import.meta.url));
  assert.equal(bytes.subarray(1,4).toString(),'PNG',file);
  assert.equal(bytes.readUInt32BE(16),1920,file);
  assert.equal(bytes.readUInt32BE(20),1080,file);
 }
 assert.doesNotMatch(read('hackathon/README.md'),/factory-resilience-hero|full-shop-cascade|emerald/i);
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
