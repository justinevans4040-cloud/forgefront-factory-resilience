#!/usr/bin/env node
/**
 * Live Muse Spark / Ollama verification harness.
 * Writes docs/evidence/live-model-verify.json — never fake-passes without a real call.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { modelComplete, resolveProvider } from "../src/model-adapter.mjs";
import { screenModelOutput } from "../src/output-screen.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const outPath = join(root, "docs/evidence/live-model-verify.json");

function hasLiveCredentials() {
  if (process.env.MODEL_API_KEY?.trim()) return "muse-spark";
  const ollama = process.env.OLLAMA_ENDPOINT?.trim();
  if (ollama) return "ollama";
  return null;
}

async function writeEvidence(payload) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify({ ...payload, at: new Date().toISOString() }, null, 2) + "\n");
}

async function main() {
  const mode = hasLiveCredentials();
  if (!mode) {
    await writeEvidence({
      status: "skipped",
      reason: "No MODEL_API_KEY or OLLAMA_ENDPOINT — live verification not run",
      verifiedLive: false
    });
    process.exit(0);
  }

  const provider = mode === "ollama" ? "ollama" : "muse-spark";
  const messages = [
    { role: "developer", content: "Reply with one sentence. Never approve material release." },
    { role: "user", content: "Summarize a heat-number mismatch review in under 30 words." }
  ];
  try {
    const model = await modelComplete({ provider, messages });
    const screened = screenModelOutput(model.content || "");
    await writeEvidence({
      status: model.blocked || !screened.allowed ? "blocked_output" : "verified",
      provider: model.provider || resolveProvider(provider),
      model: model.model,
      verifiedLive: Boolean(model.verifiedLive),
      blocked: Boolean(model.blocked || !screened.allowed),
      sampleLength: (model.content || "").length
    });
    process.exit(model.verifiedLive ? 0 : 1);
  } catch (error) {
    await writeEvidence({
      status: "error",
      reason: String(error?.message || error),
      verifiedLive: false
    });
    process.exit(1);
  }
}

main();
