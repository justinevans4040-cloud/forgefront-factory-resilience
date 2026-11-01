import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proofActionGate} from '../../public/command-center.mjs';
import {acceptedFlow} from '../../public/factory-layout.mjs';

const css = readFileSync(new URL('../../public/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../public/app.mjs', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');

test('investigation route helper stays visible with silver contrast', () => {
  assert.match(html, /id="route-help"/);
  assert.match(css, /#route-help\{[^}]*display:\s*block/);
  assert.match(css, /#route-help\{[^}]*font-size:\s*12px/);
  assert.match(css, /#route-help\{[^}]*color:\s*#c5ccd4/);
});

test('route health and investigation evidence remain separately headed groups', () => {
  assert.match(html, /id="route-health-label">MODEL CONNECTION/);
  assert.match(html, /id="investigation-task-label">2 · INVESTIGATE SOURCE EVIDENCE/);
  assert.match(css, /\.route-preflight\{/);
  assert.match(css, /\.investigation-task\{/);
  for(const region of ['connection','evidence','results'])assert.ok(html.includes('data-investigation-region="'+region+'"'));
});

test('proposal inspection uses 40px pager targets and secondary inspector approve', () => {
  assert.match(app, /classList\.add\('secondary'\)/);
  assert.match(app, /\$\('britt-approve'\)\.classList\.add\('secondary'\)/);
  assert.match(app, /Review proposed tasks/);
  assert.match(css, /\.proposal-pages button\{[^}]*min-(?:width|height):\s*40px/);
  assert.match(app, /dataset\.proposalIndex/);
  assert.match(app, /ArrowLeft/);
});

test('export passphrase stays locked until current ledger verification', () => {
  assert.match(app, /\$\('export-passphrase'\)\.disabled=reviewIndex!==null\|\|Boolean\(guide&&guide\.verified!==state\.ledger\.head\)/);
  assert.match(app, /\$\('export-passphrase'\)\.disabled=guide\.verified!==state\.ledger\.head/);
  const waiting = proofActionGate({ledger:{head:'h1'}}, {verified:false, exported:false, checkpoint:false});
  assert.equal(waiting.verify, true);
  assert.equal(waiting['encrypted-export'], false);
  assert.equal(waiting.checkpoint, false);
  const sealed = proofActionGate({ledger:{head:'h1'}}, {verified:'h1', exported:false, checkpoint:false});
  assert.equal(sealed.verify, true);
  assert.equal(sealed['encrypted-export'], true);
  assert.equal(sealed.checkpoint, false);
});

test('accepted flow keeps machine hours separate from part demand', () => {
  assert.deepEqual(
    acceptedFlow({detail:{materialId:'MAT-C',allocations:[{cellId:'CELL-A',hours:12},{cellId:'CELL-B',hours:9}]}},41),
    {parts:41,materials:['MAT-C'],assignments:[{cellId:'CELL-A',hours:12},{cellId:'CELL-B',hours:9}]}
  );
});

test('shock preview and blocked prior work keep distinct treatments', () => {
  assert.match(app, /PREVIEW · WILL GO OFFLINE|PREVIEW - not applied/);
  assert.match(css, /\.factory-node\.preview-offline/);
  assert.match(css, /#prior-work summary\{[^}]*min-height:\s*36px/);
  assert.match(app, /BLOCKED prior tasks · separate from proposed replacements/);
  assert.match(css, /\.proposal-task\{[^}]*dashed|#A8F04A/);
});
