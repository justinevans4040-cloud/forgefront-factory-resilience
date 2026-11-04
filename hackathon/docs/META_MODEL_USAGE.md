# Meta model integration

**Spark Open investigates. The engine calculates. The Britt explains and proposes. The human decides.**

| Model | Allowlisted endpoint and identity | Role |
| --- | --- | --- |
| Muse Spark Open | Baseten `https://inference.baseten.co/v1/chat/completions` · `meta-models/muse-spark-open` | Primary live evidence investigation |
| Muse Wonder | Meta Model API `https://api.meta.ai/v1/responses` · `muse-wonder-1.0` | Supported recovery reasoning and task drafting |
| Muse Spark Open | Fireworks `https://us.api.fireworks.ai/inference/v1/chat/completions` · `accounts/fireworks/models/muse-spark-open` | Standby only; excluded from normal public-demo traffic |
| Sample | Local deterministic template, no provider | Explicit offline workflow demonstration; no live AI |

[routes.mjs](../src/models/routes.mjs) fixes endpoints and identities. Credentials come from the server environment only: `BASETEN_API_KEY`, `MUSE_API_KEY` (fallback `MODEL_API_KEY`) and optional standby `FIREWORKS_API_KEY`. Public launch removes the standby credential.

## What is demonstrated

The submitted video records a successful Spark Open investigation on Baseten. Muse Wonder is an implemented integration; its availability depends on the Meta account and provider billing. A configured key, old successful packet or supported model definition is not a claim that Wonder answered the current investigation. The app and retained call records identify the actual responding route, failures and any bounded task-draft fallback.

Read-only tools retrieve the incident, exact evidence, impacted jobs, capacity and calculated recovery choices. The server validates structured quantities, units, entities and source references against the immutable snapshot. Model prose does not replace deterministic arithmetic or authorize production. Usage values are provider-supplied; absent usage remains null.

## Bounded execution and failures

The investigation loop has at most six turns, ten read-only tool calls and one minute. Spark final replies allow 8,192 tokens; tool selection allows 1,024. Wonder final replies allow 2,048. Identity, JSON envelope and source validation still apply. Missing credentials, HTTP errors, malformed output, wrong identity and timeouts remain visible failures. A new investigation requires a deliberate action.

Task drafting is a separate request after a current human-accepted decision. Wonder-first drafting can make one bounded Baseten continuation within a shared 45-second deadline, retaining the actual route and failure metadata. That continuation never grants approval. Standby Fireworks is not part of this task fallback.

`npm run check:providers --prefix hackathon` tests primary routes with nonce/identity requests; it does not call standby. Route health expires and provider-reported identity is checked, not independently attested. See the [evidence index](../evidence/README.md) for the distinction between live calls, controlled regressions, Sample and historical captures.

[Architecture](ARCHITECTURE.md) · [Model comparison](MODEL_COMPARISON.md) · [API contract](API_CONTRACT.md)
