import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';
import { writeEvidence, evidenceRun } from './public-evidence.mjs';

const delay = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await fn()) return; await delay(80); }
  throw new Error('Timed out: ' + label);
}

const binaries = [process.env.CHROME_PATH, ...[process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean).flatMap(p => [join(p, 'Google', 'Chrome', 'Application', 'chrome.exe'), join(p, 'Microsoft', 'Edge', 'Application', 'msedge.exe')])];
const binary = binaries.find(p => p && existsSync(p));
if (!binary) throw new Error('Browser unavailable');

const scratch = mkdtempSync(join(tmpdir(), 'ffr-owner-layout-'));
const token = randomBytes(24).toString('hex');
const app = createApp({ models: { env: { ...process.env, FIREWORKS_API_KEY: '', HACKATHON_DEMO_MODE: '1', HACKATHON_ADMIN_TOKEN: token, HACKATHON_LEDGER_KEY: randomBytes(32).toString('hex'), HACKATHON_STATE_DIR: join(scratch, 'state') } } });
const address = await app.listen(0);
const base = `http://127.0.0.1:${address.port}`;
const browser = spawn(binary, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + join(scratch, 'browser'), 'about:blank'], { stdio: 'ignore', windowsHide: true });
const output = new URL('../evidence/' + evidenceRun() + '/owner-layout/', import.meta.url);
mkdirSync(output, { recursive: true });
const save = (name, contents) => writeEvidence(new URL(name, output), contents);

const measureScript = `(() => {
  const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height, area: r.width * r.height }; };
  const overlaps = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  const stage = document.querySelector('#factory-stage');
  const svg = document.querySelector('#factory-svg');
  const rail = document.querySelector('#stage-rail');
  const guide = document.querySelector('.guide');
  const bar = document.querySelector('#decision-bar');
  const evidence = document.querySelector('#evidence');
  const cards = [...document.querySelectorAll('.evidence-card')];
  const stageRect = rect(stage);
  const svgRect = rect(svg);
  const fill = stageRect.area ? svgRect.area / stageRect.area : 0;
  const bandNodes = [...svg.querySelectorAll('g.factory-node[data-scene-band], g[data-scene-band="compare"]')];
  const bandBoxes = bandNodes.map(n => ({ band: n.getAttribute('data-scene-band'), ...rect(n) })).filter(b => b.width > 0 && b.height > 0);
  const crossBandHits = [];
  for (let i = 0; i < bandBoxes.length; i++) for (let j = i + 1; j < bandBoxes.length; j++) {
    if (bandBoxes[i].band !== bandBoxes[j].band && overlaps(bandBoxes[i], bandBoxes[j])) crossBandHits.push([bandBoxes[i].band, bandBoxes[j].band]);
  }
  const body = getComputedStyle(document.body).fontSize;
  const headline = cards[0] ? getComputedStyle(cards[0].querySelector('.evidence-headline')).fontSize : '0px';
  const figure = cards[0]?.querySelector('.evidence-figure') ? getComputedStyle(cards[0].querySelector('.evidence-figure')).fontSize : '0px';
  const unexpectedScroll = [document.documentElement, document.body, document.querySelector('#room'), document.querySelector('.workspace'), document.querySelector('#factory-stage'), evidence]
    .filter(Boolean)
    .filter(el => el.scrollHeight > el.clientHeight + 2)
    .map(el => el.id || el.className || el.tagName);
  return {
    fill,
    railHeight: rect(rail).height,
    guideHeight: rect(guide).height,
    barInsideStage: bar.getBoundingClientRect().bottom <= stage.getBoundingClientRect().bottom + 1 && bar.getBoundingClientRect().top >= stage.getBoundingClientRect().top - 1,
    bodyPx: parseFloat(body),
    headlinePx: parseFloat(headline),
    figurePx: parseFloat(figure),
    cardCount: cards.length,
    cardText: cards.map(c => c.querySelector('.evidence-headline')?.textContent.trim()),
    crossBandHits,
    unexpectedScroll,
    pageScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight + 2 || document.body.scrollHeight > document.body.clientHeight + 2
  };
})()`;

let ws;
try {
  const portFile = join(scratch, 'browser', 'DevToolsActivePort');
  await until(() => existsSync(portFile), 'browser launch');
  const port = Number(readFileSync(portFile, 'utf8').split('\n')[0]);
  const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
  let next = 0; const pending = new Map();
  ws.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } } });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('Browser evaluation failed'); return r.result?.value; };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: base });
  await until(() => evaluate(`!document.querySelector('#room').hidden`), 'room open');
  await evaluate(`document.querySelector('#guide-start').click()`);
  await until(() => evaluate(`document.body.dataset.guided==='true' && document.querySelector('#guide-title').textContent.includes('Inspect')`), 'guided step 1');

  const results = {};
  for (const [width, height, label] of [[1920, 1080, 'wide'], [1366, 768, 'desktop']]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await delay(200);
    const m = await evaluate(measureScript);
    results[label] = m;
    save(`incident-${label}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
    assert.ok(m.fill >= 0.70, `${label} SVG fill ratio ${m.fill}`);
    assert.ok(m.railHeight <= 48, `${label} rail height ${m.railHeight}`);
    assert.ok(m.guideHeight <= 40, `${label} guide height ${m.guideHeight}`);
    assert.equal(m.barInsideStage, true, `${label} primary action beside stage`);
    assert.ok(m.bodyPx >= 15.5, `${label} body ${m.bodyPx}`);
    assert.ok(m.headlinePx >= 16, `${label} evidence headline ${m.headlinePx}`);
    assert.ok(m.figurePx >= 24, `${label} evidence figure ${m.figurePx}`);
    assert.ok(m.cardCount >= 3, `${label} evidence cards`);
    assert.ok(m.cardText.some(t => /Certificate says/i.test(t)), `${label} certificate card`);
    assert.ok(m.cardText.some(t => /Receiving counted/i.test(t)), `${label} receiving card`);
    assert.equal(m.crossBandHits.length, 0, `${label} overlaps ${JSON.stringify(m.crossBandHits)}`);
    assert.equal(m.pageScroll, false, `${label} page scroll`);
    assert.ok(!m.unexpectedScroll.includes('evidence') && !m.unexpectedScroll.includes('evidence-cards'), `${label} evidence scroll ${m.unexpectedScroll}`);
  }

  save('layout-metrics.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} finally {
  try { ws?.close(); } catch {}
  try { browser.kill(); } catch {}
  try { await app.close(); } catch {}
  await delay(400);
  try { rmSync(scratch, { recursive: true, force: true }); } catch { /* browser profile unlock lag on Windows */ }
}
