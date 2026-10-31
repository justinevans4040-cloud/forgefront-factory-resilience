import {
  resolveSparkRoute,
  SPARK_BASETEN_ROUTE,
  SPARK_FIREWORKS_ROUTE,
} from "./routes.mjs";

/**
 * Muse Spark Open client (explicit Baseten or Fireworks route).
 * Missing credentials or non-allowlisted routes fail closed.
 * Sample offline mode is a separate explicit client — never an automatic substitute.
 */
export function createSparkOpenClient(options = {}) {
  if (
    options.route &&
    ![SPARK_BASETEN_ROUTE, SPARK_FIREWORKS_ROUTE].some(
      (route) =>
        route.endpoint === options.route.endpoint &&
        route.model === options.route.model &&
        route.provider === options.route.provider,
    )
  ) {
    throw new Error("Spark route must be allowlisted");
  }
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const env = options.env || process.env;

  let resolved;
  if (options.route || options.apiKey !== undefined) {
    if (!options.route || options.apiKey === undefined || String(options.apiKey || "").trim() === "") {
      const err = new Error("Spark Open requires an allowlisted route and API key together");
      err.code = "KEY_UNAVAILABLE";
      err.status = 503;
      throw err;
    }
    resolved = { route: options.route, apiKey: options.apiKey };
  } else {
    resolved = resolveSparkRoute(env);
  }

  if (!resolved.route || !resolved.apiKey || String(resolved.apiKey).trim() === "") {
    const err = new Error("BASETEN_API_KEY/FIREWORKS_API_KEY unavailable");
    err.code = "KEY_UNAVAILABLE";
    err.status = 503;
    throw err;
  }

  const route = [SPARK_BASETEN_ROUTE, SPARK_FIREWORKS_ROUTE].find(
    (candidate) =>
      candidate.endpoint === resolved.route.endpoint && candidate.model === resolved.route.model,
  );
  if (!route) throw new Error("Spark route must be allowlisted");
  const apiKey = resolved.apiKey;

  return Object.freeze({
    id: "spark-open",
    mode: "live",
    route,
    sample: false,
    label: `LIVE — Muse Spark Open (${route.provider})`,
    async complete(request = {}) {
      const controller = new AbortController();
      const timeoutMs = request.timeoutMs ?? 60_000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      if (request.signal) {
        if (request.signal.aborted) controller.abort();
        else request.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      try {
        const messages = Array.isArray(request.messages)
          ? request.messages
          : [{ role: "user", content: request.prompt || request.input || "" }];

        const payload = {
          model: route.model,
          messages,
          max_tokens: request.maxTokens ?? 1024,
        };
        if (request.tools?.length) {
          payload.tools = request.tools;
          payload.tool_choice = request.toolChoice ?? "auto";
        }

        const response = await fetchImpl(route.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const rawText = await response.text();
        let body = null;
        try {
          body = JSON.parse(rawText);
        } catch {
          body = null;
        }

        if (!response.ok) {
          const err = new Error(`Spark Open request failed with HTTP ${response.status}`);
          err.code = "MODEL_HTTP";
          err.status = response.status;
          throw err;
        }

        const message = body?.choices?.[0]?.message || {};
        const toolCalls = normalizeToolCalls(message.tool_calls);

        return Object.freeze({
          ok: true,
          mode: "live",
          sample: false,
          label: `LIVE — Muse Spark Open (${route.provider})`,
          provider: route.provider,
          modelId: body?.model ?? null,
          requestId: body?.id ?? null,
          text: typeof message.content === "string" ? message.content : "",
          toolCalls: Object.freeze(toolCalls),
          usage: body?.usage ?? null,
          raw: null,
        });
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

function normalizeToolCalls(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((call, index) => {
    let args = call?.function?.arguments ?? {};
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        args = {};
      }
    }
    return Object.freeze({
      id: call?.id || `tool_call_${index}`,
      name: call?.function?.name || "",
      arguments: args && typeof args === "object" ? args : {},
    });
  });
}

export { SPARK_BASETEN_ROUTE, SPARK_FIREWORKS_ROUTE };
