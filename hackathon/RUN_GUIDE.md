# ForgeFront recovery room

This app runs synthetic manufacturing recovery investigations with Muse Wonder on the Meta Model API and Muse Spark Open on explicitly selected Baseten or Fireworks routes. Models gather evidence using a tested JSON envelope protocol and a read-only dispatcher. The deterministic engine computes feasible options. Human acceptance records an advisory decision; operationalRelease is always false.

## Start the isolated demo

From the repository root, run `npm run demo --prefix hackathon` and open `http://127.0.0.1:8791`. Startup prints route configuration presence only. Authenticate, then choose **Start guided synthetic scenario** and **Show next action**. Actual state gates the story: live Spark and Wonder on one snapshot, human acceptance, second shock, reinvestigation and revised decision. Target narration is about three minutes; latency may extend a rehearsal. HACKATHON_DEMO_PORT overrides the port; Ctrl+C stops the server. The rehearsal entry uses disposable private state and the public synthetic token `synthetic-browser-rehearsal`. It binds only to loopback. This token is a test credential, never the production default. Existing provider keys are inherited from the environment. Rehearsal deliberately starts a fresh ledger each launch; normal startup retains its configured ledger.

For normal local operation, configure HACKATHON_ADMIN_TOKEN and a stable HACKATHON_LEDGER_KEY securely in the process environment. Set HACKATHON_STATE_DIR to a dedicated private directory outside the static assets; the default is data/hackathon. Set MUSE_API_KEY (or MODEL_API_KEY) for Wonder, BASETEN_API_KEY for Baseten, and FIREWORKS_API_KEY for Fireworks. Never put values in source, command history, screenshots or reports. Run `npm start --prefix hackathon`, then open `http://127.0.0.1:8787`. No runtime dependencies or build step are required. The environment template lists names only; the app does not load a dotenv file automatically.

Private state is restricted to the current Windows identity and SYSTEM, with inheritance removed and SID-based ACL verification. POSIX uses directory mode 0700. Startup fails if protection or existing ledger integrity cannot be established. Keep the same HMAC key for an existing state directory; rotating the key requires a separate deliberate migration. Never clear a failed ledger.

## Walk the demo

1. Authenticate explicitly. Expand source evidence to inspect certificate quantity, receiving quantity and verified substitute stock. The current engine demo computes two impacted jobs and seventy units; independent planning fixtures have different semantics and are not runtime inputs.
2. Choose Wonder, Baseten Spark or Fireworks Spark and start the investigation. Watch the mode/model badge, turn and tool counts, validated source facts and read-only trace. Output comes from live Meta inference. The free-text narrative is unvalidated advisory text; exact source facts and deterministic calculations are displayed separately. A failed identity, malformed response, schema violation, deadline or outage remains visible. There is no automatic route or Sample switch.
3. Compare calculated wait, substitute and split paths. Inspect assumptions and constraints before choosing. The split option schedules work concurrently across compatible cells. The substitute path shares remaining capacity across material draws. Costs are illustrative.
4. Review a feasible option from a successful, source-validated investigation. Type the exact APPROVE phrase to confirm. The HMAC-sealed five-minute envelope binds the plan, snapshot, run and session actor. A nonce can succeed once. The ledger records acceptance without releasing stock or operating equipment.
5. Select a machine outage. Taking CELL-MILL-2 offline removes the split path and invalidates prior acceptance. Taking CELL-MILL-1 offline can eliminate every feasible option; that is a legitimate insufficient-capacity outcome. Reinvestigate the changed snapshot and deliberately review a remaining feasible option. Reset starts a fresh scenario identity and cannot revive earlier consent.
6. Verify the hash-chained, tamper-evident ledger and export the synthetic advisory JSON packet. The packet includes snapshots, runs, validated/rejected source claims, sanitized call evidence, decision transitions and HMAC head evidence. Raw provider response envelopes are replaced by digests; credentials and raw prompts are excluded.

Sample is a manually selected deterministic offline template and always carries SAMPLE - OFFLINE; NO LIVE AI. Sample results and exports are not live-model evidence. Switching the dropdown alone does not relabel an earlier result; the displayed badge describes the actual run.

## Verification commands

- `npm test --prefix hackathon`: domain, tool, model, consent, persistence, HTTP and security regressions.
- `npm test`: legacy root regression suite.
- `npm run smoke:investigation --prefix hackathon`: substantive same-snapshot runs on all three configured Meta routes; requires real provider keys and records actual usage when supplied. A run must use multiple tools and validated source facts to count as success.
- `npm run smoke:browser --prefix hackathon`: isolated offline full browser flow, screenshots, packet and console checks.
- `npm run smoke:browser:live --prefix hackathon`: the same full flow with live Wonder before and after the outage.
- `node --experimental-websocket tools/browser-smoke.mjs` with Node 20: full legacy acceptance including Prove-it and mission chain. Legacy UI footage is excluded from this app's contribution claim.

The dependency-free browser harness locates Chrome or Edge on Windows; CHROME_PATH can name an installed browser. It fails rather than skipping when no browser is available. Tests use disposable state and keys, not the running product's ledger. Browser smoke saves desktop/mobile evidence and checks for horizontal mobile overflow and console errors.

## Evidence and boundaries

evidence/investigation contains substantive route results; evidence/browser contains the full live browser packet and screenshots. Model identity is provider-reported metadata, not independent attestation. Missing usage remains null; no unreported cost is invented. Rejected live attempts remain separately labeled. Request/response digests support correlation without retaining secret-bearing raw exchanges.

All data is synthetic. New persisted events/anchors are AES-256-GCM encrypted; Advanced JSON/Markdown exports and integrity checkpoints remain plaintext; primary packet exports are passphrase-encrypted, and no production manufacturing or compliance certification is claimed. An attacker controlling the local process, HMAC key and all retained anchors can defeat local authenticity and rollback checks. Independently retained exported anchors matter. Sessions expire on restart. Unexpired pending reviews, accepted history and consumed nonces remain encrypted in the ledger. Reauthenticate as the original named identity to resume a pending review; its original five-minute deadline does not extend. No public deployment, filming, posting, source publication or submission is performed by these commands.


## Encrypted persistence and explicit migration

New workflow files use AES-256-GCM, random 96-bit nonces, purpose-bound AAD and a 256-bit HKDF-SHA256 key derived in a distinct domain from stable HACKATHON_LEDGER_KEY. Provision a high-entropy random key; a weak password permits offline guessing. No key is written by the app. Private ACL protection remains. Losing the key loses access; do not casually rotate it on an existing directory. Plaintext, wrong-key or damaged state fails closed. No automatic migration/reset.

For legacy migration, stop the original server, securely configure existing HACKATHON_STATE_DIR and matching HACKATHON_LEDGER_KEY, and set HACKATHON_MIGRATION_DESTINATION to a new nonexistent private directory. Run `npm run migrate:state --prefix hackathon`. It verifies every sequence/hash and HMAC before writing an encrypted copy only to the new private destination. Source is unchanged; an existing destination is refused. Then deliberately point HACKATHON_STATE_DIR to the new directory. Original plaintext files/backups remain plaintext and privately held; no encryption claim covers them retroactively. Partial failure leaves source intact; inspect rather than clear evidence.

## Independent checkpoint and readable export

Use Verify ledger, Export encrypted evidence packet with a separate passphrase, and Export independent checkpoint. Advanced plaintext JSON packet and Markdown report downloads require acknowledgement and remain PLAINTEXT. Retain the checkpoint in a separate trusted location before suspected rollback. A same-machine download alone does not prove independence. Check the explicit acknowledgement box before either advanced plaintext download; API callers must send acknowledgePlaintext equal to EXPORT PLAINTEXT. Checkpoints contain only integrity metadata. Protect all retained files. Markdown includes current assumptions/calculations, exact snapshot/sources, decision and model evidence.

Run `node hackathon/scripts/verify-checkpoint.mjs path/to/packet.json path/to/independent-checkpoint.json`. Exit zero means the event chain includes the pinned head as a valid prefix and passes sequence/hash/head/count checks (`PREFIX_INCLUDES_RETAINED_CHECKPOINT_HEAD`); nonzero means invalid/mismatched/truncated input. No HMAC secret is passed, so checkpoint.signature is not checked here. Authenticity depends on a previously independently retained checkpoint; substituting both files defeats that trust. The verifier does not attest arbitrary packet summary fields, recalculations, post-prefix tails as independently witnessed, or provider identity.

## Sessions and loading

Browser uses a ten-minute HttpOnly/SameSite=Strict cookie and in-memory CSRF token. CLI headers remain supported. Lock recovery room revokes the seat; expiry returns to login. Secure is added on direct TLS; this HTTP loopback demo has no trusted-proxy/remote deployment configuration. Asynchronous jobs are session-bound, retained in a bounded map and lost at restart. The UI polls within the same one-minute inference budget, displays configured route presence and actual returned identity, and does not auto-switch providers. Every option exposes assumptions. Guided progress and comparisons use real outcomes.


## Named operators and read-only judges

For persistent local operation, securely provision HACKATHON_OPERATORS_JSON as an env-only JSON array (maximum 32 objects). Each object has exactly id, role and token. IDs use letters/numbers/dot/underscore/hyphen (maximum 64); roles are operator or auditor; each token is a distinct opaque high-entropy value (minimum 12 characters, maximum 256; use randomly generated values). Do not paste this JSON or tokens into shell history, source, screenshots or reports. Duplicate IDs/tokens, unknown roles/fields or ambiguous identities fail startup. IDs cannot contain credential tokens.

Operators can investigate, review, confirm, revoke and apply synthetic shocks. Only admin can reset scenarios or start the guide, which resets the scenario. Only a named operator can revoke; admin cannot revoke. Shared investigate/review/confirm permissions do not constitute two-person approval. Auditors can inspect status/evidence, verify and export; privileged workflow, diagnostic inference and scenario reset are denied by the server with 403, independently of disabled UI controls. The authenticated identity/role is visible, and new consent/decision/model/shock events record the named operator. Session actor binding still prevents cross-session consent or job access, even between seats sharing a role.

HACKATHON_ADMIN_TOKEN remains a compatible local-admin seat. Named configuration does not create a public management endpoint; change/revoke credentials through secure env provisioning and restart (which invalidates sessions; encrypted reviews retain their original identity and expiry). The isolated demo ignores named production accounts and uses a new disposable directory and uses only its public synthetic admin credential. This is functional local identity/role separation, not enterprise SSO/MFA, a remote directory or production IAM certification.


## Interrupted append recovery

Keep the stable ledger key and all current event/anchor/intent files together. Startup may finish an encrypted pending intent forward after verifying the exact prior chain, intended event, ciphertext suffix and HMAC. It does not restore old anchors, use .bak files or clear damaged history. Completed-intent/current-anchor truncation, unknown tails, corrupted intent and wrong keys fail closed. Legacy files without an intent remain valid only when their original chain and anchor already match; an old pre-intent interrupted write cannot be automatically authenticated. Filesystem/hardware power-loss behavior is not independently certified.

Pending review resumption applies to persistent normal startup with the same private directory and stable key. Reauthenticate as the original named identity; the UI restores the unexpired envelope and requires the exact typed phrase. The disposable demo deliberately uses new state/key each launch and does not promise cross-launch history. Admin resets also invalidate decisions, so separated reset/revoke rights are task permissions rather than a claim that admin cannot override operator work. No two-person approval or enterprise IAM certification is claimed.

# Build run six: current controls and evidence

This run adds a global rolling failed-login audit budget: at most twelve login_failed records in any minute across all socket identities, recovered from verified ledger history across restart. The first eleven retain hashed client identity and INVALID_CREDENTIAL; the twelfth marks GLOBAL_AUDIT_CAP_REACHED and furtherAttemptsOmitted. The marker warns that subsequent attempts may be omitted; it does not claim an exact attack count. No login failure initializes a snapshot. Continued attacks can produce capped growth over time; this is not a finite lifetime retention policy.

Normal startup persists independent API 240/min, login 12/min and authenticated Meta/workflow 120/min counters in encrypted quota files before granting requests. Counters retain hashed direct socket identities, bounded map size and original window starts. Corruption/wrong key/configuration mismatch blocks startup; clock rollback conservatively extends active windows. Files use flush plus atomic replacement, with no backup rollback. An interrupted pre-rename request is not granted. Quota files are separate from the audit chain; privileged file deletion/replacement or multiple simultaneous processes sharing a directory is outside this single-process local guarantee. Sessions remain ephemeral; the isolated demo deliberately uses fresh state/key each launch. NAT clients share a socket-identity budget.

Encrypted evidence packet export is now the primary UI action, available to authenticated readers including auditors. A separate 16–160 character passphrase derives a key with scrypt N=16384, r=8, p=1; fresh salt and IV protect each AES-256-GCM packet. No export passphrase is stored in the ledger or quota files. The browser clears the field on export/lock/expiry. This HTTP interface is loopback-only; no remote transport-security claim is made. Advanced plaintext JSON/Markdown downloads retain the exact API acknowledgement and PLAINTEXT EXPORT banners. Integrity checkpoints remain plaintext metadata. Historical exports/backups remain outside encryption claims.

Use a strong unique export passphrase; minimum length does not prove entropy. Losing it loses access. Securely provision FFR_EXPORT_PASSPHRASE and run `node hackathon/scripts/decrypt-export.mjs input.encrypted.json new-private-output.json` to produce intentional plaintext for inspection/checkpoint verification. The decoder refuses an existing output; wrong password or modified ciphertext fails authentication. Keep passphrase, decrypted packet and independently retained checkpoint secure and separate.

Tests: tests/unit/run6-controls.test.mjs, tests/unit/run6-export.test.mjs, tests/integration/run6-export.test.mjs and tests/integration/run6-quota.test.mjs. Current counts, scans, process cleanup and browser evidence are recorded in the reproducible checks listed in the root README. Prior run evidence remains historical. Meta-only providers, fail-closed keys, explicit Sample, verified ledger recovery, durable consent and separated rights remain unchanged. No external account, eligibility, filming, publication or submission evidence is invented.


## Build run seven candidate controls

Run seven adds shared local export-passphrase feedback and API enforcement: 16–160 characters, at least eight distinct case-folded characters, and three distinct whitespace-separated words or three character types. Repeated/predictable prefixes are rejected. This heuristic does not prove entropy; use unique randomly selected words and keep the passphrase separately. Decryption retains the earlier length-only check so existing packets remain recoverable. Pinned scrypt and authenticated encryption remain unchanged.

Provider errors stop the investigation with recorded failure, no substitute narrative and no automatic retry. Select the route and press Investigate to start a deliberate new attempt. The UI labels the stopped live Meta investigation and preserves its trace. No provider switch or automatic Sample occurs. A fresh scenario clears consent, export acknowledgement/passphrase and guide state; reset records a new snapshot and opening decision state, preserved on verified restart. Earlier events remain retained.

Reproduce locally from the repository root with `npm run demo --prefix hackathon`; authenticate using the public synthetic rehearsal token printed by that command. Configure Meta keys only through environment variables. Start the guided scenario, inspect sources, run Spark Open and Wonder, review/type acceptance, simulate the second shock, investigate/accept again, verify and export. No model starts automatically. Stop with Ctrl+C. The clean-start integration test launches this entry with a fresh temporary directory and no stored configuration; it does not claim a separate clean-checkout trial.

Current-run evidence is under evidence/run7. Automated accessibility coverage is targeted: measured visible text contrast, visible form-control names, document language, no positive tabindex, keyboard skip link and responsive overflow. It is not a complete WCAG audit or physical-phone test. Source is published in this repository for hackathon judging.
