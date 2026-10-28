#!/usr/bin/env node
/**
 * Record 1080p demo clips with a visible synthetic cursor overlay (Playwright).
 * Output: demo/01_screen_recordings/*.webm
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = join(root, "demo", "01_screen_recordings");
const port = Number(process.env.DEMO_PORT || 4411);
const base = `http://127.0.0.1:${port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CURSOR_INIT = () => {
  if (window.__ffCursor) return;
  const dot = document.createElement("div");
  dot.id = "ff-demo-cursor";
  Object.assign(dot.style, {
    position: "fixed", width: "18px", height: "18px", borderRadius: "50%",
    border: "2px solid #fff", background: "rgba(255,120,40,0.85)", zIndex: "2147483647",
    pointerEvents: "none", transform: "translate(-50%,-50%)", boxShadow: "0 0 8px rgba(0,0,0,0.45)"
  });
  document.documentElement.appendChild(dot);
  document.addEventListener("mousemove", e => {
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
  }, true);
  window.__ffCursor = dot;
};

async function bootServer() {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), META_BRIEF_MODE: "fixture", MODEL_API_KEY: "" },
    stdio: "ignore"
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + "/api/health")).ok) return child; } catch {}
    await sleep(200);
  }
  child.kill();
  throw new Error("demo server failed to start");
}

async function recordScene(browser, name, steps) {
  const dir = join(outDir, `_tmp_${name}`);
  await mkdir(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir, size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();
  await page.addInitScript(CURSOR_INIT);
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await steps(page);
  await sleep(800);
  const video = page.video();
  await context.close();
  const src = await video.path();
  const dest = join(outDir, `${name}.webm`);
  await writeFile(dest, await import("node:fs/promises").then(m => m.readFile(src)));
  return dest;
}

const scenes = [
  ["01-intro-trust", async page => {
    await sleep(1500);
  }],
  ["02-cert-conflict", async page => {
    await page.getByRole("button", { name: /Inject certificate conflict/i }).click();
    await sleep(2500);
  }],
  ["03-plans-metrics", async page => {
    await page.getByRole("button", { name: /Inject certificate conflict/i }).click().catch(() => {});
    await sleep(800);
    await page.locator(".plan-grid").first().scrollIntoViewIfNeeded();
    await sleep(2000);
    await page.locator("#pm-metrics, .pm-panel, [data-panel='pm']").first().scrollIntoViewIfNeeded().catch(() => page.mouse.wheel(0, 600));
    await sleep(2000);
  }],
  ["04-meta-brief", async page => {
    await page.getByRole("button", { name: /Inject certificate conflict/i }).click().catch(() => {});
    await sleep(600);
    await page.getByRole("button", { name: /Generate brief/i }).click();
    await sleep(3500);
    await page.getByRole("button", { name: /adversarial brief/i }).click();
    await sleep(2500);
  }],
  ["05-consent-kanban", async page => {
    await page.getByRole("button", { name: /Inject certificate conflict/i }).click().catch(() => {});
    await sleep(600);
    await page.getByRole("button", { name: /Review this option/i }).first().click();
    await sleep(1200);
    await page.fill('input[placeholder*="operator" i], #operatorName, input[name="operator"]', "Demo Operator").catch(() => {});
    await page.getByRole("button", { name: /Issue review token/i }).click();
    await sleep(1500);
    await page.getByRole("button", { name: /Record scenario acceptance/i }).click().catch(() => {});
    await sleep(2000);
  }],
  ["06-prove-it", async page => {
    await page.getByRole("button", { name: /Prove it/i }).click();
    await sleep(4000);
  }]
];

const server = await bootServer();
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const recorded = [];
try {
  for (const [name, fn] of scenes) {
    recorded.push({ name, path: await recordScene(browser, name, fn) });
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(JSON.stringify({ outDir, recorded }, null, 2));
