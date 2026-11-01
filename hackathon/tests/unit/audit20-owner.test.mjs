import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const hackathon=join(here,'../..');
const root=join(hackathon,'..');
const read=(rel)=>readFileSync(join(hackathon,rel),'utf8');

test('shock capacity preview reserves the top callout band above stations',()=>{
 const app=read('public/app.mjs');
 assert.match(app,/data-scene-callout':'capacity-preview'/);
 assert.match(app,/box\(24,8,852,96/);
 assert.match(app,/const lineRight=876/);
 assert.doesNotMatch(app,/shockStage\?640/);
 assert.doesNotMatch(app,/box\(658,machineY/);
});

test('geometry measures callout panel rects against factory nodes',()=>{
 const geometry=read('scripts/layout-geometry.mjs');
 assert.match(geometry,/data-scene-band="callout"/);
 assert.match(geometry,/data-scene-callout/);
});

test('official logo remains byte-identical after audit twenty',()=>{
 const logo=readFileSync(join(root,'assets/brand/forgefront-systems-logo.png'));
 assert.equal(createHash('sha256').update(logo).digest('hex'),'5d3333eb8a5d97e97d5b868ed81008c6994c19f3f756101208add0e7e526f707');
});

test('showcase images no longer carry the prior red-theme digests',()=>{
 const forbidden={
  'commercial-production-resilience.jpg':'cae86142aa338c202858cb440f42d6c9d2b46aa59a16dc77bfd71b1e0ac7b8f3',
  'factory-resilience-hero.jpg':'aeb3462d63b252c5a59f1f8e97213de205506062032f79eccb2b47bba19be0e6',
  'global-assembly-resilience.jpg':'466725dd096e9fca841e83e5dbfe0e02973c9a62135772bff4984ebb1766621f',
  'mission-critical-resilience.jpg':'a8b4c608292971090525f22d47a30ae73b8e2565c8b5fe50ec5b758e0df7a162',
  'small-shop-resilience.jpg':'3bdc1b64ad2864dde3584217322a05b53e5e412f3c604195292fbfc3b60e4d2a'
 };
 for(const [name,oldHash] of Object.entries(forbidden)){
  const path=join(root,'assets/showcase',name);
  assert.equal(existsSync(path),true,name);
  const digest=createHash('sha256').update(readFileSync(path)).digest('hex');
  assert.notEqual(digest,oldHash,name+' still matches the red-theme digest');
 }
});

test('nested parent-npm cleanup contract stays in the root suite',()=>{
 const path=join(root,'tests/round17-stepladder-fixes.test.mjs');
 if(!existsSync(path))return; // public-tree verification copies the hackathon public set only
 const source=readFileSync(path,'utf8');
 assert.match(source,/rmSync\(parent,\s*\{\s*recursive:\s*true,\s*force:\s*true\s*\}\)/);
 assert.match(source,/nested parent-npm working-tree copies are deleted/);
 assert.match(source,/hackathon\/evidence/);
 assert.match(source,/Owner disk floor/);
});
