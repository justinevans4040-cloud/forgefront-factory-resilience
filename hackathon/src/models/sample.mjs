import { SAMPLE_ROUTE } from "./routes.mjs";

/**
 * Explicit offline client only. Never presented as live inference and never
 * substituted automatically when a Meta route key is missing.
 */
export function createSampleClient(options = {}) {
  const label = options.label || SAMPLE_ROUTE.label;

  return Object.freeze({
    id: "sample",
    mode: "sample",
    route: SAMPLE_ROUTE,
    sample: true,
    label,
    async complete(request = {}) {
      const analysis = request.analysis || null;
      const feasible = (analysis?.recovery?.options || []).filter((o) => o.feasible);
      const preferred = feasible[0] || null;
      const text = [
        label,
        "Offline recovery walkthrough · no Meta model call.",
        preferred
          ? `Calculated recovery: ${{wait_replenishment:'Wait for replenishment',allocate_substitute:'Use verified substitute',split_capacity:'Split available capacity'}[preferred.optionId]??preferred.optionId}. Finish in ${preferred.finishHours} hours with USD ${preferred.incrementalCostUsd} incremental cost.`
          : "No feasible recovery option in the bound analysis; request additional evidence.",
        "Inspect source evidence and compare calculated options before accepting a recovery.",
      ].join(" ");

      return Object.freeze({
        ok: true,
        mode: "sample",
        sample: true,
        label,
        provider: SAMPLE_ROUTE.provider,
        modelId: SAMPLE_ROUTE.model,
        text,
        toolCalls: Object.freeze([]),
        usage: null,
        raw: null,
      });
    },
  });
}
