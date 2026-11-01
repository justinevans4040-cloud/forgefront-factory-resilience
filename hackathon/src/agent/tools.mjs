import { ERROR_CODES, TOOL_NAMES } from "../contracts.mjs";
import { buildEvidenceRegistry } from "../domain/evidence.mjs";
import {
  compareRecoveryOptions,
  getCapacity,
  listImpactedJobs,
} from "../domain/engine.mjs";
import { analyzePlant } from "../../public/plant-engine.mjs";
import {
  AUTO_SUMMARY_THRESHOLD,
  DEFAULT_PAGE_SIZE,
  coverPlantCollection,
  pageCollection,
  resolvePagingArgs,
  summarizeCollection,
} from "./prompt-coverage.mjs";

/**
 * Read-only tool dispatcher bound to one server-selected snapshot.
 * Large collections are paged or summarized with explicit coverage — never silently truncated.
 * No shell, path, SQL, fetch, approval or write tools.
 */

const PAGING_PROPERTIES = Object.freeze({
  mode: { type: "string", enum: ["page", "summary", "auto"] },
  offset: { type: "integer", minimum: 0 },
  limit: { type: "integer", minimum: 1 },
});

const TOOL_SCHEMAS = Object.freeze({
  get_incident: Object.freeze({
    type: "object",
    properties: { ...PAGING_PROPERTIES },
    additionalProperties: false,
  }),
  read_evidence: Object.freeze({
    type: "object",
    required: ["evidenceId"],
    properties: {
      evidenceId: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
  }),
  list_impacted_jobs: Object.freeze({
    type: "object",
    properties: { ...PAGING_PROPERTIES },
    additionalProperties: false,
  }),
  compare_recovery_options: Object.freeze({
    type: "object",
    properties: { ...PAGING_PROPERTIES },
    additionalProperties: false,
  }),
  get_capacity: Object.freeze({
    type: "object",
    properties: { ...PAGING_PROPERTIES },
    additionalProperties: false,
  }),
});

const PLANT_TOOL_SCHEMA = Object.freeze({
  type: "object",
  required: ["collection"],
  properties: {
    collection: { type: "string", enum: ["machines", "operations", "evidence", "recovery"] },
    ...PAGING_PROPERTIES,
  },
  additionalProperties: false,
});

export function listToolDefinitions() {
  return TOOL_NAMES.map((name) =>
    Object.freeze({
      type: "function",
      function: Object.freeze({
        name,
        description: toolDescription(name),
        parameters: TOOL_SCHEMAS[name],
      }),
    }),
  );
}

export function listPlantToolDefinitions() {
  return Object.freeze([
    Object.freeze({
      type: "function",
      function: Object.freeze({
        name: "read_plant_collection",
        description:
          "Read one plant collection (machines, operations, evidence, recovery) as a page or full-coverage summary. Large plants never silently truncate; page with offset/limit until coverage.complete or rely on summary idDigest.",
        parameters: PLANT_TOOL_SCHEMA,
      }),
    }),
  ]);
}

function toolDescription(name) {
  switch (name) {
    case "get_incident":
      return "Return the current incident summary and held material for the bound snapshot. Large evidence registries are paged or summarized with explicit coverage (mode/offset/limit); never silently truncated.";
    case "read_evidence":
      return "Read one evidence registry entry by evidenceId from the bound snapshot.";
    case "list_impacted_jobs":
      return "List jobs and units impacted by the held material. Large job lists use page/summary coverage arguments.";
    case "compare_recovery_options":
      return "Compare the three constrained recovery options with feasibility and costs. Impacted job lists are coverage-aware when large.";
    case "get_capacity":
      return "Return online/offline cell capacity and material compatibility. Large cell lists use page/summary coverage.";
    default:
      return "";
  }
}

function toolError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function assertArgsObject(args) {
  if (args == null) return {};
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw toolError(ERROR_CODES.TOOL_SCHEMA, "tool arguments must be a JSON object");
      }
      return parsed;
    } catch (err) {
      if (err.code) throw err;
      throw toolError(ERROR_CODES.TOOL_SCHEMA, "tool arguments must be valid JSON");
    }
  }
  if (typeof args !== "object" || Array.isArray(args)) {
    throw toolError(ERROR_CODES.TOOL_SCHEMA, "tool arguments must be an object");
  }
  return args;
}

function validateAgainstSchema(schema, args) {
  if (!schema) throw toolError(ERROR_CODES.UNKNOWN_TOOL, "unknown tool schema");

  const keys = Object.keys(args);
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(schema.properties || {}, key)) {
      throw toolError(ERROR_CODES.TOOL_SCHEMA, `unexpected argument: ${key}`);
    }
  }
  for (const required of schema.required || []) {
    const value = args[required];
    if (typeof value !== "string" || value.trim() === "") {
      throw toolError(ERROR_CODES.TOOL_SCHEMA, `missing required argument: ${required}`);
    }
  }
  if (args.mode != null && !["page", "summary", "auto"].includes(String(args.mode))) {
    throw toolError(ERROR_CODES.TOOL_SCHEMA, "mode must be page, summary, or auto");
  }
  for (const key of ["offset", "limit"]) {
    if (args[key] == null) continue;
    const value = typeof args[key] === "string" && /^-?\d+$/.test(args[key].trim()) ? Number(args[key]) : args[key];
    if (!Number.isSafeInteger(value) || value < (key === "limit" ? 1 : 0)) {
      throw toolError(ERROR_CODES.TOOL_SCHEMA, `${key} must be a valid integer`);
    }
  }
}

function coverList(items, args, { idOf, numericFields }) {
  const paging = resolvePagingArgs(args, { total: items.length, threshold: AUTO_SUMMARY_THRESHOLD });
  if (paging.mode === "summary") {
    return summarizeCollection(items, { idOf, numericFields, pageSize: paging.limit });
  }
  return pageCollection(items, { offset: paging.offset, limit: paging.limit, idOf });
}

function coverImpacted(impact, args) {
  const jobsCovered = coverList(impact.jobs, args, {
    idOf: (j) => j.jobId,
    numericFields: {
      unitsRequired: (j) => j.unitsRequired,
      hoursPerUnit: (j) => j.hoursPerUnit,
      totalHours: (j) => j.totalHours,
      dueHours: (j) => j.dueHours,
    },
  });
  return Object.freeze({
    snapshotDigest: impact.snapshotDigest,
    heldMaterialId: impact.heldMaterialId,
    impactedJobCount: impact.impactedJobCount,
    impactedUnits: impact.impactedUnits,
    truncated: false,
    jobs: jobsCovered,
  });
}

/**
 * Create a dispatcher sealed to one snapshot. Cross-snapshot evidence IDs fail closed.
 */
export function createToolDispatcher(snapshot) {
  if (!snapshot?.snapshotDigest) {
    throw new Error("tool dispatcher requires a snapshot with digest");
  }
  const registry = buildEvidenceRegistry(snapshot);
  const boundDigest = snapshot.snapshotDigest;

  return Object.freeze({
    snapshotDigest: boundDigest,
    listTools: listToolDefinitions,
    async invoke(name, rawArgs = {}) {
      if (!TOOL_NAMES.includes(name)) {
        throw toolError(ERROR_CODES.UNKNOWN_TOOL, `unknown tool: ${name}`);
      }
      if (name === "approve_plan" || name === "write_scenario" || name === "shell") {
        throw toolError(ERROR_CODES.FORBIDDEN, "write/approval tools are not available");
      }

      const args = assertArgsObject(rawArgs);
      validateAgainstSchema(TOOL_SCHEMAS[name], args);

      switch (name) {
        case "get_incident": {
          const evidenceItems = registry.list();
          const evidence = coverList(evidenceItems, args, {
            idOf: (e) => e.evidenceId,
            numericFields: { quantityValue: (e) => e.quantity?.value },
          });
          return Object.freeze({
            snapshotDigest: boundDigest,
            incident: snapshot.incident,
            label: snapshot.label,
            assumptions: snapshot.assumptions,
            truncated: false,
            evidence,
          });
        }
        case "read_evidence":
          return registry.get(args.evidenceId, boundDigest);
        case "list_impacted_jobs":
          return coverImpacted(listImpactedJobs(snapshot), args);
        case "compare_recovery_options": {
          const recovery = compareRecoveryOptions(snapshot);
          return Object.freeze({
            ...recovery,
            truncated: false,
            impacted: coverImpacted(recovery.impacted, args),
          });
        }
        case "get_capacity": {
          const capacity = getCapacity(snapshot);
          return Object.freeze({
            snapshotDigest: capacity.snapshotDigest,
            truncated: false,
            cells: coverList(capacity.cells, args, {
              idOf: (c) => c.cellId,
              numericFields: {
                availableHours: (c) => c.availableHours,
                hourlyCostUsd: (c) => c.hourlyCostUsd,
              },
            }),
          });
        }
        default:
          throw toolError(ERROR_CODES.UNKNOWN_TOOL, `unknown tool: ${name}`);
      }
    },
  });
}

/**
 * Read-only plant collection dispatcher. Uses plant entity ids from the bound plant only.
 */
export function createPlantToolDispatcher(plant, { analysis = null } = {}) {
  if (!plant || !Array.isArray(plant.machines) || !Array.isArray(plant.operations)) {
    throw new Error("plant tool dispatcher requires a plant with machines and operations");
  }
  const boundAnalysis =
    analysis ??
    analyzePlant(plant, {
      lotId: plant.lots?.[0]?.id,
      failure: Object.keys(plant.failurePolicies || {})[0],
      strategy: "reroute",
    });

  return Object.freeze({
    listTools: listPlantToolDefinitions,
    async invoke(name, rawArgs = {}) {
      if (name !== "read_plant_collection") {
        throw toolError(ERROR_CODES.UNKNOWN_TOOL, `unknown tool: ${name}`);
      }
      const args = assertArgsObject(rawArgs);
      validateAgainstSchema(PLANT_TOOL_SCHEMA, args);
      if (!["machines", "operations", "evidence", "recovery"].includes(args.collection)) {
        throw toolError(ERROR_CODES.TOOL_SCHEMA, "collection must be machines, operations, evidence, or recovery");
      }
      return coverPlantCollection(plant, boundAnalysis, {
        collection: args.collection,
        mode: args.mode,
        offset: args.offset,
        limit: args.limit,
      });
    },
  });
}

export { DEFAULT_PAGE_SIZE, AUTO_SUMMARY_THRESHOLD };
