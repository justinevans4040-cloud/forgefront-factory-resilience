import { listToolDefinitions } from "./tools.mjs";
import { buildInvestigationSystemPrompt } from "./prompts.mjs";
import { analyzeSnapshot } from "../domain/engine.mjs";

export const LOOP_LIMITS = Object.freeze({
  maxTurns: 6,
  maxToolCalls: 10,
  maxWallClockMs: 60_000,
});

/**
 * Bounded agent loop: max 6 model turns, 10 tool calls, 60s wall clock.
 * Read-only tools only; write/approve names never dispatched.
 */
export function createAgentLoop(options = {}) {
  const maxTurns = Math.min(options.maxTurns ?? LOOP_LIMITS.maxTurns,LOOP_LIMITS.maxTurns);
  const maxToolCalls = Math.min(options.maxToolCalls ?? LOOP_LIMITS.maxToolCalls,LOOP_LIMITS.maxToolCalls);
  const maxWallClockMs = Math.min(options.maxWallClockMs ?? LOOP_LIMITS.maxWallClockMs,LOOP_LIMITS.maxWallClockMs);
  const now = options.now || (() => Date.now());

  return Object.freeze({
    limits: Object.freeze({ maxTurns, maxToolCalls, maxWallClockMs }),
    async run({ snapshot, tools, modelClient, goal }) {
      if (!snapshot?.snapshotDigest) throw new Error("agent loop requires a snapshot");
      if (!tools?.invoke) throw new Error("agent loop requires a tool dispatcher");
      if (!modelClient?.complete) throw new Error("agent loop requires a model client");

      const startedAt = now();
      const deadline = startedAt + maxWallClockMs;
      const trace = [];
      const messages = [
        {
          role: "system",
          content: buildInvestigationSystemPrompt({
            snapshotDigest: snapshot.snapshotDigest,
            label: snapshot.label,
          }),
        },
        {
          role: "user",
          content: goal || "Investigate the certificate hold and compare recovery options using tools.",
        },
      ];

      let turns = 0;
      let toolCalls = 0;
      let stopReason = null;
      let finalText = "";
      const seenCalls = new Map();

      while (turns < maxTurns) {
        const remainingMs = deadline - now();
        if (remainingMs <= 0) {
          stopReason = "WALL_CLOCK_EXCEEDED";
          break;
        }

        turns += 1;
        let completion;
        try {
          completion = await modelClient.complete({
            messages,
            tools: listToolDefinitions(),
            timeoutMs: Math.min(remainingMs, maxWallClockMs),
            analysis: analyzeSnapshot(snapshot),
          });
        } catch (err) {
          stopReason = "MODEL_ERROR";
          trace.push({
            type: "model_error",
            turn: turns,
            message: String(err?.message || err),
          });
          break;
        }

        finalText = completion.text || finalText;
        if(now()>deadline){stopReason='WALL_CLOCK_EXCEEDED';break;}
        const calls = Array.isArray(completion.toolCalls) ? completion.toolCalls : [];
        trace.push({
          type: "model_turn",
          turn: turns,
          mode: completion.mode,
          sample: Boolean(completion.sample),
          label: completion.label,
          modelId: completion.modelId || null,
          text: completion.text || "",
          toolCallCount: calls.length,
        });

        if (completion.sample && calls.length === 0) {
          stopReason = "SAMPLE_COMPLETE";
          break;
        }

        if (calls.length === 0) {
          stopReason = "MODEL_STOP";
          break;
        }

        messages.push({
          role: "assistant",
          content: completion.text || "",
          tool_calls: calls.map(call => ({ id: call.id, type: "function", function: { name: call.name, arguments: JSON.stringify(call.arguments || {}) } })),
        });

        for (const call of calls) {
          if (toolCalls >= maxToolCalls) {
            stopReason = "TOOL_CALL_LIMIT";
            break;
          }
          if (now() >= deadline) {
            stopReason = "WALL_CLOCK_EXCEEDED";
            break;
          }

          const signature = `${call.name}:${stableArgs(call.arguments)}`;
          const prior = seenCalls.get(signature) || 0;
          if (prior >= 2) {
            stopReason = "REPEATED_TOOL_CALL";
            trace.push({ type: "repeated_tool_call", name: call.name, arguments: call.arguments });
            break;
          }
          seenCalls.set(signature, prior + 1);

          toolCalls += 1;
          let observation;
          let ok = true;
          try {
            observation = await tools.invoke(call.name, call.arguments || {});
          } catch (err) {
            ok = false;
            observation = {
              error: {
                code: err.code || "TOOL_ERROR",
                message: String(err.message || err),
              },
            };
            if (["UNKNOWN_TOOL","FORBIDDEN","TOOL_SCHEMA","CROSS_SNAPSHOT"].includes(err.code)) {
              stopReason = err.code;
            }
          }

          trace.push({
            type: "tool_result",
            turn: turns,
            toolCallIndex: toolCalls,
            name: call.name,
            ok,
            observation,
          });

          messages.push({
            role: "tool",
            tool_call_id: call.id || `tool_${toolCalls}`,
            content: JSON.stringify(observation),
          });

          if (stopReason) break;
        }

        if (stopReason) break;
      }

      if (!stopReason) {
        if (turns >= maxTurns) stopReason = "TURN_LIMIT";
        else if (toolCalls >= maxToolCalls) stopReason = "TOOL_CALL_LIMIT";
        else stopReason = "COMPLETE";
      }

      const elapsedMs = Math.max(0, now() - startedAt);
      return Object.freeze({
        ok: stopReason === "MODEL_STOP" || stopReason === "SAMPLE_COMPLETE" || stopReason === "COMPLETE",
        stopReason,
        turns,
        toolCalls,
        elapsedMs,
        limits: Object.freeze({ maxTurns, maxToolCalls, maxWallClockMs }),
        snapshotDigest: snapshot.snapshotDigest,
        mode: modelClient.mode,
        sample: Boolean(modelClient.sample),
        label: modelClient.label,
        text: finalText,
        trace: Object.freeze(trace),
        operationalRelease: false,
      });
    },
  });
}

function stableArgs(args) {
  try {
    return JSON.stringify(args || {});
  } catch {
    return String(args);
  }
}
