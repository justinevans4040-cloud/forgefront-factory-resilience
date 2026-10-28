import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  consequenceSeries,
  renderPlanCompare,
  renderImpactConstellation,
  renderLedgerChain,
  renderPlantSchematic,
  DEMO_BEATS
} from "../src/ui-viz.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("pass3 plan doc names Plant HMI / ISA-101", async () => {
  const md = await readFile(join(root, "docs/superpowers/plans/2026-10-25-pass3-plant-hmi.md"), "utf8");
  assert.match(md, /Plant HMI|ISA-101/i);
  assert.doesNotMatch(md, /\bAether\b/);
});

test("pass3 index uses plant-hmi + time conductor (not Pass-2 theater ribbon)", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  assert.match(html, /plant-hmi/);
  assert.match(html, /time-conductor|id="timeConductor"/);
  assert.match(html, /id="plantSchematic"/);
  assert.match(html, /page-index/);
  assert.doesNotMatch(html, /theater-mode/);
  assert.doesNotMatch(html, /river-hero/);
  assert.doesNotMatch(html, /stage-nav/);
  assert.doesNotMatch(html, /class="band-row"/);
  assert.doesNotMatch(html, /class="page-jump"/);
  assert.doesNotMatch(html, /<aside class="sidebar"/);
  assert.match(html, /id="planCompare"/);
  assert.match(html, /id="impactConstellation"/);
  assert.match(html, /id="ledgerChain"/);
  assert.match(html, /BUILD R18/);
});

test("pass3b palette is neutral dark gray; forbids beige and Pass-1/2 chrome", async () => {
  const css = await readFile(join(root, "src/styles.css"), "utf8");
  assert.match(css, /--bg:\s*#2B2E31/);
  assert.match(css, /--surface:\s*#34383C/);
  assert.match(css, /--surface2:\s*#3D4146/);
  assert.match(css, /--line:\s*#4A4F55/);
  assert.match(css, /--alarm:\s*#D9534F/);
  assert.match(css, /--amber:\s*#E0A030/);
  assert.doesNotMatch(css, /--bg:\s*#C8C4BC/);
  assert.doesNotMatch(css, /--bg:\s*#0A1628/);
  assert.doesNotMatch(css, /--copper:\s*#C9894A/);
  assert.doesNotMatch(css, /--cyan:\s*#5EC8D8/);
  assert.doesNotMatch(css, /--signal:\s*#E5222D/i);
  assert.doesNotMatch(css, /--bg:\s*#050505/i);
  assert.doesNotMatch(css, /--forge:\s*#B5121B/i);
});

test("pass3 viz helpers emit plant + gapper SVG from real plan/impact inputs", () => {
  assert.deepEqual(DEMO_BEATS, ["disruption", "analysis", "options", "consent", "ledger"]);

  const series = consequenceSeries({ blocked: true, orderCount: 7, exposureValue: 900_000, units: 24 }, 4);
  assert.equal(series.length, 12);

  const plantEl = { innerHTML: "" };
  renderPlantSchematic(plantEl, {
    incomingLotId: "LOT-TI-001",
    machines: [{ id: "VF-2" }, { id: "VF-6" }, { id: "UMC-750" }, { id: "EC-400" }],
    jobs: Array.from({ length: 40 }, (_, i) => ({ id: `WO-${i + 1}` }))
  }, { blocked: true, orderCount: 7, jobIds: ["WO-1", "WO-2"] }, "disruption");
  assert.match(plantEl.innerHTML, /<svg/);
  assert.match(plantEl.innerHTML, /BAD|HOLD/);
  assert.match(plantEl.innerHTML, /WO-1/);

  const planEl = { innerHTML: "" };
  renderPlanCompare(planEl, [
    { id: "hold", label: "Hold", estimatedCost: 120000, schedule: [{ id: "WO-1", lateHours: 4 }] },
    { id: "hybrid", label: "Hybrid", estimatedCost: 48000, schedule: [{ id: "WO-1", lateHours: 1 }], _selected: true }
  ], { blocked: true, exposureValue: 900000 }, { assumptions: { latenessCostPerHour: 120 } }, "hybrid");
  assert.match(planEl.innerHTML, /<svg/);
  assert.match(planEl.innerHTML, /do nothing|DO NOTHING/i);
  assert.match(planEl.innerHTML, /Hybrid/);

  const netEl = { innerHTML: "" };
  renderImpactConstellation(netEl, { blocked: true, orderCount: 5 }, [
    { id: "WO-1", held: true },
    { id: "WO-2", held: true }
  ]);
  assert.match(netEl.innerHTML, /HOLD|polygon|rect/);

  const ledEl = { innerHTML: "" };
  renderLedgerChain(ledEl, [{ message: "Inject conflict" }, { message: "Plan selected" }], { ok: true, tip: "abcdef0123456789" });
  assert.match(ledEl.innerHTML, /tamper-evident/);
});

test("server BUILD_ROUND is r18", async () => {
  const src = await readFile(join(root, "server.mjs"), "utf8");
  assert.match(src, /BUILD_ROUND\s*=\s*"r18"/);
  assert.match(src, /r18\+\$\{PROGRAM_INTEGRATION\}/);
});
