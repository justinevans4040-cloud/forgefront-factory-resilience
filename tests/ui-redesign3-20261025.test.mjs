import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isAllowedStaticRel } from "../src/security/http-utils.mjs";
import {
  renderOrderSparklines,
  renderTimeConductor,
  resolveDemoBeat
} from "../src/ui-viz.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("pass3 allowlist still serves ui-viz and no new unlisted src paths required", () => {
  assert.equal(isAllowedStaticRel("src/ui-viz.mjs"), true);
  assert.equal(isAllowedStaticRel("src/styles.css"), true);
  assert.equal(isAllowedStaticRel("src/app.mjs"), true);
  assert.equal(isAllowedStaticRel("index.html"), true);
  assert.equal(isAllowedStaticRel("vendor/command-center-v3/ForgeFront_PM.html"), true);
});

test("pass3 two-key dialog keeps issueToken + confirmApproval ids", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  assert.match(html, /id="issueToken"[^>]*>ARM</);
  assert.match(html, /id="confirmApproval"[^>]*>COMMIT</);
  assert.match(html, /id="approveDialog"/);
  assert.match(html, /cite-chip|action-card|actionPlanSelect/);
});

test("pass3b Program PM uses neutral dark gray tokens", async () => {
  const html = await readFile(join(root, "vendor/command-center-v3/ForgeFront_PM.html"), "utf8");
  assert.match(html, /--bg:#2B2E31/);
  assert.match(html, /--panel:#34383C/);
  assert.match(html, /pass3-ia:plant-hmi|--pass3-ia/);
  assert.doesNotMatch(html, /--bg:#C8C4BC/);
  assert.doesNotMatch(html, /\bAether\b/);
});

test("resolveDemoBeat and time conductor track options beat", () => {
  const { active, order } = resolveDemoBeat({
    impact: { blocked: true },
    plans: [{ id: "hybrid" }],
    selected: "hybrid",
    events: []
  });
  assert.ok(order.includes("options"));
  assert.equal(active, "options");

  const host = {
    querySelector: sel => {
      if (sel === "#tcScrubber") return { value: "0" };
      if (sel === "#tcBeatLabel") return { textContent: "" };
      return null;
    },
    querySelectorAll: () => []
  };
  // document.body may be undefined in node — stub via global
  const prev = globalThis.document;
  globalThis.document = {
    body: { dataset: {} },
    getElementById: () => null
  };
  try {
    const beat = renderTimeConductor(host, { impact: { blocked: true }, plans: [{ id: "a" }], selected: "a" }, "options");
    assert.equal(beat, "options");
  } finally {
    globalThis.document = prev;
  }
});

test("order sparklines drill path uses engine schedule lateHours", () => {
  const el = { innerHTML: "", onclick: null };
  renderOrderSparklines(el, [
    {
      id: "hybrid",
      label: "Priority recovery split",
      schedule: [{ id: "WO-1", lateHours: 2.5 }],
      allocations: [{ jobId: "WO-1", status: "AVAILABLE FOR REASSIGNMENT" }]
    }
  ], { jobs: [{ id: "WO-1" }, { id: "WO-2" }] }, { blocked: true, jobIds: ["WO-1"] });
  assert.match(el.innerHTML, /data-job="WO-1"/);
  assert.match(el.innerHTML, /data-late="2\.5"/);
});
