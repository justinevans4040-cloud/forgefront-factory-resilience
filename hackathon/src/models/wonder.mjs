import { resolveWonderApiKey, WONDER_ROUTE } from "./routes.mjs";

/**
 * Muse Wonder client (Meta Model API Responses).
 * Missing credentials fail closed. Sample offline mode is a separate explicit client.
 */
export function createWonderClient(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const env = options.env || process.env;
  const apiKey = options.apiKey !== undefined ? options.apiKey : resolveWonderApiKey(env);

  if (!apiKey || String(apiKey).trim() === "") {
    const err = new Error("MUSE_API_KEY/MODEL_API_KEY unavailable");
    err.code = "KEY_UNAVAILABLE";
    err.status = 503;
    throw err;
  }

  return Object.freeze({
    id: "wonder",
    mode: "live",
    route: WONDER_ROUTE,
    sample: false,
    label: "LIVE — Muse Wonder",
    async complete(request = {}) {
      const controller = new AbortController();
      const timeoutMs = request.timeoutMs ?? 60_000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      if (request.signal) {
        if (request.signal.aborted) controller.abort();
        else request.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      try {
        const input =
          request.input ||
          request.prompt ||
          (Array.isArray(request.messages)
            ? request.messages.map((m) => `${m.role}: ${m.content}`).join("\n")
            : "");

        const response = await fetchImpl(WONDER_ROUTE.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: WONDER_ROUTE.model,
            input,
          }),
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
          const err = new Error(`Wonder request failed with HTTP ${response.status}`);
          err.code = "MODEL_HTTP";
          err.status = response.status;
          throw err;
        }

        const text = extractWonderText(body) || rawText;
        return Object.freeze({
          ok: true,
          mode: "live",
          sample: false,
          label: "LIVE — Muse Wonder",
          provider: WONDER_ROUTE.provider,
          modelId: body?.model ?? body?.model_id ?? null,
          requestId: body?.id ?? body?.request_id ?? null,
          text,
          toolCalls: Object.freeze([]),
          usage: body?.usage ?? null,
          raw: null,
        });
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

function extractWonderText(body) {
  if (!body || typeof body !== "object") return null;
  if (typeof body.output_text === "string") return body.output_text;
  if (Array.isArray(body.output)) {
    const parts = [];
    for (const item of body.output) {
      if (typeof item?.content === "string") parts.push(item.content);
      else if (Array.isArray(item?.content)) {
        for (const c of item.content) {
          if (typeof c?.text === "string") parts.push(c.text);
          else if (typeof c === "string") parts.push(c);
        }
      }
    }
    if (parts.length) return parts.join("\n");
  }
  if (typeof body.text === "string") return body.text;
  return null;
}
