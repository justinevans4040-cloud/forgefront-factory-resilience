import { createHash } from "node:crypto";

/**
 * Deterministic page/summary coverage for large plant and evidence collections.
 * Never silently truncates: every response carries total, coverage and truncated:false.
 */

export const DEFAULT_PAGE_SIZE = 50;
export const AUTO_SUMMARY_THRESHOLD = 50;

function assertFiniteInt(value, label, { min = 0, allowNull = false } = {}) {
  if (value == null) {
    if (allowNull) return null;
    throw Object.assign(new Error(`${label} required`), { code: "TOOL_SCHEMA" });
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) value = Number(value);
  if (!Number.isSafeInteger(value) || value < min) {
    throw Object.assign(new Error(`${label} must be an integer >= ${min}`), { code: "TOOL_SCHEMA" });
  }
  return value;
}

export function entityIdDigest(items, idOf = (item) => item?.id) {
  const ids = items.map((item) => {
    const id = idOf(item);
    if (typeof id !== "string" || !id) {
      throw new Error("entity id required for coverage digest");
    }
    return id;
  });
  return createHash("sha256").update([...ids].sort().join("\n")).digest("hex");
}

function coverageMeta({ offset, count, total }) {
  const coveredCount = Math.min(total, Math.max(0, offset) + Math.max(0, count));
  return Object.freeze({
    complete: coveredCount >= total,
    coveredCount,
    remaining: Math.max(0, total - coveredCount),
  });
}

/**
 * Page a collection with explicit coverage. Never drops the remainder silently.
 */
export function pageCollection(items, { offset = 0, limit = DEFAULT_PAGE_SIZE, idOf = (item) => item?.id } = {}) {
  if (!Array.isArray(items)) throw new Error("pageCollection requires an array");
  const total = items.length;
  const safeOffset = assertFiniteInt(offset, "offset", { min: 0 });
  const safeLimit = assertFiniteInt(limit, "limit", { min: 1 });
  const slice = items.slice(safeOffset, safeOffset + safeLimit);
  const page = Math.floor(safeOffset / safeLimit);
  const pages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  return Object.freeze({
    mode: "page",
    truncated: false,
    offset: safeOffset,
    limit: safeLimit,
    total,
    page,
    pages,
    items: Object.freeze([...slice]),
    idDigest: entityIdDigest(items, idOf),
    coverage: coverageMeta({ offset: safeOffset, count: slice.length, total }),
    nextOffset: safeOffset + slice.length < total ? safeOffset + slice.length : null,
  });
}

/**
 * Aggregate summary that still accounts for every entity via totals + id digest.
 */
export function summarizeCollection(
  items,
  {
    idOf = (item) => item?.id,
    numericFields = {},
    pageSize = DEFAULT_PAGE_SIZE,
    includeFirstPage = true,
  } = {},
) {
  if (!Array.isArray(items)) throw new Error("summarizeCollection requires an array");
  const total = items.length;
  const aggregates = {};
  for (const [field, read] of Object.entries(numericFields)) {
    let min = null;
    let max = null;
    let sum = 0;
    let count = 0;
    for (const item of items) {
      const value = read(item);
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      count += 1;
      sum += value;
      min = min == null ? value : Math.min(min, value);
      max = max == null ? value : Math.max(max, value);
    }
    aggregates[field] = Object.freeze({ count, sum, min, max, mean: count ? sum / count : null });
  }
  const first = includeFirstPage
    ? pageCollection(items, { offset: 0, limit: pageSize, idOf })
    : null;
  return Object.freeze({
    mode: "summary",
    truncated: false,
    total,
    idDigest: entityIdDigest(items, idOf),
    aggregates: Object.freeze(aggregates),
    coverage: Object.freeze({ complete: true, coveredCount: total, remaining: 0 }),
    pageSize,
    pages: total === 0 ? 0 : Math.ceil(total / pageSize),
    items: first ? first.items : Object.freeze([]),
    nextOffset: first?.nextOffset ?? (total > 0 ? 0 : null),
  });
}

export function resolvePagingArgs(args = {}, { defaultMode = "auto", threshold = AUTO_SUMMARY_THRESHOLD, total = 0 } = {}) {
  const modeRaw = args.mode == null ? defaultMode : String(args.mode);
  if (!["page", "summary", "auto"].includes(modeRaw)) {
    throw Object.assign(new Error("mode must be page, summary, or auto"), { code: "TOOL_SCHEMA" });
  }
  const offset = args.offset == null ? 0 : assertFiniteInt(args.offset, "offset", { min: 0 });
  const limit = args.limit == null ? DEFAULT_PAGE_SIZE : assertFiniteInt(args.limit, "limit", { min: 1 });
  const mode = modeRaw === "auto" ? (total > threshold ? "summary" : "page") : modeRaw;
  return { mode, offset, limit };
}

/**
 * Cover one named plant collection (machines, operations, evidence, recovery).
 */
export function coverPlantCollection(plant, analysis, { collection, mode = "auto", offset = 0, limit = DEFAULT_PAGE_SIZE } = {}) {
  const source = plantCollectionItems(plant, analysis, collection);
  const { idOf, numericFields } = plantCollectionMeta(collection);
  const paging = resolvePagingArgs({ mode, offset, limit }, { total: source.length });
  const covered =
    paging.mode === "summary"
      ? summarizeCollection(source, { idOf, numericFields, pageSize: paging.limit })
      : pageCollection(source, { offset: paging.offset, limit: paging.limit, idOf });
  return Object.freeze({
    collection,
    truncated: false,
    ...covered,
  });
}

function plantCollectionItems(plant, analysis, collection) {
  switch (collection) {
    case "machines":
      return plant?.machines ?? [];
    case "operations":
      return plant?.operations ?? [];
    case "evidence":
      return plant?.evidence ?? [];
    case "recovery":
      return analysis?.recovery?.assignments ?? [];
    default:
      throw Object.assign(new Error(`unknown plant collection: ${collection}`), { code: "TOOL_SCHEMA" });
  }
}

function plantCollectionMeta(collection) {
  switch (collection) {
    case "machines":
      return {
        idOf: (m) => m.id,
        numericFields: {
          capacityHours: (m) => m.capacityHours,
          hourlyCostUsd: (m) => m.hourlyCostUsd,
        },
      };
    case "operations":
      return {
        idOf: (o) => o.id,
        numericFields: { hours: (o) => o.hours, dueHours: (o) => o.dueHours },
      };
    case "evidence":
      return {
        idOf: (e) => e.id,
        numericFields: { quantityValue: (e) => e.quantity?.value },
      };
    case "recovery":
      return {
        idOf: (a) => a.operationId,
        numericFields: {
          hours: (a) => a.hours,
          costUsd: (a) => a.costUsd,
          startHours: (a) => a.startHours,
          finishHours: (a) => a.finishHours,
        },
      };
    default:
      return { idOf: (item) => item?.id, numericFields: {} };
  }
}

/**
 * Wrap any array field that is large so model prompts never receive unbounded dumps.
 */
export function projectLargeArrays(value, { threshold = AUTO_SUMMARY_THRESHOLD, pageSize = DEFAULT_PAGE_SIZE, path = [] } = {}) {
  if (Array.isArray(value)) {
    if (value.length <= threshold) {
      return value.map((item) => projectLargeArrays(item, { threshold, pageSize, path }));
    }
    const idOf = inferIdOf(value);
    return summarizeCollection(value, { idOf, numericFields: inferNumericFields(value), pageSize });
  }
  if (value && typeof value === "object") {
    const out = {};
    let coveredChild = false;
    for (const [key, child] of Object.entries(value)) {
      const projected = projectLargeArrays(child, { threshold, pageSize, path: path.concat(key) });
      out[key] = projected;
      if (
        projected &&
        typeof projected === "object" &&
        !Array.isArray(projected) &&
        (projected.mode === "summary" || projected.mode === "page" || projected.truncated === false)
      ) {
        coveredChild = true;
      }
    }
    if (coveredChild && out.truncated == null) out.truncated = false;
    return out;
  }
  return value;
}

function inferIdOf(items) {
  const sample = items[0];
  if (sample && typeof sample === "object") {
    for (const key of ["evidenceId", "jobId", "cellId", "operationId", "machineId", "id"]) {
      if (typeof sample[key] === "string") return (item) => item[key];
    }
  }
  return (item) => {
    if (typeof item === "string" || typeof item === "number") return String(item);
    return createHash("sha256").update(JSON.stringify(item)).digest("hex");
  };
}

function inferNumericFields(items) {
  const sample = items[0];
  if (!sample || typeof sample !== "object") return {};
  const fields = {};
  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      fields[key] = (item) => item[key];
    } else if (value && typeof value === "object" && typeof value.value === "number") {
      fields[key] = (item) => item[key]?.value;
    }
  }
  return fields;
}

/**
 * Project tool-role message history for Meta prompts with explicit coverage.
 */
export function projectToolHistoryForModel(messages, options = {}) {
  return messages.map((message) => {
    if (!message || message.role !== "tool") return message;
    const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? {});
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return message;
    }
    const projected = projectLargeArrays(parsed, options);
    return {
      ...message,
      content: JSON.stringify(projected),
    };
  });
}

/**
 * Build a model-safe plant draft context: options stay intact; large collections are covered.
 */
export function coverPlantDraftContext(context, options = {}) {
  if (!context || typeof context !== "object") return context;
  const projected = projectLargeArrays(context, options);
  return Object.freeze({
    ...projected,
    truncated: false,
    coverage: Object.freeze({
      evidenceTotal: Array.isArray(context.evidence) ? context.evidence.length : context.evidence?.total ?? 0,
      complete: true,
    }),
  });
}
