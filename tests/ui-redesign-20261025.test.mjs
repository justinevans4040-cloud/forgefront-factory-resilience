import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { consequenceSeries } from "../src/ui-viz.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_IDS = [
  "injectBtn", "correctBtn", "secondShockBtn", "resetBtn", "incidentState",
  "metricOrders", "metricAffected", "metricAffectedCaption", "metricExposure", "metricPlans",
  "heroStatus", "certText", "analyseBtn", "pdfUpload", "samplePdfBtn", "pdfRoute",
  "certStatus", "findings", "packetStatus", "packetContradictions",
  "networkMap", "graphSummary", "impactCaption", "impactPill", "jobRows",
  "stockVal", "stockRange", "etaVal", "etaRange", "outageVal", "outageRange",
  "planCards", "exportBtn", "exportAuditRawBtn", "pmPanel", "kanbanBoard",
  "programPill", "programBridgeSummary", "programFrame",
  "arbitrationPanel", "approvalState", "ledgerStatus", "ledgerVerifyBtn", "eventLog",
  "metaPill", "metaModeNote", "metaBtn", "adversarialBtn", "claimMeter", "claimBlockedCount",
  "aiOutput", "aiTrace", "aiBlocked", "aiRawPanel", "aiRawOutput",
  "askInput", "askBtn", "askOutput", "missionPanel", "proveItBtn", "proveItResults",
  "approveDialog", "approvalTitle", "approvalDescription", "operatorInput",
  "issueToken", "approvalPhrase", "consentHint", "envelopePreview",
  "cancelApproval", "confirmApproval", "crumbPage", "buildTag", "clock",
  "modelStatus", "ledgerIntegrityBanner",
  "consequenceSparkline", "incidentTimeline", "demoStoryRail",
  "planCompare", "impactConstellation", "ledgerChain",
  "plantSchematic", "timeConductor", "tcScrubber", "orderSparklines"
];

const REQUIRED_PAGES = [
  "overview", "evidence", "impact", "recovery", "pm", "kanban",
  "program", "arbitration", "decision", "mission", "proveit"
];

test("pass3 preserves every interactive DOM id in index.html", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  for (const id of REQUIRED_IDS) {
    assert.match(html, new RegExp(`id="${id}"`), `missing id=${id}`);
  }
  for (const page of REQUIRED_PAGES) {
    assert.match(html, new RegExp(`data-page="${page}"`), `missing page ${page}`);
  }
  assert.match(html, /ForgeFront_PM\.html/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com/, "CDN fonts violate CSP font-src self");
  assert.match(html, /Factory Resilience/);
  assert.doesNotMatch(html, /\bAether\b/);
  assert.match(html, /BUILD R18/);
  assert.match(html, /plant-hmi/);
  assert.match(html, /page-index/);
  assert.match(html, /time-conductor/);
  assert.doesNotMatch(html, /theater-mode/);
  assert.doesNotMatch(html, /stage-nav/);
  assert.doesNotMatch(html, /class="band-row"/);
  assert.doesNotMatch(html, /class="page-jump"/);
  assert.doesNotMatch(html, /class="sidebar"/);
  assert.match(html, />ARM</);
  assert.match(html, />COMMIT</);
});

test("styles.css ships Pass-3 calm gray plant HMI tokens", async () => {
  const css = await readFile(join(root, "src/styles.css"), "utf8");
  assert.match(css, /--bg:\s*#2B2E31/i);
  assert.match(css, /--alarm:\s*#D9534F/i);
  assert.match(css, /--amber:\s*#E0A030/i);
  assert.doesNotMatch(css, /--bg:\s*#C8C4BC/i);
  assert.match(css, /plant-hmi/);
  assert.match(css, /time-conductor/);
  assert.match(css, /page-scroll-lock/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /--bg:\s*#0A1628/i);
  assert.doesNotMatch(css, /--copper:\s*#C9894A/i);
  assert.doesNotMatch(css, /--cyan:\s*#5EC8D8/i);
  assert.doesNotMatch(css, /--bg:\s*#050505/i);
  assert.doesNotMatch(css, /--signal:\s*#E5222D/i);
});

test("consequenceSeries responds to blocked vs clear impact", () => {
  const blocked = consequenceSeries({ blocked: true, orderCount: 7, exposureValue: 1_800_000, units: 40 }, 4);
  const clear = consequenceSeries({ blocked: false, orderCount: 0, exposureValue: 0, units: 0 }, 0);
  assert.equal(blocked.length, 12);
  assert.equal(clear.length, 12);
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  assert.ok(avg(blocked) > avg(clear), "blocked series should read higher consequence");
});

test("app.mjs imports ui-viz plant + time conductor helpers", async () => {
  const src = await readFile(join(root, "src/app.mjs"), "utf8");
  assert.match(src, /from\s+["']\.\/ui-viz\.mjs["']/);
  assert.match(src, /renderConsequenceSparkline/);
  assert.match(src, /renderDemoStory/);
  assert.match(src, /renderPlanCompare/);
  assert.match(src, /renderImpactConstellation/);
  assert.match(src, /renderLedgerChain/);
  assert.match(src, /renderPlantSchematic/);
  assert.match(src, /renderTimeConductor/);
  assert.match(src, /renderOrderSparklines/);
});
