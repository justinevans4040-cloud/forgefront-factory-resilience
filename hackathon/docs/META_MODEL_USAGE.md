# Meta model usage

All product AI is restricted to Muse Wonder and Muse Spark Open. No other product inference, embeddings, image, speech or transcription model is permitted.

The user-supplied Wonder route is https://api.meta.ai/v1/responses with model muse-wonder-1.0. Server credential variable: MUSE_API_KEY. Wonder supplies a cited recovery narrative and counterfactual explanation; deterministic calculations own quantities, feasibility and comparison values.

The user-supplied Baseten model identifier is meta-models/muse-spark-open. Server credential variable: BASETEN_API_KEY. The Fireworks identifier is accounts/fireworks/models/muse-spark-open with FIREWORKS_API_KEY. These are separate deliberate provider selections. Do not invent a Baseten endpoint, assume protocol parity, automatically switch providers/models, or accept arbitrary URL/model overrides. Spark Open investigates via bounded read-only tools.

These route identifiers are configuration requirements supplied for this task, not newly verified live calls. Establish actual endpoint/auth/request-response protocol, provider/deployment mapping and returned identity with sanitized evidence. A requested/echoed alias or UI badge alone does not prove model identity. Do not preserve an older suffixed model identifier as the configured route.

Sample mode is a manually selected, labeled offline fallback only: SAMPLE - OFFLINE; NO LIVE AI. Persist that label on every result and export. It performs deterministic templating and never counts as a live Meta run, cached live proof or bonus evidence. Provider failure remains visible; no silent fallback.

Retain sanitized request ID if available, verified provider/model mapping, snapshot/run digest, duration, tool trace and validation outcome. No keys, auth headers, raw secret-bearing requests or untrusted model dumps. Missing usage/cost is unknown, never zero. Compare both live models on the same frozen contract and snapshot; count rejected claims and failed attempts honestly. No live access, credit balance, performance ranking or eligibility is certified here.

## Provider smoke and authenticated response route

Run `npm test` and `npm run smoke:meta` from hackathon. The smoke checks Wonder, Baseten and Fireworks independently, requires a fresh nonce response and returned model identity, redacts exact credential values, and exits nonzero for blocked or failed providers. Evidence is saved under evidence/api-smoke with stable filenames. It never treats missing credentials or HTTP success alone as live proof. Returned model metadata is provider-reported identity, not independent attestation of provider internals.

Start with `npm start`. POST /api/meta/session authenticates the server-side HACKATHON_ADMIN_TOKEN using a Bearer header and returns an expiring session plus CSRF token. POST /api/meta/respond requires X-Session-Token and X-CSRF-Token, an allowed Origin when supplied, and a JSON body containing provider (wonder, baseten or fireworks) and prompt. The route applies a shared rate limit and uses only the three configured Meta endpoints. Missing credentials return 503; provider failures return 502. No sample fallback or cross-provider switch occurs on this route. Model text is explicitly UNVALIDATED_MODEL_OUTPUT, synthetic and advisory; operationalRelease remains false. This diagnostic route does not certify the complete investigation, citation-validation, consent or UI flow.

## Verification boundary

The independent fixture additions and scoped documentation were retained. The reviewed agent loop now serializes normalized tool calls into the Chat Completions function schema, covered by a regression test. Provider clients preserve missing returned model identity as null rather than substituting the requested ID. Provider smoke now attempts all three configured routes independently and rejects incorrect nonce output. The authenticated diagnostic response route is not a claim-validated recovery proposal.

## Verified provider execution

All three configured Meta routes passed live nonce-and-returned-model checks in evidence/api-smoke. Baseten needs a completion budget that includes reasoning tokens; the smoke reserves 1024 tokens and still requires an exact final nonce. Authenticated, session-bound and CSRF-protected diagnostic requests returned live text from all three providers. Provider-reported identity is not independent attestation. See server.json for sanitized route results.
