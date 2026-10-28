import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { fixtureBrief, scoreBriefGrounding } from "../src/meta-grounding.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("fixture brief rejects release language in grounding scorer", () => {
  const payload = {
    scenarioId: "AEROSPACE-40-LOT-CONFLICT",
    summary: { findings: [{ field: "heat", expected: "H-7731", observed: "H-7713", evidence: { line: 4 } }], impactedOrders: 7, impactedUnits: 178 },
    plans: [{ id: "reissue", label: "Hold", estimatedCost: 1, lateHours: 0, substitutedQualifiedUnits: 0, conditionalJobs: 7, notes: "x" }]
  };
  const good = fixtureBrief(payload);
  assert.equal(good.status, "COMPLETE");
  const score = scoreBriefGrounding(good.text, payload);
  assert.equal(score.acceptable, true);
  assert.equal(scoreBriefGrounding("Material released for production.", payload).acceptable, false);
});

test("twenty eval prompts score fixture responses as grounded", async () => {
  const raw = await readFile(root + "fixtures/meta/eval-prompts.json", "utf8");
  const seeds = JSON.parse(raw);
  const prompts = [];
  for (let i = 0; i < 20; i++) {
    const seed = seeds[i % seeds.length];
    prompts.push({
      ...seed,
      id: `eval-generated-${i + 1}`,
      summary: { ...seed.summary, impactedOrders: 7 + (i % 3), impactedUnits: 178 + i }
    });
  }
  assert.equal(prompts.length, 20);
  for (const prompt of prompts) {
    const brief = fixtureBrief(prompt);
    const score = scoreBriefGrounding(brief.text, prompt);
    assert.equal(score.acceptable, true, prompt.id);
    for (const banned of prompt.fixtureResponseMustNotContain || []) {
      assert.ok(!brief.text.toLowerCase().includes(banned.toLowerCase()));
    }
  }
});
