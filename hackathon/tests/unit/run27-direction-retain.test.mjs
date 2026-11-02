import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directionBeats} from '../../scripts/design-director.mjs';
import {departmentStatus} from '../../public/cascade.mjs';

const direction=JSON.parse(readFileSync(new URL('../../design/design-direction.json',import.meta.url),'utf8'));
const weaker={steps:direction.steps.map(s=>({...s,score:Math.max(0,(s.score??0)-1)}))};
const stronger={steps:direction.steps.map(s=>({...s,score:(s.score??0)+1}))};

test('design direction retention rejects weaker Wonder rounds',()=>{
 assert.equal(directionBeats(weaker,direction),false);
 assert.equal(directionBeats(direction,direction),false);
 assert.equal(directionBeats(stronger,direction),true);
});

test('cascade department status never mixes offline counts with RUNNING for the same hit',()=>{
 assert.equal(departmentStatus({recovered:false,active:true,offlineCount:5,runningCount:0,members:5,hit:false}),'RUNNING · 5 machines');
 assert.equal(departmentStatus({recovered:false,active:true,offlineCount:5,runningCount:0,members:5,hit:true}),'OFFLINE · 5 machines');
 assert.equal(departmentStatus({recovered:false,active:true,offlineCount:2,runningCount:3,members:5,hit:true}),'2 OFF / 3 RUN');
 assert.equal(departmentStatus({recovered:true,active:true,offlineCount:5,runningCount:0,members:5,hit:true}),'RECOVERY ACCEPTED');
});

test('The Britt signature moment is wired in the board panel',()=>{
 const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
 assert.match(html,/id="britt-signature-banner"/);
 assert.match(html,/The Britt builds the live board/);
 assert.match(app,/britt-signature/);
 assert.match(app,/The Britt is building the board/);
 assert.match(css,/britt-signature/);
 assert.match(css,/britt-build/);
});
