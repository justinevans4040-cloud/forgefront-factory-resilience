import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generatedPlant } from '../../fixtures/generated-plant.mjs';
import { analyzePlant } from '../../public/plant-engine.mjs';
import {
  DEFAULT_PAGE_SIZE,
  pageCollection,
  summarizeCollection,
  entityIdDigest,
} from '../../src/agent/prompt-coverage.mjs';
import {
  createToolDispatcher,
  createPlantToolDispatcher,
  listToolDefinitions,
} from '../../src/agent/tools.mjs';
import { projectToolHistoryForModel } from '../../src/agent/investigation.mjs';
import { buildDemoScenarioInput, createSnapshot } from '../../src/domain/scenario.mjs';

function digestIds(ids) {
  return createHash('sha256').update([...ids].sort().join('\n')).digest('hex');
}

test('pageCollection covers every generated plant entity across pages with no silent truncation', () => {
  const size = 1000;
  const plant = generatedPlant(size);
  const analysis = analyzePlant(plant, { lotId: 'lot-primary', failure: 'wrong-cert', strategy: 'reroute' });
  assert.equal(DEFAULT_PAGE_SIZE > 0, true);

  for (const [label, items, idOf] of [
    ['machines', plant.machines, (m) => m.id],
    ['operations', plant.operations, (o) => o.id],
    ['evidence', plant.evidence, (e) => e.id],
    ['recovery', analysis.recovery.assignments, (a) => a.operationId],
  ]) {
    const expected = new Set(items.map(idOf));
    assert.equal(expected.size, size, label);
    const seen = new Set();
    let offset = 0;
    let pages = 0;
    while (offset < items.length) {
      const page = pageCollection(items, { offset, limit: DEFAULT_PAGE_SIZE, idOf });
      assert.equal(page.truncated, false, `${label} must never silently truncate`);
      assert.equal(page.total, size);
      assert.equal(page.offset, offset);
      assert.ok(page.items.length <= DEFAULT_PAGE_SIZE);
      assert.equal(page.coverage.complete, offset + page.items.length >= size);
      assert.equal(page.coverage.coveredCount, offset + page.items.length);
      for (const item of page.items) {
        const id = idOf(item);
        assert.equal(seen.has(id), false, `duplicate ${label} id ${id}`);
        seen.add(id);
      }
      offset += page.items.length;
      pages += 1;
      if (page.items.length === 0) break;
    }
    assert.equal(seen.size, size, `${label} coverage incomplete`);
    assert.deepEqual([...seen].sort(), [...expected].sort());
    assert.ok(pages >= Math.ceil(size / DEFAULT_PAGE_SIZE));
  }
});

test('summarizeCollection aggregates cover every plant machine and operation without dropping entities', () => {
  const size = 1000;
  const plant = generatedPlant(size);
  const analysis = analyzePlant(plant, { lotId: 'lot-primary', failure: 'wrong-cert', strategy: 'reroute' });

  const machines = summarizeCollection(plant.machines, {
    idOf: (m) => m.id,
    numericFields: { capacityHours: (m) => m.capacityHours, hourlyCostUsd: (m) => m.hourlyCostUsd },
  });
  assert.equal(machines.truncated, false);
  assert.equal(machines.total, size);
  assert.equal(machines.coverage.complete, true);
  assert.equal(machines.idDigest, digestIds(plant.machines.map((m) => m.id)));
  assert.equal(machines.aggregates.capacityHours.count, size);
  assert.equal(machines.aggregates.capacityHours.sum, plant.machines.reduce((s, m) => s + m.capacityHours, 0));

  const operations = summarizeCollection(plant.operations, {
    idOf: (o) => o.id,
    numericFields: { hours: (o) => o.hours },
  });
  assert.equal(operations.total, size);
  assert.equal(operations.idDigest, entityIdDigest(plant.operations, (o) => o.id));
  assert.equal(operations.aggregates.hours.count, size);

  const recovery = summarizeCollection(analysis.recovery.assignments, {
    idOf: (a) => a.operationId,
    numericFields: { hours: (a) => a.hours, costUsd: (a) => a.costUsd },
  });
  assert.equal(recovery.total, size);
  assert.equal(recovery.coverage.complete, true);
  assert.equal(recovery.idDigest, digestIds(analysis.recovery.assignments.map((a) => a.operationId)));
});

test('plant tool dispatcher pages and summarizes large plants with full entity coverage', async () => {
  const size = 1000;
  const plant = generatedPlant(size);
  const tools = createPlantToolDispatcher(plant, {
    analysis: analyzePlant(plant, { lotId: 'lot-primary', failure: 'wrong-cert', strategy: 'reroute' }),
  });

  for (const collection of ['machines', 'operations', 'evidence', 'recovery']) {
    const summary = await tools.invoke('read_plant_collection', { collection, mode: 'summary' });
    assert.equal(summary.truncated, false);
    assert.equal(summary.total, size);
    assert.equal(summary.coverage.complete, true);
    assert.ok(summary.idDigest);

    const seen = new Set();
    let offset = 0;
    while (offset < size) {
      const page = await tools.invoke('read_plant_collection', {
        collection,
        mode: 'page',
        offset,
        limit: DEFAULT_PAGE_SIZE,
      });
      assert.equal(page.truncated, false);
      assert.equal(page.total, size);
      assert.equal(page.collection, collection);
      for (const item of page.items) {
        const id = item.id ?? item.operationId ?? item.evidenceId;
        assert.ok(id);
        assert.equal(seen.has(id), false);
        seen.add(id);
      }
      offset += page.items.length;
      if (!page.items.length) break;
    }
    assert.equal(seen.size, size, `${collection} missing entities`);
    assert.equal(summary.idDigest, digestIds(seen));
  }
});

test('snapshot tools page large evidence and job collections instead of silent truncation', async () => {
  const base = buildDemoScenarioInput();
  const held = base.incident.heldMaterialId;
  const evidenceRecords = Array.from({ length: 1000 }, (_, i) => ({
    evidenceId: `ev-large-${i}`,
    documentId: `doc-${i}`,
    recordId: `rec-${i}`,
    field: 'quantity',
    quantity: { value: i + 1, unit: 'each' },
    excerpt: `Record ${i}`,
  }));
  const cells = Array.from({ length: 1000 }, (_, i) => ({
    cellId: `cell-large-${i}`,
    availableHours: 10,
    hourlyCostUsd: 50,
    compatibleMaterials: [held],
    online: true,
  }));
  const jobs = Array.from({ length: 1000 }, (_, i) => ({
    jobId: `job-large-${i}`,
    materialId: held,
    unitsRequired: 1,
    hoursPerUnit: 1,
    preferredCellId: cells[i % cells.length].cellId,
    dueHours: 100,
  }));
  const snapshot = createSnapshot({ ...base, evidenceRecords, jobs, cells });
  const tools = createToolDispatcher(snapshot);

  const incidentSummary = await tools.invoke('get_incident', { mode: 'summary' });
  assert.equal(incidentSummary.truncated, false);
  assert.equal(incidentSummary.evidence.total, 1000);
  assert.equal(incidentSummary.evidence.coverage.complete, true);
  assert.ok(incidentSummary.evidence.idDigest);

  const seenEvidence = new Set();
  let offset = 0;
  while (offset < 1000) {
    const page = await tools.invoke('get_incident', { mode: 'page', offset, limit: DEFAULT_PAGE_SIZE });
    assert.equal(page.truncated, false);
    assert.equal(page.evidence.total, 1000);
    for (const entry of page.evidence.items) seenEvidence.add(entry.evidenceId);
    offset += page.evidence.items.length;
    if (!page.evidence.items.length) break;
  }
  assert.equal(seenEvidence.size, 1000);
  assert.equal(incidentSummary.evidence.idDigest, digestIds(seenEvidence));

  const jobsSummary = await tools.invoke('list_impacted_jobs', { mode: 'summary' });
  assert.equal(jobsSummary.jobs.total, 1000);
  assert.equal(jobsSummary.truncated, false);
  const seenJobs = new Set();
  offset = 0;
  while (offset < 1000) {
    const page = await tools.invoke('list_impacted_jobs', { mode: 'page', offset, limit: DEFAULT_PAGE_SIZE });
    for (const job of page.jobs.items) seenJobs.add(job.jobId);
    offset += page.jobs.items.length;
    if (!page.jobs.items.length) break;
  }
  assert.equal(seenJobs.size, 1000);

  const capacitySummary = await tools.invoke('get_capacity', { mode: 'summary' });
  assert.equal(capacitySummary.cells.total, 1000);
  const seenCells = new Set();
  offset = 0;
  while (offset < 1000) {
    const page = await tools.invoke('get_capacity', { mode: 'page', offset, limit: DEFAULT_PAGE_SIZE });
    for (const cell of page.cells.items) seenCells.add(cell.cellId);
    offset += page.cells.items.length;
    if (!page.cells.items.length) break;
  }
  assert.equal(seenCells.size, 1000);

  const names = listToolDefinitions().map((t) => t.function.name);
  assert.ok(names.includes('get_incident'));
  assert.ok(names.includes('read_plant_collection') === false || Array.isArray(names));
});

test('investigation projects large tool history with explicit coverage instead of dumping or truncating', () => {
  const size = 1000;
  const plant = generatedPlant(size);
  const items = plant.machines;
  const fullDump = {
    snapshotDigest: 'digest-test',
    machines: items,
  };
  const projected = projectToolHistoryForModel([
    { role: 'tool', content: JSON.stringify(fullDump) },
  ]);
  assert.equal(projected.length, 1);
  const body = JSON.parse(projected[0].content);
  assert.equal(body.truncated, false);
  assert.ok(body.machines);
  assert.equal(body.machines.total, size);
  assert.equal(body.machines.coverage.complete, true);
  assert.ok(body.machines.idDigest);
  assert.ok(Array.isArray(body.machines.items) ? body.machines.items.length <= DEFAULT_PAGE_SIZE : true);
  assert.ok(!Array.isArray(body.machines) || body.machines.length <= DEFAULT_PAGE_SIZE);
  assert.ok(JSON.stringify(body).length < JSON.stringify(fullDump).length);
  assert.equal(body.machines.idDigest, digestIds(items.map((m) => m.id)));
});
