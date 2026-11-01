import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../../public/app.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');

test('owner layout CSS makes the rail a compact horizontal strip and removes the redundant guide banner',()=>{
 assert.match(css,/#stage-rail\{[^}]*flex-direction:\s*row/);
 assert.match(css,/#stage-rail\{[^}]*max-height:\s*40px!important/);
 assert.match(css,/\.guide\{[^}]*height:\s*0!important/);
 assert.match(css,/body\[data-guided=true\] \.guide\{[^}]*height:\s*32px!important/);
 assert.match(css,/#decision-bar\{[^}]*position:\s*absolute!important/);
 assert.match(css,/#factory-stage\{[^}]*padding:[^}]*56px!important/);
 assert.match(css,/body\[data-guided=true\] #stage-rail #workspace-switcher\{display:none!important\}/);
});

test('owner layout raises body type and keeps evidence cards without forced scrolling',()=>{
 assert.match(css,/body\{font-size:\s*16px!important/);
 assert.match(css,/\.evidence-headline\{[^}]*font-size:\s*17px!important/);
 assert.match(css,/\.evidence-figure\{[^}]*font-size:\s*28px!important/);
 assert.match(css,/#evidence,\.evidence-cards\{[^}]*overflow:\s*visible!important/);
 assert.match(html,/evidence-cards/);
 assert.match(app,/evidencePlainEnglish/);
 assert.match(app,/\$\('factory-stage'\)\.append\(decisionBar\)/);
});

test('incident SVG uses a filled viewBox and separates machine and comparison bands',()=>{
 assert.match(app,/viewBox','0 0 900 520/);
 assert.match(app,/preserveAspectRatio','xMidYMid meet/);
 assert.match(app,/machineY=incidentStage\?190:150/);
 assert.match(app,/jobY=incidentStage\?400:340/);
 assert.match(app,/data-scene-band':'compare'/);
 assert.match(app,/if\(child\.tagName!=='defs'\)child\.style\.display='none'/);
});
