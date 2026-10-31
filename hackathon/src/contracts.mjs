/**
 * Authoritative shared shapes for scenario snapshots, recovery options,
 * tool results and API error codes. Keep serialized field names stable.
 */

export const SNAPSHOT_VERSION = 1;

export const ERROR_CODES = Object.freeze({
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION: "VALIDATION",
  INFEASIBLE: "INFEASIBLE",
  CROSS_SNAPSHOT: "CROSS_SNAPSHOT",
  UNKNOWN_TOOL: "UNKNOWN_TOOL",
  TOOL_SCHEMA: "TOOL_SCHEMA",
  INTERNAL: "INTERNAL",
});

export const RECOVERY_OPTION_IDS = Object.freeze({
  WAIT_REPLENISHMENT: "wait_replenishment",
  ALLOCATE_SUBSTITUTE: "allocate_substitute",
  SPLIT_CAPACITY: "split_capacity",
});

export const TOOL_NAMES = Object.freeze([
  "get_incident",
  "read_evidence",
  "list_impacted_jobs",
  "compare_recovery_options",
  "get_capacity",
]);

export const UNITS = Object.freeze({
  EACH: "each",
  HOUR: "hour",
  USD: "usd",
});

/**
 * @typedef {object} Quantity
 * @property {number} value
 * @property {string} unit
 */

/**
 * @typedef {object} SourceLocator
 * @property {string} documentId
 * @property {string} recordId
 * @property {string} [lineId]
 * @property {string} [field]
 */

/**
 * @typedef {object} EvidenceEntry
 * @property {string} evidenceId
 * @property {string} snapshotDigest
 * @property {SourceLocator} source
 * @property {Quantity} [quantity]
 * @property {string} excerpt
 */

/**
 * @typedef {object} RecoveryOption
 * @property {string} optionId
 * @property {boolean} feasible
 * @property {string} [rejectReason]
 * @property {number} [impactedUnits]
 * @property {number} [finishHours]
 * @property {number} [incrementalCostUsd]
 * @property {string[]} assumptions
 * @property {string[]} constraints
 * @property {string[]} evidenceIds
 */
