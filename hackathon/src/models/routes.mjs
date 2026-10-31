/**
 * Allowlisted Meta model routes only. No arbitrary inference URLs or non-Meta models.
 */

export const WONDER_ROUTE = Object.freeze({
  id: "muse-wonder",
  provider: "meta-model-api",
  endpoint: "https://api.meta.ai/v1/responses",
  model: "muse-wonder-1.0",
  authEnvPrimary: "MUSE_API_KEY",
  authEnvFallback: "MODEL_API_KEY",
});

export const SPARK_BASETEN_ROUTE = Object.freeze({
  id: "muse-spark-open",
  provider: "baseten",
  endpoint: "https://inference.baseten.co/v1/chat/completions",
  model: "meta-models/muse-spark-open",
  authEnv: "BASETEN_API_KEY",
});

export const SPARK_FIREWORKS_ROUTE = Object.freeze({
  id: "muse-spark-open",
  provider: "fireworks",
  endpoint: "https://us.api.fireworks.ai/inference/v1/chat/completions",
  model: "accounts/fireworks/models/muse-spark-open",
  authEnv: "FIREWORKS_API_KEY",
});

export const SAMPLE_ROUTE = Object.freeze({
  id: "sample-offline",
  provider: "none",
  model: "sample-offline-template",
  mode: "sample",
  label: "SAMPLE — OFFLINE; NO LIVE AI",
});

export function resolveWonderApiKey(env = process.env) {
  const primary = env.MUSE_API_KEY;
  if (primary != null && String(primary).trim() !== "") return String(primary);
  const fallback = env.MODEL_API_KEY;
  if (fallback != null && String(fallback).trim() !== "") return String(fallback);
  return null;
}

export function resolveSparkRoute(env = process.env) {
  if (env.BASETEN_API_KEY != null && String(env.BASETEN_API_KEY).trim() !== "") {
    return { route: SPARK_BASETEN_ROUTE, apiKey: String(env.BASETEN_API_KEY) };
  }
  if (env.FIREWORKS_API_KEY != null && String(env.FIREWORKS_API_KEY).trim() !== "") {
    return { route: SPARK_FIREWORKS_ROUTE, apiKey: String(env.FIREWORKS_API_KEY) };
  }
  return { route: null, apiKey: null };
}
