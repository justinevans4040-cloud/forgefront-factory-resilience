# Local API contract

All /api routes enforce Host/Origin and rate limits; quotas return 429 plus Retry-After. Static assets, minimal /health and /healthz, and the explicitly enabled visitor demo bootstrap are public; workflow requests still require a session and CSRF. JSON has a body-size cap; nonempty bodies require application/json. Unexpected errors are sanitized.

POST /api/meta/session requires Bearer admin or named operator/auditor env token. It creates a ten-minute HttpOnly/SameSite=Strict cookie (Secure on direct TLS) and returns CSRF plus a session token for CLI compatibility. Browser uses cookie and X-CSRF-Token; tools may use X-Session-Token. Static HTML grants no seat. POST /api/meta/logout requires session/CSRF, revokes seat and clears cookie. No browser localStorage token.

POST /api/workflow/status returns current immutable snapshot, analysis, registry, runs, recovery decision, integrity/storage status and route-configuration booleans, never credential values.

POST /api/workflow/investigation-start with provider wonder/baseten/fireworks/explicit sample returns owner-bound jobId and running status. POST /investigation-status with jobId returns running/completed/failed; completed includes the recorded result. Retention is bounded to 32, evicting completed/failed entries. Concurrent investigations and cross-session reads fail. The synchronous /investigate route remains for local tools. All inference stays within six turns, ten calls and one minute. Restart drops job handles and seats. Unexpired encrypted pending reviews survive, bound to the same named identity after reauthentication. Status exposes only reviews owned by the current session or recovered original identity.

POST /review with runId/optionId returns a sealed actor/run/snapshot/plan/nonce/expiry envelope. POST /confirm with nonce and exact typed APPROVE optionId records recovery acceptance once. POST /revoke invalidates acceptance/reviews. POST /shock with cellId creates changed snapshot; POST /reset creates fresh default scenario identity. No model tool can invoke these privileged transitions.

POST /verify checks encrypted disk chain/HMAC. POST /export returns sanitized plaintext JSON only with acknowledgePlaintext: EXPORT PLAINTEXT. POST /checkpoint returns FORGEFRONT_CHECKPOINT_V1 head/count/signature for independent retention. POST /report returns plaintext Markdown in text only with the same explicit acknowledgePlaintext field. Decision recording is a human workflow transition. Intentional conflicts return 409; unexpected failures return generic INTERNAL, never a path/stack/provider body.

HACKATHON_OPERATORS_JSON configures named operator/auditor seats; session response/status include operator id/role. Auditor mutations/diagnostic inference fail 403, with read/verify/export permitted. Identities originate from validated server env, never request fields. New consent/model/decision/shock events record operator ID; envelopes remain bound to the session actor digest. Only admin can reset a scenario; only named operator can revoke acceptance. Shared investigation and advisory confirmation rights are intentional; this is separated rights, not dual-control approval. Login attempts are limited to 12 per minute per direct client and failed credentials are ledgered without credentials. API and authenticated-route quotas are 240 and 120 per minute per client. Forwarded headers do not select quota identity.

Accepted decisions retain the original sealed review actor and separately record confirmationActor (the confirming session digest) and resumedAfterRestart. Original envelope HMAC fields remain intact; historical decisions without these new fields are labeled not recorded in the readable report.

## Encrypted packet export and persistent quotas

POST /api/workflow/encrypted-export requires the existing session, CSRF and authenticated quota. Body has exactly one field, passphrase (16–160 characters). Auditors may export. It returns FFR_ENCRYPTED_EXPORT_V1 with fixed scrypt-N16384-r8-p1, base64 salt/iv/tag/data; never the raw packet. Rejected length or rejected local strength heuristic returns 400. Decryption retains length-only validation for existing packets. No plaintext acknowledgement applies to this encrypted response. Existing /export and /report still require acknowledgePlaintext: EXPORT PLAINTEXT. No generic diagnostic provider route was added.

API/login/authenticated workflow quotas persist encrypted counters under the normal private state directory/key. Global credential-failure audit records are capped at twelve per rolling minute across clients and restart; the last warns of potentially omitted further attempts. See SECURITY_CONTROLS.md for local-file custody and single-process limits.


## The Meta Hackathon build — owner-bound call timing

The existing `investigation-status` response includes optional `call` metadata: `number`, `status` (`waiting`, `returned`, `stopped`), `startedAt` (epoch milliseconds), `timeoutMs` and nonnegative `remainingMs`. It uses the exact timeout passed to the current model request, bounded by the remaining one-minute investigation budget. Polling still requires the originating session and CSRF; another session cannot observe a job. This field contains no prompt, response body or credential. It neither retries nor changes providers. The browser decreases the last observed remaining time between polls and labels the value as a request timeout, not completion progress. No new endpoint or permission is introduced.

## The Meta Hackathon build — explicit route pre-flight

POST /api/workflow/provider-check accepts exactly provider: wonder, baseten or fireworks. Session, CSRF, operator/admin role and existing quotas are required. One selected route receives one nonce request with an eight-second timeout. Exact returned identity and nonce are required for GREEN; HTTP, timeout, missing key and contract failures return RED. The response contains light, fixed reason and checkedAt (epoch milliseconds). Each attempt records a model_call with purpose provider_preflight, authenticated actor, model, duration and accepted/rejected outcome. No response body or key is returned. Sample, unknown routes and extra fields are rejected before inference. Auditors receive 403.

Workflow status includes routeHealth for the three live routes. Missing keys are RED, configured untested routes are UNCHECKED. Observed health is process-local; the UI expires checks after fifteen minutes and names recently GREEN alternatives without changing the selected route. A new process starts with fresh health observations.

## Recovery project board and The Britt

Workflow status includes the recovery board and only the requesting session’s pending The Britt proposal and scoped memory. POST /api/workflow/britt-draft accepts provider wonder, baseten or explicit sample. It requires a current human-accepted recovery decision. The selected Meta route receives the accepted engine option, exact source evidence, prior board and scoped context. Drafts have strict task fields, bounded deadlines, acyclic dependencies and exact evidence/owner validation. Inference is bounded to 45 seconds; failure is retained and a new draft requires deliberate operator action.

POST /api/workflow/britt-decide accepts proposalId and action approve or decline. A proposal is single-use, session/operator/scenario-bound, bound to the accepted decision nonce and snapshot, and expires after five minutes. Approval creates tracked tasks; decline creates none. Auditors cannot draft, approve, decline or move tasks.

POST /api/workflow/task-move accepts taskId, status and idempotencyKey. Status is To do, In progress, Blocked or Done. Dependencies must complete before dependent work starts or completes. Reusing the same actor/key/operation returns the existing state; conflicting key reuse fails. Keys and task transitions persist in the encrypted ledger. A second shock retains completed work and blocks unfinished tasks with a recorded change reason until fresh recovery and task approval. Encrypted packets include task state, all task events and scoped The Britt context.

## Current browser contract

The eight-screen UI uses the same authoritative workflow APIs. Public demo bootstrap grants a visitor-isolated demonstration seat; persistent operator mode requires the provisioned identity. The browser may construct the exact confirmation phrase after a deliberate authorization wall, while the server still validates the sealed review and single-use nonce. Applying a shock must call the server transition, not merely display a local preview. Current default post-shock capacity has no feasible complete recovery; fresh investigation is not a guarantee of a new acceptable option.
