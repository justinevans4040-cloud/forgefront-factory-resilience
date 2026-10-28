import { screenModelOutput } from "./output-screen.mjs";
import { buildSampleStructuredClaims, serializeStructuredBrief, extractStructuredJson } from "./structured-brief.mjs";
import { parseJsonStrictOrError } from "./security/strict-json.mjs";
import { resolveOllamaEndpoint } from "./security/ollama-url.mjs";

const JSON_BLOCK = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;

export function resolveProvider(requested) {
  const want = (requested || process.env.MODEL_PROVIDER || "auto").toLowerCase();
  if (want === "fixture") return "fixture";
  if (want === "llama" || want === "ollama") return "llama";
  if (want === "muse" || want === "muse-spark") return "muse-spark";
  if (process.env.MODEL_API_KEY) return "muse-spark";
  if (process.env.OLLAMA_ENDPOINT) return "llama";
  return "fixture";
}

/**
 * Muse Spark endpoint. OpenAI-compatible chat completions; base URL and model id are
 * configurable (MODEL_API_BASE / MODEL_NAME) so the live path can be pointed at the
 * official endpoint the day the hackathon key arrives. Only https (or localhost for
 * the integration test mock) is accepted.
 */
export function resolveMuseEndpoint() {
  const raw = (process.env.MODEL_API_BASE || "https://api.meta.ai/v1").replace(/\/+$/, "");
  let url;
  try { url = new URL(`${raw}/chat/completions`); } catch { throw new Error("MODEL_API_BASE_INVALID"); }
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) throw new Error("MODEL_API_BASE_FORBIDDEN");
  return url.toString();
}

export const museModelId = () => process.env.MODEL_NAME || "muse-spark-1.3";

async function postChat(endpoint, headers, body, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Multi-step tool loop: the model may call read-only engine tools (max `maxSteps`
 * rounds); results are returned as tool messages; the final assistant text is the brief.
 * Returns a reasoning trace of every tool call for display and audit.
 */
/** OpenAI-compatible JSON mode (https://platform.openai.com/docs/api-reference/chat/create#chat-create-response_format). Muse endpoint is OpenAI-compatible per README; Meta-specific JSON support is not independently verified in CI — fail-closed parse remains authoritative. */
export const MUSE_JSON_RESPONSE_FORMAT = { type: "json_object" };

async function toolLoop({ endpoint, headers, model, messages, tools, executeTool, maxSteps = 4, jsonMode = false }) {
  const convo = [...messages];
  const trace = [];
  for (let round = 0; round <= maxSteps; round++) {
    const body = { model, messages: convo };
    const toolRound = tools?.length && executeTool && round < maxSteps;
    if (toolRound) { body.tools = tools; body.tool_choice = "auto"; }
    else if (jsonMode) body.response_format = MUSE_JSON_RESPONSE_FORMAT;
    const data = await postChat(endpoint, headers, body);
    const msg = data?.choices?.[0]?.message;
    if (!msg) throw new Error("Empty model response");
    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls.slice(0, 6) : [];
    if (!calls.length) {
      if (!msg.content) throw new Error("Empty model content");
      return { content: String(msg.content), model: data?.model || model, trace };
    }
    convo.push({ role: "assistant", content: msg.content || "", tool_calls: calls });
    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.function?.arguments || "{}"); } catch { args = {}; }
      const result = executeTool(String(call.function?.name || ""), args);
      trace.push({ step: trace.length + 1, tool: call.function?.name, args, evidenceIds: result.evidenceIds || [], ok: !result.error });
      convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  throw new Error("Tool loop exceeded max steps");
}

async function completeMuseSpark(messages, toolOpts) {
  if (!process.env.MODEL_API_KEY) throw new Error("MODEL_API_KEY not configured");
  const endpoint = resolveMuseEndpoint();
  const headers = { Authorization: `Bearer ${process.env.MODEL_API_KEY}` };
  const model = museModelId();
  const jsonMode = process.env.MUSE_JSON_MODE !== "0";
  let out = await toolLoop({ endpoint, headers, model, messages, ...toolOpts, jsonMode });
  const trimmed = String(out.content || "").trim();
  const parsed = extractStructuredJson(out.content);
  if (jsonMode && parsed.parseError && (trimmed.startsWith("{") || trimmed.includes("```json"))) {
    const repair = await toolLoop({
      endpoint, headers, model,
      messages: [
        ...messages,
        { role: "assistant", content: out.content },
        { role: "user", content: "Your last message was not valid strict JSON for the brief schema. Reply with JSON ONLY: {\"claims\":[...],\"advisory\":[...]}. No duplicate keys. No free-text commentary." }
      ],
      ...toolOpts,
      maxSteps: 0,
      jsonMode: true
    });
    out = repair;
  }
  return { content: out.content, model: out.model, provider: "muse-spark", verifiedLive: true, trace: out.trace, jsonModeRequested: jsonMode };
}

async function completeLlama(messages, toolOpts) {
  const out = await toolLoop({ endpoint: resolveOllamaEndpoint(), headers: {}, model: process.env.OLLAMA_MODEL || "llama3", messages, ...toolOpts });
  return { content: out.content, model: out.model, provider: "llama", verifiedLive: true, trace: out.trace };
}

function completeFixture(messages) {
  const user = messages.find(m => m.role === "user")?.content || "";
  let parsed;
  try { parsed = JSON.parse(user); } catch { parsed = { scenarioId: "FIXTURE", summary: {}, plans: [] }; }
  const structured = buildSampleStructuredClaims(parsed.scenarioId ? parsed : { scenarioId: parsed.scenarioId || "FIXTURE", summary: parsed.summary || {}, plans: parsed.plans || [] });
  return { content: serializeStructuredBrief(structured), model: "fixture-template", provider: "fixture", verifiedLive: false, structuredOutput: true };
}

/** Adapter returns only `content` — no tool side effects (athere model-adapter pattern). */
export async function modelComplete({ provider, messages, tools, executeTool, maxSteps, sample }) {
  const chosen = resolveProvider(provider);
  const toolOpts = { tools, executeTool, maxSteps };
  let result;
  if (chosen === "muse-spark") result = await completeMuseSpark(messages, toolOpts);
  else if (chosen === "llama") result = await completeLlama(messages, toolOpts);
  else result = sample ? { content: sample.text, model: "fixture-template", provider: "fixture", verifiedLive: false, trace: sample.trace } : completeFixture(messages);

  const allowedKeys = new Set(["content", "model", "provider", "verifiedLive", "trace", "structuredOutput", "jsonModeRequested"]);
  if (Object.keys(result).some(k => !allowedKeys.has(k))) {
    throw new Error("Adapter rejected non-content result keys");
  }
  const trimmed = String(result.content || "").trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("```")) {
    return { ...result, blocked: false, structuredOutput: true };
  }
  const screen = screenModelOutput(result.content);
  if (!screen.allowed) {
    return { ...result, content: "", blocked: true, screenViolations: screen.violations };
  }
  return { ...result, blocked: false };
}

export async function proposeCertFieldsFromText(sanitizedText, { provider } = {}) {
  const messages = [
    {
      role: "developer",
      content: "Extract po_number, heat_number, material_grade from supplier text. Return JSON only. Use MISSING if absent. Never approve material."
    },
    { role: "user", content: sanitizedText.slice(0, 12000) }
  ];
  try {
    const { content, model, provider: used, verifiedLive } = await modelComplete({ provider, messages });
    const block = content.match(JSON_BLOCK);
    const jsonText = block ? block[1] : content;
    const proposal = JSON.parse(jsonText);
    return { proposal, model, provider: used, verifiedLive };
  } catch {
    return { proposal: null, error: "MODEL_PROPOSAL_FAILED", provider: resolveProvider(provider), verifiedLive: false };
  }
}
