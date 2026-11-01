import { createHash } from "node:crypto";
import { SNAPSHOT_VERSION } from "../contracts.mjs";

function assertPositiveNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite number >= 0`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

/**
 * Normalize and freeze a synthetic scenario into an immutable snapshot.
 * Models never mutate this object; shocks produce a new snapshot.
 */
export function createSnapshot(input) {
  if (!input || typeof input !== "object") {
    throw new Error("scenario input must be an object");
  }

  assertNonEmptyString(input.scenarioId, "scenarioId");
  assertNonEmptyString(input.incident?.incidentId, "incident.incidentId");
  assertNonEmptyString(input.incident?.summary, "incident.summary");

  const materials = Object.freeze(
    (input.materials || []).map((m) => {
      assertNonEmptyString(m.materialId, "material.materialId");
      assertNonEmptyString(m.unit, "material.unit");
      assertPositiveNumber(m.onHand, "material.onHand");
      assertPositiveNumber(m.held, "material.held");
      if(m.held>m.onHand)throw new Error('material.held exceeds onHand');
      assertPositiveNumber(m.unitCostUsd??0,'material.unitCostUsd');
      if(m.replenishmentHours!=null)assertPositiveNumber(m.replenishmentHours,'material.replenishmentHours');
      const substitutes = Object.freeze([...(m.substitutes || [])].map(String));
      return Object.freeze({
        materialId: m.materialId,
        unit: m.unit,
        onHand: m.onHand,
        held: m.held,
        available: Math.max(0, m.onHand - m.held),
        substitutes,
        replenishmentHours: m.replenishmentHours ?? null,
        unitCostUsd: m.unitCostUsd ?? 0,
      });
    }),
  );

  const cells = Object.freeze(
    (input.cells || []).map((c) => {
      assertNonEmptyString(c.cellId, "cell.cellId");
      assertPositiveNumber(c.availableHours, "cell.availableHours");
      assertPositiveNumber(c.hourlyCostUsd, "cell.hourlyCostUsd");
      return Object.freeze({
        cellId: c.cellId,
        availableHours: c.availableHours,
        hourlyCostUsd: c.hourlyCostUsd,
        compatibleMaterials: Object.freeze([...(c.compatibleMaterials || [])].map(String)),
        online: c.online !== false,
      });
    }),
  );

  const jobs = Object.freeze(
    (input.jobs || []).map((j) => {
      assertNonEmptyString(j.jobId, "job.jobId");
      assertNonEmptyString(j.materialId, "job.materialId");
      assertPositiveNumber(j.unitsRequired, "job.unitsRequired");
      assertPositiveNumber(j.hoursPerUnit, "job.hoursPerUnit");
      if(j.dueHours!=null)assertPositiveNumber(j.dueHours,'job.dueHours');
      assertNonEmptyString(j.preferredCellId, "job.preferredCellId");
      return Object.freeze({
        jobId: j.jobId,
        materialId: j.materialId,
        unitsRequired: j.unitsRequired,
        hoursPerUnit: j.hoursPerUnit,
        preferredCellId: j.preferredCellId,
        dueHours: j.dueHours ?? null,
      });
    }),
  );

  const evidenceRecords = Object.freeze(
    (input.evidenceRecords || []).map((e) => {
      assertNonEmptyString(e.evidenceId, "evidence.evidenceId");
      assertNonEmptyString(e.documentId, "evidence.documentId");
      assertNonEmptyString(e.recordId, "evidence.recordId");
      assertNonEmptyString(e.excerpt, "evidence.excerpt");
      if(e.quantity){assertPositiveNumber(e.quantity.value,'evidence.quantity.value');assertNonEmptyString(e.quantity.unit,'evidence.quantity.unit');}
      return Object.freeze({
        evidenceId: e.evidenceId,
        documentId: e.documentId,
        recordId: e.recordId,
        lineId: e.lineId ?? null,
        field: e.field ?? null,
        quantity:
          e.quantity && typeof e.quantity === "object"
            ? Object.freeze({ value: e.quantity.value, unit: e.quantity.unit })
            : null,
        excerpt: e.excerpt,
      });
    }),
  );

  for(const [items,field]of [[materials,'materialId'],[cells,'cellId'],[jobs,'jobId'],[evidenceRecords,'evidenceId']])if(new Set(items.map(i=>i[field])).size!==items.length)throw new Error(`Duplicate ${field}`);
  const materialMap=new Map(materials.map(m=>[m.materialId,m]));
  if(!materialMap.has(input.incident.heldMaterialId))throw new Error('Unknown incident material');
  for(const m of materials)for(const id of m.substitutes)if(!materialMap.has(id)||materialMap.get(id).unit!==m.unit)throw new Error('Unknown or incompatible substitute unit');
  for(const j of jobs)if(!materialMap.has(j.materialId)||!cells.some(c=>c.cellId===j.preferredCellId))throw new Error('Unknown job material or preferred cell');
  for(const c of cells)if(c.compatibleMaterials.some(id=>!materialMap.has(id)))throw new Error('Unknown compatible material');
  const body = {
    version: SNAPSHOT_VERSION,
    scenarioId: input.scenarioId,
    label: input.label || "SYNTHETIC",
    incident: Object.freeze({
      incidentId: input.incident.incidentId,
      summary: input.incident.summary,
      heldMaterialId: input.incident.heldMaterialId ?? null,
      discrepancy: input.incident.discrepancy ?? null,
    }),
    materials,
    cells,
    jobs,
    evidenceRecords,
    assumptions: Object.freeze([...(input.assumptions || [])].map(String)),
  };

  const digest = createHash("sha256").update(stableStringify(body)).digest("hex");
  return Object.freeze({ ...body, snapshotDigest: digest });
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

export {buildDemoScenarioInput} from '../../fixtures/demo-scenario.mjs';
