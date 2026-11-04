import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditText} from '../../scripts/public-set.mjs';
import {checkJudgePitch,checkTrackedDemo,checkReadmeCommands} from '../../scripts/judge-check.mjs';

const pitch=`# Factory Resilience
**Live demo:** [Open the app](https://example.org/app)
**Demo video:** [Watch the walkthrough](https://example.org/demo.mp4)
![Incident](assets/showcase/current/incident.png)
The Britt uses Meta Muse Spark Open on Baseten to investigate plant evidence.
[Run it yourself](hackathon/RUN_GUIDE.md) [Model integration](hackathon/docs/META_MODEL_USAGE.md)
`;

test('current pitch checks usable entry links and immediate video placement without prescribing prose',()=>{
 assert.deepEqual(checkJudgePitch(pitch),[]);
 assert.deepEqual(checkJudgePitch(pitch.replace('**Demo video:** [Watch the walkthrough](https://example.org/demo.mp4)','**Demo video · 2:55:** [Watch the latest MP4](https://example.org/demo.mp4) · [Details and download](https://example.org/releases/demo)')),[]);
 assert.ok(checkJudgePitch(pitch.replace('**Demo video:**','A paragraph between the links.\n**Demo video:**')).some(e=>e.kind==='pitch-video-placement'));
 assert.ok(checkJudgePitch(pitch.replace('https://example.org/demo.mp4','#missing-video')).length);
 assert.ok(checkJudgePitch(pitch.replace('assets/showcase/current/incident.png','assets/showcase/old.png')).length);
 for(const jargon of ['npm run demo','MUSE_API_KEY','consent phrase'])assert.ok(checkJudgePitch(pitch+jargon).some(e=>e.kind==='pitch-setup-or-jargon'));
});

test('approved disclosure address is file-specific and does not exempt other private contacts',()=>{
 const address=['justin','wakeforged.com'].join('@');
 assert.deepEqual(auditText(address,'hackathon/SECURITY.md'),[]);
 assert.ok(auditText(address,'hackathon/docs/probe.md').includes('email'));
 assert.ok(auditText(address+' '+['other','private.invalid'].join('@'),'hackathon/SECURITY.md').includes('email'));
 assert.ok(auditText('other'+address,'hackathon/SECURITY.md').includes('email'));
 assert.deepEqual(auditText('Copyright (c) '+String(2000+26)+' ForgeFront Systems','LICENSE'),[]);
});

test('CSS properties are allowed in current stylesheets but tool words in comments and strings remain audited',()=>{
 const property=['cur','sor'].join('');
 const file='hackathon/public/ui/theme.css';
 assert.deepEqual(auditText(`button { ${property}: pointer; }`,file),[]);
 assert.ok(auditText(`/* ${property}: pointer; */`,file).includes('toolB'));
 assert.ok(auditText(`button { content: "${property}: pointer;"; }`,file).includes('toolB'));
 assert.ok(auditText(`button { ${property}: pointer; }`,'hackathon/probe.txt').includes('toolB'));
});

test('demo closure follows the HTML shell, registered lazy screens and backend imports, rejecting omissions',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-closure-'));
 const files={
  'hackathon/package.json':JSON.stringify({scripts:{demo:'node scripts/rehearse.mjs',start:'node server.mjs'}}),
  'hackathon/scripts/rehearse.mjs':"import '../server.mjs';",
  'hackathon/server.mjs':"import './src/domain/scenario.mjs';",
  'hackathon/src/domain/scenario.mjs':"export {input} from '../../fixtures/demo-scenario.mjs';",
  'hackathon/fixtures/demo-scenario.mjs':'export const input={};',
  'hackathon/public/index.html':'<link href="/ui/theme.css" rel="stylesheet"><script type="module" src="/ui/kit.mjs"></script>',
  'hackathon/public/ui/kit.mjs':"export const SCREEN_FLOW=[{id:'incident',label:'Incident'}]; const load=id=>import(`/ui/screen-${id}.mjs`); const css=id=>`/ui/screen-${id}.css`;",
  'hackathon/public/ui/theme.css':'body {}',
  'hackathon/public/ui/screen-incident.mjs':'export function mount(){}',
  'hackathon/public/ui/screen-incident.css':'main {}'
 };
 for(const [file,content] of Object.entries(files)){mkdirSync(join(root,file,'..'),{recursive:true});writeFileSync(join(root,file),content);}
 const tracked=new Set(Object.keys(files));
 const result=checkTrackedDemo({root,tracked});assert.deepEqual(result.missing,[]);
 for(const file of ['hackathon/public/ui/kit.mjs','hackathon/public/ui/screen-incident.css','hackathon/fixtures/demo-scenario.mjs']){
  assert.ok(result.required.includes(file));const incomplete=new Set(tracked);incomplete.delete(file);
  assert.ok(checkTrackedDemo({root,tracked:incomplete}).missing.includes(file));
 }
 assert.equal(result.required.some(file=>/public\/(?:app\.mjs|style\.css)$/.test(file)),false);
});

test('README command validation reports absent packages without throwing',()=>{
 assert.doesNotThrow(()=>checkReadmeCommands('npm run absent --prefix nonexistent'));
 assert.ok(checkReadmeCommands('npm run absent --prefix nonexistent').length);
});
