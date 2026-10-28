// Browser acceptance audit: built-in Chrome DevTools protocol, zero npm dependencies.
// Requires a running local "npm start" server. On Windows, auto-detects Chrome.
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const base = "http://127.0.0.1:4173";
const outputDir = path.join(root, "docs", "evidence");
const chromePath = process.env.CHROME_BIN || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const pause = ms => new Promise(done => setTimeout(done, ms));
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "ffr-cdp-"));
let chrome, socket;
const fail = message => { throw new Error(message); };
try {
  if (!(await fs.stat(chromePath).catch(() => false))) fail("Chrome binary not found: " + chromePath);
  if (!(await fetch(base + "/api/health").then(r => r.ok).catch(() => false))) fail("Start the app first: npm start");
  chrome = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--window-size=1200,1000", base
  ], { stdio: "ignore", windowsHide: true });
  let port;
  for (let i = 0; i < 100; i++) {
    const value = await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8").catch(() => "");
    if (value.trim()) { port = Number(value.split("\n")[0]); break; }
    await pause(100);
  }
  if (!port) fail("Isolated Chrome did not create a debugging endpoint");
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  const target = targets.find(x => x.type === "page" && x.url.startsWith(base));
  if (!target) fail("Factory page not found in Chrome");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let index = 0;
  const pending = new Map();
  socket.addEventListener("message", e => {
    const packet = JSON.parse(e.data);
    if (!packet.id || !pending.has(packet.id)) return;
    const { resolve, reject, timer } = pending.get(packet.id);
    clearTimeout(timer); pending.delete(packet.id);
    if (packet.error) reject(new Error(packet.error.message));
    else resolve(packet.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++index;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + " timed out")); }, 12000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) fail(r.exceptionDetails.text);
    return r.result.value;
  };
  const screenshot = async filename => {
    await fs.mkdir(outputDir, { recursive: true });
    const response = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
    await fs.writeFile(path.join(outputDir, filename), Buffer.from(response.data, "base64"));
  };
  await send("Page.enable");
  await send("Runtime.enable");
  const loaded = async () => {
    for (let i = 0; i < 70; i++) {
      const result = await evaluate("document.getElementById('metricAffected')?.textContent");
      if (result === "7") return;
      await pause(80);
    }
    fail("Application did not render scenario data");
  };
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send("Page.reload", { ignoreCache: true });
  await loaded();
  const mobile = await evaluate(`({
    viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    affectedJobs: document.getElementById("metricAffected").textContent,
    overflowNodes: Array.from(document.querySelectorAll("body *"))
      .filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 2 && r.width > 0; })
      .slice(0,8).map(el => ({ tag:el.tagName, cls:el.className?.toString()?.slice(0,65), right:Math.round(el.getBoundingClientRect().right) }))
  })`);
  if (mobile.scrollWidth > mobile.viewport + 2) fail("Mobile page overflows viewport: " + JSON.stringify(mobile));
  await screenshot("factory-resilience-mobile.png");

  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.reload", { ignoreCache: true });
  await loaded();
  await screenshot("factory-resilience-desktop.png");
  const corrected = await evaluate(`(() => { document.getElementById("correctBtn").click(); return {
    affected: document.getElementById("metricAffected").textContent,
    cert: document.getElementById("certStatus").textContent
  }; })()`);
  if (corrected.affected !== "0" || corrected.cert !== "FIELDS MATCHED") fail("Correct-certificate interaction failed: " + JSON.stringify(corrected));
  const injected = await evaluate(`(() => { document.getElementById("injectBtn").click(); return document.getElementById("metricAffected").textContent; })()`);
  if (injected !== "7") fail("Reinject interaction failed: " + injected);
  const stock = await evaluate(`(() => { const e=document.getElementById("stockRange"); e.value="42"; e.dispatchEvent(new Event("input",{bubbles:true})); return {
    value:document.getElementById("stockVal").textContent, plans:document.querySelectorAll("[data-plan]").length
  }; })()`);
  if (stock.value !== "42" || stock.plans !== 4) fail("Live simulation control failed: " + JSON.stringify(stock));
  const approved = await evaluate(`(() => {
    document.querySelector("[data-plan]").click();
    if (!document.getElementById("approveDialog").open) return "dialog failed";
    document.getElementById("operatorInput").value="AUDIT USER";
    document.getElementById("confirmApproval").click();
    return document.getElementById("approvalState").textContent;
  })()`);
  if (!approved.includes("AUDIT USER") || !approved.includes("Physical material")) fail("Approval sequence failed: " + approved);
  const invalidated = await evaluate(`(() => {
    const e=document.getElementById("etaRange");e.value="44";e.dispatchEvent(new Event("input",{bubbles:true}));
    return document.getElementById("approvalState").textContent;
  })()`);
  if (!invalidated.includes("No recovery strategy")) fail("Changed assumptions did not invalidate operator decision");
  console.log(JSON.stringify({
    result: "PASS",
    mobile, desktop: "rendered", interaction: "correct/inject/recalculate/approve/invalidate",
    screenshots: ["docs/evidence/factory-resilience-mobile.png", "docs/evidence/factory-resilience-desktop.png"]
  }, null, 2));
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null) chrome.kill();
  await pause(450);
  await fs.rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }).catch(() => {});
}
