import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {guideStep} from '../../public/guide.mjs';
import {capacityStatus,focusResult} from '../../public/command-center.mjs';

const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const director=readFileSync(new URL('../../scripts/design-director.mjs',import.meta.url),'utf8');

test('decision stage keeps comparison heading and consent inside a bounded inspector',()=>{
 assert.match(css,/body\[data-active-stage=decision\] #stage-deck\{overflow:hidden/);
 assert.match(css,/\.stage\[data-stage=decision\] \.section-heading/);
 assert.match(css,/\.stage\[data-stage=decision\] \.decision\{[^}]*overflow:auto/);
 assert.match(css,/\.stage\[data-stage=decision\] #options\{[^}]*max-height:42%/);
});

test('guided live Spark requires Baseten so Wonder receives a structured handoff',()=>{
 const run=(provider,digest='initial')=>({proposalValid:true,run:{sample:false,snapshotDigest:digest},calls:[{provider}]});
 const state={snapshot:{snapshotDigest:'initial'},runs:[run('fireworks')],decision:{status:'none'},ledger:{head:'head'}};
 const g={initialDigest:'initial',inspected:true,acceptedInitial:false,exported:false};
 assert.equal(guideStep(state,g).id,'spark');
 state.runs=[run('baseten')];assert.equal(guideStep(state,g).id,'wonder');
});

test('Britt drafting prefers Wonder so the server can fall back to Baseten',()=>{
 assert.match(app,/const provider=\$\('provider'\)\.value==='sample'\?'sample':'wonder'/);
 assert.doesNotMatch(app,/britt-draft.*fireworks/);
});

test('design director sanitizes public review text before fallback',()=>{
 assert.match(director,/acceptPublicReview|redactEvidence/);
 assert.match(director,/Never use the literal tokens /);
 assert.match(director,/MUSE_API_KEY\|\|env\.MODEL_API_KEY/);
 assert.match(director,/\['re','build'\]/);
});

test('capacity preview and nearest focus contracts stay intact',()=>{
 let scroll;
 const element={matches:()=>true,classList:{add(){}},scrollIntoView:options=>{scroll=options;},focus(){}};
 focusResult('typed',{document:{getElementById:()=>element,querySelectorAll:()=>[]},reducedMotion:true});
 assert.equal(scroll.block,'nearest');
 assert.equal(capacityStatus({cellId:'m2',online:true},'m2'),'PREVIEW: WILL GO OFFLINE');
});

test('design director module path remains under hackathon scripts',()=>{
 assert.ok(fileURLToPath(new URL('../../scripts/design-director.mjs',import.meta.url)).includes('hackathon'));
});
