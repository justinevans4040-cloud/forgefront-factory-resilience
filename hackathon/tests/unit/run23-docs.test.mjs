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
  const localHeading=text.match(/^##\s+(?:local\b.*|run\s+locally\b.*)$/im);
  if(file.endsWith('RUN_GUIDE.md')){
   assert.ok(localHeading,'run guide includes a local launch section');
   assert.ok(text.indexOf('Live demo')<localHeading.index,file);
   assert.match(text,/npm run demo --prefix hackathon/);
  }else assert.equal(localHeading,null,'product introductions keep local launch instructions in the guide');
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
 assert.equal(images[0],'assets/showcase/current/forgefront-factory-resilience.jpg');
 const poster=readFileSync(new URL('../../../'+images[0],import.meta.url));assert.equal(poster.readUInt16BE(0),0xffd8);
 images.shift();assert.deepEqual(images,names.map(name=>'assets/showcase/current/'+name+'.png'));
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
 const blueprint=read('render.yaml');
 assert.match(guide,/serve:public/);
 assert.match(guide,/\b30\b[^.\n]*API requests[^.\n]*per visitor[^.\n]*per minute/i);
 assert.match(guide,/\b10\b[^.\n]*live operations[^.\n]*per visitor[^.\n]*per hour/i);
 assert.match(guide,/\b300\b[^.\n]*(?:globally|global)[^.\n]*UTC day/i);
 assert.match(guide,/\b429\b[^.\n]*Retry-After/i);
 assert.match(guide,/persistent disk/i);
 const stateDirectory=blueprint.match(/- key:\s*HACKATHON_STATE_DIR\s*\n\s*value:\s*(\S+)/)?.[1];
 assert.ok(stateDirectory,'blueprint declares a persistent state directory');
 assert.ok(guide.includes('HACKATHON_STATE_DIR='+stateDirectory));
 assert.match(blueprint,/mountPath:\s*\/var\/data\b/);
 const envBlocks=blueprint.split(/^\s*- key:\s*/m).slice(1);
 for(const name of ['MUSE_API_KEY','BASETEN_API_KEY','HACKATHON_LEDGER_KEY','HACKATHON_ADMIN_TOKEN']){
  assert.ok(guide.includes(name),'guide names the privately provisioned '+name);
  const block=envBlocks.find(value=>value.split(/\r?\n/)[0].trim()===name);
  assert.ok(block,'blueprint declares '+name);assert.match(block,/^\s*sync:\s*false\s*$/m);
 }
 assert.match(guide,/(?:host secret settings|environment.provisioned)/i);
 assert.match(guide,/live-demo\.mjs/);assert.match(guide,/`--write`/);
 assert.match(guide,/(?:synchroniz|alignment)/i);
 assert.match(guide,/Muse Spark Open/);assert.match(guide,/Muse Wonder/);
 assert.match(guide,/(?:billing|availability|unavailable)/i);
 assert.match(guide,/Fireworks[^.\n]*(?:standby|backup)/i);
 assert.match(guide,/standby[^.\n]*(?:not called|not requested|removed|removes)/i);
 assert.match(guide,/Sample[^.\n]*(?:no live AI|no provider request|offline)/i);
 const controls=read('hackathon/SECURITY_CONTROLS.md');
 for(const phrase of ['public-budget.mjs','run23-public','trusted','session'])assert.ok(controls.includes(phrase),phrase);
});
