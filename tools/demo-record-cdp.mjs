#!/usr/bin/env node
/**
 * Demo screen recordings (1080p) via Chrome CDP + X11 grab + synthetic cursor overlay.
 * Playwright npm install is BLOCKED in this environment (registry ECONNRESET); this is the
 * verified fallback using the same UI selectors as tools/browser-smoke.mjs.
 *
 * Run: xvfb-run -a -s "-screen 0 1920x1080x24" node tools/demo-record-cdp.mjs
 */
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "./browser-smoke.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = join(root, "demo", "01_screen_recordings");
const sleep = ms => new Promise(r => setTimeout(r, ms));

class CdpSession {
  constructor(ws) {
    this.ws = ws; this.nextId = 0; this.pending = new Map();
    ws.addEventListener("message", ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  evaluate(expression) {
    return this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
      .then(r => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result?.value; });
  }
}

async function connectCdp(port) {
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  const target = list.find(t => t.type === "page") || list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  const cdp = new CdpSession(ws);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  return { cdp, ws };
}

async function injectCursor(cdp) {
  await cdp.evaluate(`(() => {
    if (window.__ffCursor) return;
    const dot = document.createElement('div');
    Object.assign(dot.style, { position:'fixed', width:'18px', height:'18px', borderRadius:'50%', border:'2px solid #fff',
      background:'rgba(255,120,40,0.9)', zIndex:'2147483647', pointerEvents:'none', transform:'translate(-50%,-50%)',
      boxShadow:'0 0 10px rgba(0,0,0,0.5)' });
    document.documentElement.appendChild(dot);
    document.addEventListener('mousemove', e => { dot.style.left = e.clientX+'px'; dot.style.top = e.clientY+'px'; }, true);
    window.__ffCursor = dot;
  })()`);
}

function startFfmpeg(dest) {
  const display = process.env.DISPLAY || ":99";
  const proc = spawn("ffmpeg", [
    "-y", "-f", "x11grab", "-draw_mouse", "1", "-video_size", "1920x1080", "-framerate", "30",
    "-i", `${display}.0+0,0`, "-c:v", "libvpx-vp9", "-b:v", "2M", dest
  ], { stdio: ["pipe", "ignore", "ignore"] });
  return proc;
}

async function recordScene(cdp, name, steps, seconds = 14) {
  const dest = join(outDir, `${name}.webm`);
  const ff = startFfmpeg(dest);
  await sleep(400);
  await cdp.send("Page.navigate", { url: cdp.baseUrl });
  await sleep(1200);
  await injectCursor(cdp);
  await steps(cdp);
  await sleep(seconds * 1000);
  ff.stdin.write("q");
  await new Promise(r => ff.on("close", r));
  return dest;
}

async function main() {
  if (typeof WebSocket === "undefined") throw new Error("WebSocket required (Node 20+)");
  const chrome = await findChrome();
  if (!chrome) throw new Error("Chrome not found");
  await mkdir(outDir, { recursive: true });
  const appPort = 4411;
  const debugPort = 9333;
  const work = await mkdtemp(join(tmpdir(), "ff-demo-rec-"));
  const baseUrl = `http://127.0.0.1:${appPort}`;
  const server = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(appPort), META_BRIEF_MODE: "sample", MODEL_API_KEY: "", AUDIT_LEDGER_PATH: join(work, "ledger.jsonl") },
    stdio: "ignore"
  });
  const browser = spawn(chrome, [
    `--remote-debugging-port=${debugPort}`, "--no-sandbox", "--disable-dev-shm-usage", "--no-first-run",
    `--user-data-dir=${join(work, "profile")}`, "--window-size=1920,1080", "--window-position=0,0", "about:blank"
  ], { stdio: "ignore", env: { ...process.env } });
  let ws;
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(`${baseUrl}/api/health`)).ok) break; } catch {}
      await sleep(200);
    }
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok) break; } catch {}
      await sleep(200);
    }
    const conn = await connectCdp(debugPort);
    ws = conn.ws;
    const cdp = conn.cdp;
    cdp.baseUrl = baseUrl;
    const click = sel => cdp.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
    const scenes = [];
    scenes.push(await recordScene(cdp, "01-intro-trust", async () => {}, 10));
    scenes.push(await recordScene(cdp, "02-cert-conflict", async () => { await click("#injectBtn"); }, 16));
    scenes.push(await recordScene(cdp, "03-plans-metrics", async () => {
      await click("#injectBtn");
      await sleep(800);
      await cdp.evaluate("window.scrollTo(0, 900)");
    }, 20));
    scenes.push(await recordScene(cdp, "04-meta-brief", async () => {
      await click("#injectBtn");
      await sleep(500);
      await click("#metaBtn");
      await sleep(2000);
      await click("#adversarialBtn");
    }, 22));
    scenes.push(await recordScene(cdp, "05-consent-kanban", async () => {
      await click("#injectBtn");
      await sleep(500);
      const planId = await cdp.evaluate(`document.querySelector('.plan.best [data-plan]')?.dataset.plan`);
      await click(`[data-plan="${planId}"]`);
      await cdp.evaluate(`document.getElementById('operatorInput').value = 'Demo Operator'`);
      await click("#issueToken");
      await sleep(1000);
      await cdp.evaluate(`document.getElementById('approvalPhrase').value = 'APPROVE ${planId}'`);
      await click("#confirmApproval");
      await sleep(1500);
      await click(".kanban-move");
    }, 24));
    scenes.push(await recordScene(cdp, "06-prove-it", async () => {
      await click("#injectBtn");
      await sleep(400);
      await click("#proveItBtn");
    }, 18));
    const meta = [];
    for (const p of scenes) {
      const dur = await new Promise((res, rej) => {
        const proc = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", p]);
        let out = "";
        proc.stdout.on("data", d => out += d);
        proc.on("close", c => c === 0 ? res(Number(out.trim())) : rej(new Error("ffprobe failed")));
      });
      meta.push({ file: p.replace(root + "/", ""), durationSec: Math.round(dur * 10) / 10 });
    }
    await writeFile(join(root, "demo", "01_screen_recordings", "clips-meta.json"), JSON.stringify(meta, null, 2));
    console.log(JSON.stringify({ ok: true, scenes: meta }, null, 2));
  } finally {
    ws?.close();
    browser.kill();
    server.kill();
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1); });
}
