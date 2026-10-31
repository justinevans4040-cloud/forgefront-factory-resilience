import { createSampleClient } from "./sample.mjs";
import { createSparkOpenClient } from "./spark-open.mjs";
import { createWonderClient } from "./wonder.mjs";

/**
 * Unified model client factory. Product AI uses Meta models only.
 * Sample is an explicit offline client — Wonder/Spark never auto-substitute it.
 *
 * @param {"wonder"|"spark-open"|"sample"} kind
 */
export function createModelClient(kind, options = {}) {
  switch (kind) {
    case "wonder":
      return createWonderClient(options);
    case "spark-open":
      return createSparkOpenClient(options);
    case "sample":
      return createSampleClient(options);
    default: {
      const err = new Error(`unknown model client kind: ${kind}`);
      err.code = "VALIDATION";
      throw err;
    }
  }
}

export function describeClientMode(client) {
  return Object.freeze({
    id: client.id,
    mode: client.mode,
    sample: Boolean(client.sample),
    label: client.label,
    provider: client.route?.provider ?? null,
    model: client.route?.model ?? null,
  });
}
