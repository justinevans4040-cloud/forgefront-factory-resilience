import { ERROR_CODES, TOOL_NAMES } from "../contracts.mjs";
import { buildEvidenceRegistry } from "../domain/evidence.mjs";
import {
  compareRecoveryOptions,
  getCapacity,
  listImpactedJobs,
} from "../domain/engine.mjs";

/**
 * Read-only tool dispatcher bound to one server-selected snapshot.
 * No shell, path, SQL, fetch, approval or write tools.
 */

const TOOL_SCHEMAS = Object.freeze({
  get_incident: Object.freeze({ type: "object", properties: {}, additionalProperties: false }),
  read_evidence: Object.freeze({
    type: "object",
    required: ["evidenceId"],
    properties: {
      evidenceId: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
  }),
  list_impacted_jobs: Object.freeze({ type: "object", properties: {}, additionalProperties: false }),
  compare_recovery_options: Object.freeze({
    type: "object",
    properties: {},
    additionalProperties: false,
  }),
  get_capacity: Object.freeze({ type: "object", properties: {}, additionalProperties: false }),
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

function toolDescription(name) {
  switch (name) {
    case "get_incident":
      return "Return the current incident summary and held material for the bound snapshot.";
    case "read_evidence":
      return "Read one evidence registry entry by evidenceId from the bound snapshot.";
    case "list_impacted_jobs":
      return "List jobs and units impacted by the held material.";
    case "compare_recovery_options":
      return "Compare the three constrained recovery options with feasibility and costs.";
    case "get_capacity":
      return "Return online/offline cell capacity and material compatibility.";
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

function validateAgainstSchema(name, args) {
  const schema = TOOL_SCHEMAS[name];
  if (!schema) throw toolError(ERROR_CODES.UNKNOWN_TOOL, `unknown tool: ${name}`);

  const keys = Object.keys(args);
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(schema.properties || {}, key)) {
      throw toolError(ERROR_CODES.TOOL_SCHEMA, `unexpected argument: ${key}`);
    }
  }
  for (const required of schema.required || []) {
    if (typeof args[required] !== "string" || args[required].trim() === "") {
      throw toolError(ERROR_CODES.TOOL_SCHEMA, `missing required argument: ${required}`);
    }
  }
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
      validateAgainstSchema(name, args);

      switch (name) {
        case "get_incident":
          return Object.freeze({
            snapshotDigest: boundDigest,
            incident: snapshot.incident,
            label: snapshot.label,
            assumptions: snapshot.assumptions,
            evidence: registry.list(),
          });
        case "read_evidence":
          return registry.get(args.evidenceId, boundDigest);
        case "list_impacted_jobs":
          return listImpactedJobs(snapshot);
        case "compare_recovery_options":
          return compareRecoveryOptions(snapshot);
        case "get_capacity":
          return getCapacity(snapshot);
        default:
          throw toolError(ERROR_CODES.UNKNOWN_TOOL, `unknown tool: ${name}`);
      }
    },
  });
}
