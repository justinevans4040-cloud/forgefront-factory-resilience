import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const readme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');
const designSystem=new URL('../../design/DESIGN_SYSTEM.md',import.meta.url);

test('build stamp advances to audit45 guided nines',()=>{
 assert.match(html,/ffr-build" content="audit45-guided-nines"/);
 assert.doesNotMatch(html,/audit43-wonder-finish/);
});

test('DESIGN_SYSTEM.md remains the calm premium contract',()=>{
 assert.equal(existsSync(designSystem),true);
 const md=readFileSync(designSystem,'utf8');
 assert.match(md,/8px grid/i);
 assert.match(md,/The Britt/);
});

test('Wonder P1 step 1: scene fill keeps option band geometry-safe and links RECEIVING to certificate tracks',()=>{
 assert.match(app,/height\*0\.11/);
 assert.match(app,/receiving-cert-link/);
 assert.match(app,/ev-recv-qty/);
 assert.match(css,/audit45/);
});

test('Wonder P1 step 2: CONNECTION and EVIDENCE stay separate with metric focus rings',()=>{
 assert.match(css,/investigation-task/);
 assert.match(app,/investigation-metric/);
 assert.match(app,/linkMetric/);
});

test('Wonder P1 step 4: board living flow and UNTRACKED until approval state',()=>{
 assert.match(app,/accepted-living-flow|board-accepted-lot/);
 assert.match(app,/stationH=122/);
 assert.match(app,/UNTRACKED UNTIL APPROVAL/);
 assert.match(css,/proposal-focus-ring/);
});

test('Wonder P1 step 6: cleared findings reserve stays verb-led at 16px',()=>{
 assert.match(app,/CLEARED · Verified findings wiped/);
 assert.match(app,/Reinvestigate when ready/);
 assert.match(css,/findings-reserve-active/);
});

test('Wonder P1 step 9: Verify ledger is sole primary; READY/LOCKED sit below the event track',()=>{
 assert.match(app,/proof-sole-primary/);
 assert.match(app,/proof-locked-helper/);
 assert.match(app,/proof-status-word/);
 assert.match(app,/Dashed · complete prior step first/);
 assert.match(css,/proof-sole-slot/);
});

test('README keeps Live demo marker and cascade glance caption',()=>{
 assert.match(readme,/\*\*Live demo:\*\*/);
 assert.match(readme,/105 hours/);
 assert.match(readme,/5 late orders/);
 assert.match(readme,/\$11,100/);
});

test('Authorize wall and The Britt naming stay intact',()=>{
 assert.match(html,/Authorize this decision/);
 assert.match(html,/The Britt investigates\./);
 assert.doesNotMatch(html,/(?<!The )Britt investigates/);
});
