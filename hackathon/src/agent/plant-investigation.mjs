import { createHash, randomUUID } from 'node:crypto';
import { analyzePlant } from '../../public/plant-engine.mjs';
import { createPlantToolDispatcher, listPlantToolDefinitions } from './tools.mjs';
import { projectToolHistoryForModel } from './prompt-coverage.mjs';
import { redactSecrets } from '../security/redact.mjs';

const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

function plantEvidenceClaims(plant) {
  return plant.evidence
    .filter(record => record?.quantity && Number.isFinite(record.quantity.value))
    .map(record => ({
      evidenceId: record.id,
      value: record.quantity.value,
      unit: record.quantity.unit,
      documentId: record.documentId || record.id,
      recordId: record.recordId || record.id,
      field: record.field || 'quantity',
    }));
}

function validatePlantClaims(plant, claims) {
  const registry = new Map(plant.evidence.map(record => [record.id, record]));
  const accepted = [];
  const rejected = [];
  for (const raw of claims || []) {
    const claim = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const entry = registry.get(claim.evidenceId);
    const quantity = entry?.quantity;
    const valid =
      entry &&
      Object.keys(claim).every(key =>
        ['evidenceId', 'value', 'unit', 'documentId', 'recordId', 'field'].includes(key),
      ) &&
      quantity &&
      quantity.value === claim.value &&
      quantity.unit === claim.unit &&
      (entry.documentId || entry.id) === claim.documentId &&
      (entry.recordId || entry.id) === claim.recordId &&
      (entry.field || 'quantity') === claim.field;
    (valid ? accepted : rejected).push({
      ...claim,
      reason: valid ? 'EXACT_SOURCE_MATCH' : 'UNSUPPORTED_SOURCE_VALUE_OR_UNIT',
    });
  }
  return { accepted, rejected };
}

export async function investigatePlant({
  plant,
  lotId,
  failure,
  strategy = 'reroute',
  client,
  record = async () => {},
  secrets = [],
  progress = () => {},
} = {}) {
  if (!plant?.machines?.length || !plant?.operations?.length) throw new Error('PLANT_REQUIRED');
  const boundLot = lotId || plant.lots?.[0]?.id;
  if (!boundLot) throw new Error('PLANT_LOT_REQUIRED');
  const analysis = analyzePlant(plant, { lotId: boundLot, failure, strategy });
  if (!analysis.recovery.feasible) throw Object.assign(new Error('INFEASIBLE_OPTION'), { status: 409 });
  const tools = createPlantToolDispatcher(plant, { analysis });
  const runId = randomUUID();
  const calls = [];
  const clean = value => redactSecrets(value, secrets);
  const plantDigest = digest({
    plantId: plant.id,
    lotId: boundLot,
    failure,
    strategy,
    machines: plant.machines.length,
    operations: plant.operations.length,
  });

  if (client.sample) {
    const started = Date.now();
    progress({ number: 1, status: 'waiting', startedAt: started, timeoutMs: 5000 });
    const evidencePage = await tools.invoke('read_plant_collection', { collection: 'evidence', mode: 'summary' });
    const recoveryPage = await tools.invoke('read_plant_collection', { collection: 'recovery', mode: 'summary' });
    const narrative =
      `Plant investigation on ${plant.machines.length} machines: ${failure} hits lot ${boundLot}. ` +
      `Calculated ${strategy} finishes in ${analysis.recovery.finishHours}h for $${analysis.recovery.costUsd}.`;
    const claims = plantEvidenceClaims(plant);
    const entry = clean({
      type: 'model_call',
      runId,
      snapshotDigest: plantDigest,
      provider: 'sample',
      requestedModel: 'sample-offline-template',
      returnedModel: 'sample-offline-template',
      mode: 'sample',
      sample: true,
      status: 'accepted',
      failure: null,
      latencyMs: Date.now() - started,
      protocol: 'JSON_ENVELOPE',
      operationalRelease: false,
      plant: true,
    });
    calls.push(entry);
    await record(entry);
    progress({ number: 1, status: 'returned', startedAt: started, timeoutMs: 5000, sourcesRead: claims.length });
    const { accepted, rejected } = validatePlantClaims(plant, claims);
    return clean({
      runId,
      kind: 'plant',
      plantId: plant.id,
      lotId: boundLot,
      failure,
      strategy,
      run: {
        ok: true,
        stopReason: 'SAMPLE_COMPLETE',
        turns: 1,
        toolCalls: 2,
        snapshotDigest: plantDigest,
        mode: 'sample',
        sample: true,
        text: narrative,
        trace: [
          { type: 'tool_result', name: 'read_plant_collection', observation: evidencePage },
          { type: 'tool_result', name: 'read_plant_collection', observation: recoveryPage },
        ],
        operationalRelease: false,
      },
      proposalValid: accepted.length > 0 && rejected.length === 0,
      analysis,
      claims: { accepted, rejected },
      selectedOptionId: strategy,
      narrative,
      narrativeValidation: 'UNVALIDATED_MODEL_OUTPUT',
      calls,
      synthetic: true,
      operationalRelease: false,
    });
  }

  let final = null;
  const wrapped = {
    ...client,
    async complete(request) {
      let started = Date.now();
      let result;
      let status = 'rejected';
      let failure = null;
      const observations = request.messages
        .filter(message => message.role === 'tool')
        .map(message => {
          try {
            return JSON.parse(message.content);
          } catch {
            return {};
          }
        });
      const hasEvidence = observations.some(
        observation => observation.collection === 'evidence' || observation.items || observation.total != null,
      );
      const hasRecovery = observations.some(
        observation => observation.collection === 'recovery' || observation.assignments || observation.feasible != null,
      );
      progress({
        number: calls.length + 1,
        status: 'waiting',
        startedAt: started,
        timeoutMs: request.timeoutMs,
        sourcesRead: hasEvidence ? 1 : 0,
      });
      try {
        const protocol =
          'You are The Britt, Forgefront Systems sovereign agent investigating a plant-wide disruption. Use only read_plant_collection. Page or summarize every machine, operation, evidence and recovery assignment with truncated:false coverage. Return exactly one JSON object. Tool form: {"action":"tool","name":"read_plant_collection","arguments":{"collection":"evidence","mode":"summary"}}. Finish: {"action":"final","optionId":"' +
          strategy +
          '","narrative":"plain-English plant recovery interpretation","claims":[{"evidenceId":"exact ID","value":1,"unit":"each","documentId":"exact","recordId":"exact","field":"quantity"}]}. Never approve or invent evidence. Tools: ' +
          JSON.stringify(listPlantToolDefinitions()) +
          '.';
        const projectedHistory = projectToolHistoryForModel(request.messages);
        const messages = [
          { role: 'system', content: protocol },
          ...projectedHistory.map(message => ({
            role: message.role === 'tool' ? 'user' : message.role,
            content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
          })),
        ];
        const ready = hasEvidence && hasRecovery;
        messages.push({
          role: 'user',
          content: ready
            ? 'Plant evidence and recovery coverage are complete. Return action final now with optionId ' +
              strategy +
              ' and exact source claims from the plant evidence registry. JSON only.'
            : `Model turn ${calls.length + 1} of 6. Next call read_plant_collection for ${hasEvidence ? 'recovery' : 'evidence'} with mode summary. JSON tool envelope only.`,
        });
        result = await client.complete({
          messages,
          timeoutMs: request.timeoutMs,
          maxTokens: ready ? (client.id === 'spark-open' ? 8192 : 2048) : 1024,
        });
        if (
          !client.sample &&
          result.modelId !==
            (client.resilient && result.route?.provider === 'baseten'
              ? 'meta-models/muse-spark-open'
              : client.route.model)
        ) {
          throw new Error('MODEL_IDENTITY_MISMATCH');
        }
        const text = result.text
          .trim()
          .replace(/^```(?:json)?\s*/, '')
          .replace(/\s*```$/, '');
        let envelope;
        for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
          try {
            const candidate = JSON.parse(text.slice(start));
            if (candidate?.action) {
              envelope = candidate;
              break;
            }
          } catch {
            // keep scanning for a complete terminal envelope
          }
        }
        if (!envelope) throw new Error('INVALID_MODEL_ENVELOPE');
        if (
          envelope.action === 'tool' &&
          typeof envelope.name === 'string' &&
          envelope.arguments &&
          typeof envelope.arguments === 'object' &&
          !Array.isArray(envelope.arguments)
        ) {
          status = 'accepted';
          return { ...result, toolCalls: [{ id: randomUUID(), name: envelope.name, arguments: envelope.arguments }] };
        }
        if (envelope.action !== 'final' || !Array.isArray(envelope.claims)) throw new Error('INVALID_MODEL_ENVELOPE');
        final = clean(envelope);
        status = 'accepted';
        return { ...result, toolCalls: [] };
      } catch (error) {
        failure =
          error?.name === 'AbortError'
            ? 'MODEL_TIMEOUT'
            : error?.status
              ? `MODEL_HTTP_${error.status}`
              : ['MODEL_IDENTITY_MISMATCH', 'INVALID_MODEL_ENVELOPE'].includes(error.message)
                ? error.message
                : 'INVALID_OR_FAILED_MODEL_RESPONSE';
        throw new Error(failure);
      } finally {
        const entry = clean({
          type: 'model_call',
          runId,
          snapshotDigest: plantDigest,
          provider: result?.route?.provider ?? client.route?.provider ?? null,
          requestedModel: result?.route?.model ?? client.route?.model ?? null,
          returnedModel: result?.modelId ?? null,
          mode: client.mode,
          sample: Boolean(client.sample),
          status,
          failure,
          latencyMs: Date.now() - started,
          protocol: 'JSON_ENVELOPE',
          operationalRelease: false,
          plant: true,
        });
        calls.push(entry);
        await record(entry);
        progress({ number: calls.length, status: failure ? 'stopped' : 'returned', startedAt: started, timeoutMs: request.timeoutMs });
      }
    },
  };

  const startedAt = Date.now();
  const deadline = startedAt + 60_000;
  const messages = [{ role: 'user', content: 'Investigate the plant disruption with read_plant_collection.' }];
  const trace = [];
  let turns = 0;
  let toolCalls = 0;
  let stopReason = null;
  while (turns < 6 && Date.now() < deadline) {
    turns += 1;
    const completion = await wrapped.complete({ messages, timeoutMs: Math.max(1000, deadline - Date.now()) });
    const callsForTurn = Array.isArray(completion.toolCalls) ? completion.toolCalls : [];
    trace.push({ type: 'model_turn', turn: turns, text: completion.text || '', toolCallCount: callsForTurn.length });
    if (!callsForTurn.length) {
      stopReason = 'MODEL_STOP';
      break;
    }
    for (const call of callsForTurn) {
      if (toolCalls >= 10) {
        stopReason = 'TOOL_CALL_LIMIT';
        break;
      }
      toolCalls += 1;
      let observation;
      try {
        observation = await tools.invoke(call.name, call.arguments || {});
      } catch (error) {
        observation = { error: { code: error.code || 'TOOL_ERROR', message: String(error.message || error) } };
      }
      trace.push({ type: 'tool_result', name: call.name, observation });
      messages.push({ role: 'tool', content: JSON.stringify(observation) });
    }
    if (stopReason) break;
  }
  if (!stopReason) stopReason = turns >= 6 ? 'TURN_LIMIT' : 'COMPLETE';

  const { accepted, rejected } = validatePlantClaims(plant, final?.claims);
  const finalSchemaValid =
    final &&
    Object.keys(final).sort().join(',') === 'action,claims,narrative,optionId' &&
    final.action === 'final' &&
    final.optionId === strategy &&
    typeof final.narrative === 'string' &&
    final.narrative.length > 0 &&
    Array.isArray(final.claims);
  const proposalValid = Boolean(finalSchemaValid && accepted.length > 0 && rejected.length === 0 && analysis.recovery.feasible);

  return clean({
    runId,
    kind: 'plant',
    plantId: plant.id,
    lotId: boundLot,
    failure,
    strategy,
    run: {
      ok: stopReason === 'MODEL_STOP' || stopReason === 'COMPLETE',
      stopReason,
      turns,
      toolCalls,
      snapshotDigest: plantDigest,
      mode: client.mode,
      sample: Boolean(client.sample),
      text: typeof final?.narrative === 'string' ? final.narrative : '',
      trace,
      operationalRelease: false,
    },
    proposalValid,
    analysis,
    claims: { accepted, rejected },
    selectedOptionId: proposalValid ? strategy : null,
    narrative: typeof final?.narrative === 'string' ? final.narrative : '',
    narrativeValidation: 'UNVALIDATED_MODEL_OUTPUT',
    calls,
    synthetic: true,
    operationalRelease: false,
  });
}
