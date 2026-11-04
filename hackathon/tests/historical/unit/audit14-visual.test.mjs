import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {certificateComparison} from '../../public/factory-layout.mjs';

const html = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../public/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../public/app.mjs', import.meta.url), 'utf8');

test('opening story logo lives on the factory stage, not as a third inspector mark on complete', () => {
  assert.match(html, /id="opening-story"/);
  assert.match(html, /id="opening-story"[\s\S]*?class="story-logo"/);
  assert.match(css, /#opening-story/);
  assert.match(css, /body\[data-guided=true\]\[data-active-stage=incident\] #opening-story\{display:flex\}/);
  assert.match(css, /body\[data-guide-complete=true\] #opening-story/);
  assert.match(css, /body\[data-guided=true\]\[data-guide-complete=true\] \.story-hero/);
  assert.match(css, /body\[data-guided=true\]\[data-guide-complete=true\] \.story-hero>\.story-logo\{display:none!important/);
});

test('certificate discrepancy tracks render enlarged source-computed bars', () => {
  assert.match(app, /certificateComparison\(qty,420\)/);
  assert.match(app, /compareRow/);
  assert.match(app, /y\+28,String\(e.quantity.value\),30/);
  assert.match(app, /'text-anchor':'end'/);
  assert.deepEqual(certificateComparison([120, 80].map((value) => ({quantity: {value}, source: {field: 'quantity'}})), 420).widths, [420, 280]);
});

test('completion demotes proof Verify styling and strengthens sealed status contrast', () => {
  assert.match(css, /body\[data-guide-complete=true\] #verify/);
  assert.match(css, /body\[data-guide-complete=true\] #decision-status\{[^}]*color:#dafb9a/);
  assert.match(app, /guide-next'\)\.hidden=step\.id==='complete'/);
});

test('incident inspector labels MATERIAL HOLD without duplicating the stage opening logo', () => {
  assert.match(html, /MATERIAL HOLD \/ RECOVERY MISSION/);
  assert.match(css, /body\[data-guided=true\]\[data-active-stage=incident\] \.story-hero>\.story-logo\{display:none!important/);
});
