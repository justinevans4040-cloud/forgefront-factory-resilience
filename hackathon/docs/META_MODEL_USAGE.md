# The Meta Hackathon build — Meta models on the evidence

**Spark Open investigates. Wonder explains. The engine calculates. The human decides.**

| Model | Exact route | Server credential | Product role |
| --- | --- | --- | --- |
| Muse Wonder | https://api.meta.ai/v1/responses · muse-wonder-1.0 | MUSE_API_KEY, fallback MODEL_API_KEY | Recovery narrative and counterfactual tradeoff |
| Muse Spark Open | Baseten · meta-models/muse-spark-open | BASETEN_API_KEY | Read-only evidence investigation |
| Muse Spark Open | Fireworks · accounts/fireworks/models/muse-spark-open | FIREWORKS_API_KEY | Optional backup investigator host; reports GREEN/RED and never gates the demo |

[src/models/routes.mjs](../src/models/routes.mjs) locks the documented endpoints and model IDs. Requests, returned identity, read-only tool trace, latency, supplied usage and source-validation outcomes are recorded. Exact structured facts are checked against the server registry; the model interpretation appears alongside them. Deterministic code computes feasibility, hours and cost.

The shared JSON-envelope investigation is bounded to six turns, ten read-only tools and one minute. Spark Open final responses allow 8,192 tokens for reasoning plus the structured answer; tool-selection turns retain 1,024 tokens. Wonder final responses retain 2,048 tokens. Every response still passes identity, envelope and exact-claim checks. Missing keys, HTTP errors, incorrect identity, malformed replies and deadline failures stop visibly. Every new attempt and route choice is explicit. Sample is the offline walkthrough and makes no live AI call.

Run `npm run check:providers --prefix hackathon` for one nonce/identity request per primary route. The optional backup reports a RED light without a request in this standard check. In the room, **Check selected route** makes one eight-second request on the selected route and records its result. GREEN requires exact nonce and returned-model agreement. RED names failure; UNCHECKED requests a new check. Health expires after fifteen minutes. Provider-reported identity is the identity field tested by these checks.

[Provider proof](../evidence/README.md) · [Live guided packet](../evidence/README.md) · [Same-snapshot comparison](MODEL_COMPARISON.md) · [API contract](API_CONTRACT.md).
