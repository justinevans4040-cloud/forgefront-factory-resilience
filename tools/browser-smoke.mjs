#!/usr/bin/env node
/**
 * Headless Chrome/Edge smoke test of the full demo — no npm dependencies.
 * Finds Chrome or Edge on Linux, macOS and Windows (or CHROME_PATH). Skips with exit 0
 * only when no browser or no WebSocket client exists (Node 20: run with --experimental-websocket).
 *
 * Clicks through: sample PDF → sample brief (tool trace) → adversarial brief (meter > 0) →
 * Little's Law table → two-step consent → Kanban (numeric due hours) → card move →
 * ledger verify → second shock (REOPENED, brief cleared, approval revoked) → re-approve →
 * matching cert (CLOSED) → export. Fails on any console error or uncaught exception.
 */
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { access, mkdtemp, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function chromeCandidates(env = process.env, platform = process.platform) {
  const list = [];
  if (env.CHROME_PATH) list.push(env.CHROME_PATH);
  if (platform === "win32") {
    for (const base of [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter(Boolean)) {
      list.push(join(base, "Google", "Chrome", "Application", "chrome.exe"));
      list.push(join(base, "Microsoft", "Edge", "Application", "msedge.exe"));
      list.push(join(base, "Chromium", "Application", "chrome.exe"));
    }
  } else if (platform === "darwin") {
    list.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Chromium.app/Contents/MacOS/Chromium");
  }
  const names = platform === "win32" ? ["chrome.exe", "msedge.exe"] : ["google-chrome-stable", "google-chrome", "chromium-browser", "chromium", "microsoft-edge"];
  for (const dir of String(env.PATH || "").split(delimiter).filter(Boolean)) for (const n of names) list.push(join(dir, n));
  if (platform !== "win32") list.push("/usr/bin/google-chrome", "/usr/bin/chromium", "/snap/bin/chromium");
  return [...new Set(list)];
}

export async function findChrome(env = process.env, platform = process.platform) {
  for (const bin of chromeCandidates(env, platform)) {
    try {
      await access(bin, platform === "win32" ? constants.F_OK : constants.X_OK);
      return bin;
    } catch {}
  }
  return null;
}

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    ws.addEventListener("message", ev => {
      const msg = JSON.parse(ev.data);
      if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
        this.consoleErrors.push(msg.params?.args?.map(a => a.value || a.description).join(" "));
      }
      if (msg.method === "Runtime.exceptionThrown") {
        this.consoleErrors.push(`Uncaught: ${msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text}`);
      }
      if (msg.method === "Log.entryAdded" && msg.params?.entry?.level === "error") this.consoleErrors.push(msg.params.entry.text);
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
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result?.value;
  }
}

async function connectCdp(port) {
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  const target = list.find(t => t.type === "page") || list[0];
  if (!target?.webSocketDebuggerUrl) throw new Error("No CDP page target");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve); ws.addEventListener("error", reject); });
  const cdp = new CdpSession(ws);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Log.enable");
  return { cdp, ws };
}

async function waitFor(fn, label, timeoutMs = 15000, stepMs = 100) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await fn()) return;
    await sleep(stepMs);
  }
  throw new Error(`waitFor timeout: ${label}`);
}

function assert(cond, message) {
  if (!cond) throw new Error(`ASSERT: ${message}`);
}

export async function runDemoSteps(cdp, log = () => {}) {
  const ev = expr => cdp.evaluate(expr);
  const text = sel => ev(`document.querySelector(${JSON.stringify(sel)})?.textContent || ""`);
  const click = sel => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
  const step = async (name, fn) => { await fn(); log(`  ✓ ${name}`); };

  await step("initial render: 40 orders, 7 impacted jobs, 4 plans", async () => {
    await waitFor(() => ev(`document.querySelectorAll('[data-plan]').length === 4`), "plans");
    assert((await text("#metricOrders")) === "40", "40 orders");
    assert((await text("#metricAffected")) === "7", "7 impacted jobs");
  });
  await step("sample-mode labels everywhere (pill, button, sidebar)", async () => {
    await waitFor(async () => (await text("#modelStatus")).includes("Sample mode (no live Muse Spark key)"), "sidebar label");
    assert((await text("#metaPill")).includes("SAMPLE MODE"), "pill says sample mode");
    assert((await text("#metaBtn")).includes("Sample mode (no live Muse Spark key)"), "button says sample mode");
  });
  await step("bundled compressed PDF parses through the PDF pipeline", async () => {
    await click("#samplePdfBtn");
    await waitFor(async () => (await text("#pdfRoute")).includes("PROCESSING"), "pdf route PROCESSING");
    assert((await text("#pdfRoute")).includes("heat=H-7713"), "heat extracted from compressed PDF");
  });
  await step("sample brief: claim-checked, tool trace, meter = 0", async () => {
    await click("#metaBtn");
    await waitFor(async () => (await text("#aiOutput")).includes("CLAIM-CHECKED"), "brief");
    assert((await text("#aiOutput")).includes("Sample mode (no live Muse Spark key)"), "brief labeled sample");
    assert((await ev(`document.querySelectorAll('#aiTrace li').length`)) >= 3, "tool trace >= 3");
    assert((await text("#claimBlockedCount")) === "0", "meter 0 for grounded brief");
  });
  await step("adversarial brief: meter re-renders with blocked sentences", async () => {
    await click("#adversarialBtn");
    await waitFor(async () => Number(await text("#claimBlockedCount")) > 0, "meter > 0");
    assert((await ev(`document.querySelectorAll('#aiBlocked li').length`)) === Number(await text("#claimBlockedCount")), "blocked list matches meter");
  });
  await step("AI-vs-engine arbitration rendered from the adversarial brief", async () => {
    await waitFor(() => ev(`document.querySelectorAll('#arbitrationPanel .arb-card[data-status="RESOLVED"]').length >= 6`), "6 RESOLVED (engine wins)");
    assert((await ev(`document.querySelectorAll('#arbitrationPanel .arb-card[data-status="MERGED"]').length`)) >= 1, "agreeing sentences MERGED");
  });
  await step("ask ladder: engine answer, Muse Spark escalation logged, then cache hit", async () => {
    await ev(`document.getElementById('askInput').value = 'Which recovery option is cheapest?'`);
    await click("#askBtn");
    await waitFor(() => ev(`document.querySelector('#askOutput .ask-answer')?.dataset.provenance === 'engine'`), "engine provenance");
    assert((await text("#askOutput")).includes("cheapest-plan"), "resolver named");
    const q = "Why is the priority split better than holding for verification?";
    await click(`.ask-chip[data-q="${q}"]`);
    await waitFor(() => ev(`document.querySelector('#askOutput .ask-answer')?.dataset.provenance === 'muse-spark'`), "muse provenance");
    assert((await text("#askOutput")).includes("NEEDS_NARRATIVE_SYNTHESIS"), "reason shown");
    assert((await text("#askOutput")).includes("Sample mode (no live Muse Spark key)"), "sample label on muse answer");
    await click(`.ask-chip[data-q="${q}"]`);
    await waitFor(() => ev(`document.querySelector('#askOutput .ask-answer')?.dataset.provenance === 'cache'`), "cache provenance");
    await click('.ask-chip[data-q="Approve material release for LOT-TI-001 now"]');
    await waitFor(async () => (await text("#askOutput")).includes("action-request"), "action request refused by engine");
  });
  await step("Little's Law per-cell table rendered (4 cells)", async () => {
    assert((await ev(`document.querySelectorAll('#littlesLawTable tbody tr').length`)) === 4, "4 cell rows");
  });
  await step("two-step consent: issue token → typed phrase → accepted", async () => {
    const planId = await ev(`document.querySelector('.plan.best [data-plan]')?.dataset.plan`);
    assert(planId, "best plan button");
    await click(`[data-plan="${planId}"]`);
    await ev(`document.getElementById('operatorInput').value = 'Justin Evans'`);
    await click("#issueToken");
    await waitFor(() => ev(`!document.getElementById('confirmApproval').disabled`), "token issued");
    await ev(`document.getElementById('approvalPhrase').value = 'APPROVE ${planId}'`);
    await click("#confirmApproval");
    await waitFor(() => ev(`document.querySelectorAll('.kanban-card').length >= 5`), "kanban cards");
    assert((await ev(`document.getElementById('incidentState').dataset.state`)) === "ACCEPTED_SCENARIO", "badge accepted");
    assert((await text("#approvalState")).includes("TTL 15 min"), "consent envelope shown (15 min TTL)");
  });
  await step("Kanban due hours are numeric (no null/undefined)", async () => {
    const dues = await ev(`[...document.querySelectorAll('.due-hour')].map(e => e.textContent)`);
    assert(dues.length >= 5 && dues.every(d => /^\d+$/.test(d)), `numeric due hours: ${dues}`);
    assert(!/nullh|undefinedh|NaN/.test(await text("#kanbanBoard")), "no null/undefined in board");
  });
  await step("Kanban move recorded with effect event + idempotency key", async () => {
    await click(".kanban-move");
    await waitFor(async () => (await text("#eventLog")).includes("moved a Kanban card"), "move event");
    assert((await text("#eventLog")).includes("idempotency key move-"), "idempotency key logged");
  });
  await step("mission chain: intent → plan → approval → effect recorded", async () => {
    await waitFor(() => ev(`(() => { const c = document.querySelector('#missionPanel .mission-card'); return c && ['intent','plan','approval','effect'].every(s => c.querySelector('.stage[data-stage="' + s + '"]').classList.contains('done')); })()`), "4 stages done");
    assert((await text("#missionPanel")).includes("chain verified"), "chain verified");
  });
  await step("ledger verified from disk on demand", async () => {
    await click("#ledgerVerifyBtn");
    await waitFor(async () => (await text("#eventLog")).includes("re-verified from disk"), "verify event");
    assert((await ev(`document.getElementById('ledgerStatus').dataset.ok`)) === "1", "ledger ok");
  });
  await step("second shock: REOPENED, brief cleared, approval revoked", async () => {
    await click("#secondShockBtn");
    await waitFor(() => ev(`document.getElementById('incidentState').dataset.state === 'REOPENED'`), "REOPENED badge");
    assert((await text("#aiOutput")).includes("Scenario changed"), "brief cleared");
    assert((await text("#approvalState")).includes("No recovery strategy accepted"), "approval cleared");
    assert((await text("#kanbanBoard")).includes("unlocks after two-step"), "board gated again");
    await waitFor(() => ev(`document.querySelector('#missionPanel .mission-card[data-complete="1"]') !== null`), "first mission complete (SUPERSEDED outcome)");
    await waitFor(() => ev(`document.querySelectorAll('#arbitrationPanel .arb-card').length > 0 && [...document.querySelectorAll('#arbitrationPanel .arb-card')].some(c => c.textContent.includes('HAAS-EC400'))`), "EC-400 contention arbitrated");
  });
  await step("re-approve after shock (operator bound to session, token auto-issued)", async () => {
    const planId = await ev(`document.querySelector('.plan.best [data-plan]')?.dataset.plan`);
    await click(`[data-plan="${planId}"]`);
    await waitFor(() => ev(`!document.getElementById('confirmApproval').disabled`), "token auto-issued");
    assert((await ev(`document.getElementById('operatorInput').readOnly`)) === true, "operator locked");
    await ev(`document.getElementById('approvalPhrase').value = 'APPROVE ${planId}'`);
    await click("#confirmApproval");
    await waitFor(() => ev(`document.getElementById('incidentState').dataset.state === 'ACCEPTED_SCENARIO'`), "accepted again");
  });
  await step("matching cert closes the document conflict → mission outcome INCIDENT_CLOSED", async () => {
    await click("#correctBtn");
    await waitFor(async () => (await text("#incidentState")).includes("CHECKED FIELDS MATCH"), "CLOSED badge");
    await waitFor(async () => (await text("#missionPanel .mission-card")).includes("INCIDENT_CLOSED"), "latest mission closed by server re-check");
    assert((await ev(`document.querySelector('#missionPanel .mission-card').dataset.complete`)) === "1", "all five stages present");
  });
  await step("Prove it: 5/5 live judge checks pass", async () => {
    await click("#proveItBtn");
    await waitFor(() => ev(`document.getElementById('proveItResults').dataset.status === 'ALL_PASSED'`), "ALL_PASSED", 30000);
    assert((await ev(`document.querySelectorAll('#proveItResults > li.pass').length`)) === 5, "5 passes");
  });
  await step("export evidence report", async () => {
    await click("#exportBtn");
    await waitFor(async () => (await text("#eventLog")).includes("exported"), "export event");
  });
}

async function main() {
  if (typeof WebSocket === "undefined") {
    console.log("SKIP: WebSocket client unavailable in this Node build (Node 20: node --experimental-websocket tools/browser-smoke.mjs)");
    process.exit(0);
  }
  const chrome = await findChrome();
  if (!chrome) {
    console.log("SKIP: Chrome/Edge not found — set CHROME_PATH to run the browser smoke");
    process.exit(0);
  }
  const appPort = 24000 + Math.floor(Math.random() * 5000);
  const debugPort = 30000 + Math.floor(Math.random() * 5000);
  const work = await mkdtemp(join(tmpdir(), "ff-smoke-"));
  const baseUrl = `http://127.0.0.1:${appPort}`;
  console.log(`Browser: ${chrome}`);
  const server = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(appPort), META_BRIEF_MODE: "sample", MODEL_API_KEY: "", AUDIT_LEDGER_PATH: join(work, "ledger.jsonl") },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const browser = spawn(chrome, [`--remote-debugging-port=${debugPort}`, "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage", "--no-first-run", `--user-data-dir=${join(work, "profile")}`, "about:blank"], { stdio: "ignore" });
  let ws;
  let code = 0;
  try {
    await waitFor(async () => { try { return (await fetch(`${baseUrl}/api/health`)).ok; } catch { return false; } }, "app health", 20000);
    await waitFor(async () => { try { return (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok; } catch { return false; } }, "browser CDP", 20000);
    let cdp;
    ({ cdp, ws } = await connectCdp(debugPort));
    await cdp.send("Page.navigate", { url: `${baseUrl}/` });
    await runDemoSteps(cdp, m => console.log(m));
    await sleep(300);
    const errors = cdp.consoleErrors.filter(Boolean);
    if (errors.length) {
      console.error("Browser console errors:", errors);
      code = 1;
    } else {
      console.log("OK: browser smoke passed — full demo, 0 console errors");
    }
  } catch (error) {
    console.error("Browser smoke failed:", error.message);
    code = 1;
  } finally {
    ws?.close();
    browser.kill();
    server.kill();
    await sleep(300);
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
  process.exit(code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
