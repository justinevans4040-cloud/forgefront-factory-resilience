import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const read=(rel)=>readFileSync(join(here,'../..',rel),'utf8');

test('factory nodes carry three live status lines with no floating HOLD marker',()=>{
 const app=read('public/app.mjs');
 assert.match(app,/Three live status lines fill the card/);
 assert.match(app,/nodeH\*0\.24/);
 assert.match(app,/nodeH\*0\.52/);
 assert.match(app,/nodeH\*0\.78/);
 assert.match(app,/availableHours\+'h capacity'/);
 assert.match(app,/0h · will go offline/);
 assert.match(app,/accepted\?'ON ACCEPTED PATH':'AT RISK'/);
 assert.match(app,/accepted\?'VERIFIED RECOVERY':'× HOLD'/);
 assert.doesNotMatch(app,/class:'hold-marker'/);
});

test('shock capacity leader stops in the bay band above stations',()=>{
 const app=read('public/app.mjs');
 assert.match(app,/Leader ends in the bay band above stations/);
 assert.match(app,/V \$\{bayY\+16\}/);
 assert.doesNotMatch(app,/V \$\{machineY\}/);
});

test('nested parent-npm copy excludes bulky evidence trees',()=>{
 const path=join(here,'../../../tests/round17-stepladder-fixes.test.mjs');
 if(!existsSync(path))return; // public-tree verification copies the hackathon public set only
 const source=readFileSync(path,'utf8');
 assert.match(source,/hackathon\/evidence/);
 assert.match(source,/evidence-backups/);
 assert.match(source,/omit bulky evidence/);
});
