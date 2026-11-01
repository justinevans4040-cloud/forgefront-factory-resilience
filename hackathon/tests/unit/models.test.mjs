import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createModelClient } from "../../src/models/client.mjs";
import { SPARK_BASETEN_ROUTE, WONDER_ROUTE } from "../../src/models/routes.mjs";
import { analyzeSnapshot } from "../../src/domain/engine.mjs";
import { buildDemoScenarioInput, createSnapshot } from "../../src/domain/scenario.mjs";

describe("Meta model clients", () => {
  it("fails closed when Wonder keys are missing instead of substituting sample", () => {
    assert.throws(() => createModelClient("wonder", { env: {} }), /MUSE_API_KEY\/MODEL_API_KEY unavailable/);
    assert.throws(() => createModelClient("spark-open", { env: {} }), /BASETEN_API_KEY\/FIREWORKS_API_KEY unavailable/);
    assert.throws(
      () => createModelClient("spark-open", { route: SPARK_BASETEN_ROUTE, apiKey: "" }),
      /allowlisted route and API key/,
    );
  });

  it("Wonder live path posts muse-wonder-1.0 with mocked fetch", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            id: "resp_test",
            model: "muse-wonder-1.0",
            output_text: "cited counterfactual",
          });
        },
      };
    };
    const client = createModelClient("wonder", {
      env: { MUSE_API_KEY: "test-wonder-key" },
      fetchImpl,
    });
    assert.equal(client.mode, "live");
    const result = await client.complete({ input: "explain tradeoff" });
    assert.equal(result.sample, false);
    assert.equal(result.modelId, "muse-wonder-1.0");
    assert.equal(result.text, "cited counterfactual");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, WONDER_ROUTE.endpoint);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.model, "muse-wonder-1.0");
    assert.match(calls[0].init.headers.Authorization, /^Bearer /);
  });

  it("Wonder uses MODEL_API_KEY when MUSE_API_KEY is absent", async () => {
    let sawAuth = false;
    const fetchImpl = async (_url, init) => {
      sawAuth = String(init.headers.Authorization).includes("fallback-key");
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({ model: "muse-wonder-1.0", output_text: "ok" });
        },
      };
    };
    const client = createModelClient("wonder", {
      env: { MODEL_API_KEY: "fallback-key" },
      fetchImpl,
    });
    await client.complete({ input: "x" });
    assert.equal(sawAuth, true);
  });

  it("Spark Open uses meta-models/muse-spark-open (no -1026) with mocked fetch", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            id: "chat_test",
            model: "meta-models/muse-spark-open",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "need evidence",
                  tool_calls: [
                    {
                      id: "tc1",
                      function: {
                        name: "get_incident",
                        arguments: "{}",
                      },
                    },
                  ],
                },
              },
            ],
          });
        },
      };
    };
    const client = createModelClient("spark-open", {
      env: { BASETEN_API_KEY: "test-baseten-key" },
      fetchImpl,
    });
    const result = await client.complete({
      messages: [{ role: "user", content: "investigate" }],
      tools: [{ type: "function", function: { name: "get_incident" } }],
    });
    assert.equal(result.sample, false);
    assert.equal(result.modelId, "meta-models/muse-spark-open");
    assert.equal(result.toolCalls[0].name, "get_incident");
    assert.equal(calls[0].url, SPARK_BASETEN_ROUTE.endpoint);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.model, "meta-models/muse-spark-open");
    assert.equal(body.model.includes("1026"), false);
  });

  it("Spark Open falls back to Fireworks route when Baseten key missing", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            model: "accounts/fireworks/models/muse-spark-open",
            choices: [{ message: { content: "ok" } }],
          });
        },
      };
    };
    const client = createModelClient("spark-open", {
      env: { FIREWORKS_API_KEY: "test-fw-key" },
      fetchImpl,
    });
    const result = await client.complete({ prompt: "hi" });
    assert.equal(result.provider, "fireworks");
    assert.match(calls[0].url, /fireworks/);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.model, "accounts/fireworks/models/muse-spark-open");
  });

  it("sample client labels offline mode and uses analysis when provided", async () => {
    const snapshot = createSnapshot(buildDemoScenarioInput());
    const analysis = analyzeSnapshot(snapshot);
    const client = createModelClient("sample");
    const result = await client.complete({ analysis });
    assert.equal(result.sample, true);
    assert.match(result.label, /SAMPLE/);
    assert.match(result.text, /Calculated recovery|No feasible/);
  });
});
