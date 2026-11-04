# Meta model integration

**Spark Open investigates. The engine calculates. The Britt explains and proposes. The human decides.**

| Model | Allowlisted endpoint and identity | Role |
| --- | --- | --- |
| Muse Spark Open | Baseten `https://inference.baseten.co/v1/chat/completions` · `meta-models/muse-spark-open` | Primary live evidence investigation |
| Muse Wonder | Meta Model API `https://api.meta.ai/v1/responses` · `muse-wonder-1.0` | Supported recovery reasoning and task drafting |
| Muse Spark Open | Fireworks `https://us.api.fireworks.ai/inference/v1/chat/completions` · `accounts/fireworks/models/muse-spark-open` | Standby only; excluded from normal public-demo traffic |
| Sample | Local deterministic template | Repeatable end-to-end workflow rehearsal |

[routes.mjs](../src/models/routes.mjs) fixes endpoints and identities. Credentials come from the server environment only: `BASETEN_API_KEY`, `MUSE_API_KEY` (fallback `MODEL_API_KEY`) and optional standby `FIREWORKS_API_KEY`. Public launch removes the standby credential.

## What is demonstrated

The submitted video records a successful Spark Open investigation on Baseten. Muse Wonder is implemented through the Meta Model API and activates for provisioned accounts. The interface and retained call records identify the responding route, model identity, outcome and any bounded task-draft continuation.

Read-only tools retrieve the incident, exact evidence, impacted jobs, capacity and calculated recovery choices. The server validates structured quantities, units, entities and source references against the immutable snapshot. Model prose does not replace deterministic arithmetic or authorize production. Usage values are provider-supplied; absent usage remains null.

## Execution controls

The investigation loop has at most six turns, ten read-only tool calls and one minute. Spark final replies allow 8,192 tokens; tool selection allows 1,024. Wonder final replies allow 2,048. Every result passes identity, JSON-envelope and source validation. Credentials, HTTP status, output shape, model identity and timing are recorded as explicit workflow states, and each new investigation begins with a deliberate operator action.

Task drafting is a separate request after a current human-accepted decision. Wonder-first drafting can make one bounded Baseten continuation within a shared 45-second deadline, retaining the actual route and failure metadata. That continuation never grants approval. Standby Fireworks is not part of this task fallback.

`npm run check:providers --prefix hackathon` tests primary routes with nonce and identity requests while leaving standby isolated. Route health expires on schedule, and call records preserve provider-reported identity. The [evidence index](../evidence/README.md) separates live calls, controlled regressions, Sample runs and historical captures.

[Architecture](ARCHITECTURE.md) · [Model comparison](MODEL_COMPARISON.md) · [API contract](API_CONTRACT.md)
