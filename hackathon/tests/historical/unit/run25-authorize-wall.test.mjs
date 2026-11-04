import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('demo consent uses one-click approve plus authorize wall markup',()=>{
 const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
 const cascade=readFileSync(new URL('../../public/cascade.mjs',import.meta.url),'utf8');
 assert.match(html,/id="approve-option"/);
 assert.match(html,/id="authorize-wall"/);
 assert.match(html,/Authorize this decision/);
 assert.match(html,/passkey, typed phrase, or other enterprise/);
 assert.doesNotMatch(html,/>Type the exact phrase below to confirm</);
 assert.match(app,/openAuthorize\(/);
 assert.match(app,/sealConsent/);
 assert.match(app,/approveLabel\(/);
 assert.match(cascade,/plant-authorize/);
 assert.match(cascade,/Authorize/);
 assert.doesNotMatch(cascade,/Type the approval phrase/);
});

test('README states production authorization wall beside the live demo',()=>{
 const rootReadme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');
 const hackathonReadme=readFileSync(new URL('../../README.md',import.meta.url),'utf8');
 for(const text of [rootReadme,hackathonReadme]){
  assert.match(text,/Live demo/);
  assert.match(text,/authorization wall such as a passkey, typed phrase, or other enterprise security control/);
  assert.match(text,/Approve the path/);
  assert.doesNotMatch(text,/Type the consent/);
 }
});
