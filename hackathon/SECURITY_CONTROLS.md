# Security controls map (Meta Hackathon build)

This document maps SOC 2-style control themes to concrete code and tests in `hackathon/`.
It does **not** claim SOC 2 certification, Type I/II attestation, production hardening, or
compliance for real manufacturing systems. Scope is a synthetic local demo with advisory-only
Meta model output (`operationalRelease` always false).

| Control theme | Implementation | Test / evidence | Honest gap |
|---|---|---|---|
| Secrets from environment only | Keys read from `process.env` / injected `env` in `server.mjs`, `meta-handler.mjs`, model clients, smoke scripts. `.env.example` lists names only; no dotenv auto-load (`RUN_GUIDE.md`). Minimum length 12 for ledger key and admin token. | `tests/unit/smoke.test.mjs`; `tests/unit/audit-hardening.test.mjs`; gitleaks before commits | Process env and memory remain readable to a privileged local attacker; length floor is not entropy proof |
| No secret logging / export | `src/security/redact.mjs` removes raw and JSON-escaped secret forms from packets, investigation records and diagnostic responses | `audit-hardening.test.mjs`; investigation/unit redaction tests; browser/investigation evidence packets | Digests are correlators, not confidentiality controls; operator screenshots can still leak tokens if pasted |
| Authentication | `POST /api/meta/session` requires Bearer matching env-provisioned admin or named operator/auditor tokens (timing-safe). HTML grants no seat | `security.test.mjs`, `meta.test.mjs`, `operators.test.mjs`, `server.test.mjs` | Compatible local admin token; no enterprise SSO/MFA |
| Session + CSRF | Random session and CSRF; HttpOnly/SameSite=Strict cookie; logout clears cookie and revokes seat; CLI headers remain | `session-lifecycle.test.mjs`; browser smoke lock check | Sessions are in-memory only; restart drops seats (intentional) |
| Access control / least privilege | Static allowlist; private state ACL; read-only tools; auditor role denied privileged workflow and diagnostic inference; admin-only reset; named-operator-only revoke (`meta-handler.mjs`) | `operators.test.mjs`, `run5-controls.test.mjs`, `ui.test.mjs`, `private-directory.test.mjs`, `tools.test.mjs` | Admin alone resets scenarios; named operators alone revoke acceptance. Both may investigate/review/confirm; no two-person approval claim |
| Host / Origin allowlist | `request.mjs` Host allowlist; Origin must match request Host including port | `request-guards.test.mjs`, `security.test.mjs`, `server.test.mjs` | Default allowlist is loopback only; misconfigured `allowedHosts` widens exposure |
| Input validation | JSON content-type, body size cap, null-prototype workflow route map, unknown `/api/meta/*` returns 404 (no provider call), provider allowlist, prompt length on diagnostic route, export acknowledgement field | `audit-hardening.test.mjs`, `workflow-schema.test.mjs`, `run5-controls.test.mjs`, security/server/tools/models tests | Not a full schema validator for every workflow field |
| Rate limiting | Per-socket-client API window (240/min in `server.mjs`), authenticated meta/workflow window (120/min after session in `meta-handler.mjs`) and login-attempt window (12/min) with `429` + `Retry-After`. Forwarded headers ignored. | `security.test.mjs`, `run5-rate.test.mjs`, `run5-controls.test.mjs`, `run6-controls.test.mjs`, `run6-quota.test.mjs` | Encrypted quota files retain counters on normal restart; direct socket clients behind NAT share a budget. Global login_failed ledger budget is twelve/minute, including a suppression marker; privileged quota-file rollback/deletion is outside this single-process guarantee |
| Error handling without internal leak | `sendError` maps known `ERROR_CODES` / intentional `status`; unexpected errors return generic `INTERNAL` / `request failed` | `tests/unit/errors.test.mjs` | Intentional public messages may still name missing env var *names* (never values) |
| Audit trail integrity | Hash-chained events + HMAC head anchor; AES-256-GCM event/anchor/intent files; no swappable prior-anchor `.bak`; verified forward-only crash recovery; verify on read/mutate, periodically, and on demand; fail closed; never reset | `workflow.test.mjs`, `storage.test.mjs`, `audit-hardening.test.mjs`, `run5-persistence.test.mjs` | Privileged attacker with key + all anchors can forge; historical plaintext copies remain plaintext; storage hardware/OS power-loss guarantees are external |
| Consent / advisory gate | HMAC-sealed five-minute envelope; typed `APPROVE <optionId>`; actor/session/snapshot/plan binding; single-use nonce; shock invalidation; cross-session confirm denied during a process lifetime; recovered reviews require original named identity | `run5-persistence.test.mjs`, `run5-controls.test.mjs`, workflow unit/integration tests; `operators.test.mjs` | Encrypted ledger replay restores unexpired pending envelopes to the same named identity after reauthentication; no HSM |
| Encryption at rest (pending consent + ledger) | AES-256-GCM purpose-bound codec for events, anchors and write-ahead intent; pending consents are ledger events, not a separate plaintext store | `run5-persistence.test.mjs`, `storage.test.mjs` | Key is process env HMAC/ledger key material; no KMS/HSM. Disposable demo launches fresh state each time |
| Encryption at rest (quotas) | Independent encrypted quota snapshots (`quota-api|login|meta.json`) via the same state codec purpose `client-quota`; flush + atomic rename before grant; hashed socket identities only | `run6-controls.test.mjs`, `run6-quota.test.mjs` | Single-process local files; privileged delete/replace or multi-process share is outside the guarantee; clock rollback extends windows |
| Encrypted packet export | Primary UI/API path `encrypted-export`; scrypt N=16384/r=8/p=1 (explicit options) + AES-256-GCM with fresh salt/IV/AAD; offline decoder refuses existing destinations and never echoes passphrases | `export-codec.mjs`, `decrypt-export.mjs`, `run6-export.test.mjs` (unit+integration), browser smoke | Passphrase entropy/custody is operator-owned; HTTP is loopback-only; decoder intentionally emits plaintext; lost passphrase loses access |
| Export passphrase strength (UI+API) | Shared `public/passphrase.mjs` heuristic enforced by UI feedback and `encryptPacket` before scrypt; 16–160 chars, >=8 distinct case-folded chars, three words or three character classes; predictable prefixes rejected | `run7-readiness.test.mjs`, `run6-export` integration weak-phrase 400s, browser smoke live feedback | Heuristic only — not entropy certification or zxcvbn; decryption stays length-only for existing packets (`audit5-hardening.test.mjs`) |
| Explicit provider retry only | Investigation wrapper records each failed call once; no automatic HTTP retry/Sample substitution; AbortError labeled `MODEL_TIMEOUT`; UI requires a new Investigate | `investigation.mjs`, `investigation.test.mjs`, `adversarial-acceptance.test.mjs`, controlled browser `--timeout-check` | Provider identity remains self-reported; operator must choose the next route deliberately |
| Demo reset opening state | `reset:true` on `snapshot_changed` restores `decision.status='none'` (shock still invalidates); UI clears consent/guide/export/ack fields; history retained | `workflow.mjs`, `run7-readiness.test.mjs`, browser smoke reset check | Admin-only reset remains a task permission, not two-person control; disposable demo still starts fresh each launch |
| Job failure labeling | Async investigation rejection retains concrete `error.message` (for example `STALE_INVESTIGATION`) rather than a generic opaque label; UI appends explicit retry copy | `workflow.mjs`, `audit5-hardening.test.mjs`, `public/app.mjs` | Unexpected throws without a message still fall back to `INVESTIGATION_FAILED_OR_STALE` |
| Independent checkpoint | Secret-free prefix verifier returns `PREFIX_INCLUDES_RETAINED_CHECKPOINT_HEAD`; optional HMAC signature exported but not checked without the key | `packet.mjs`, `verify-checkpoint.mjs`, `storage.test.mjs`, `audit-hardening.test.mjs` | Same-host download is not independent retention; substituting packet and checkpoint defeats trust; post-prefix tails are not independently witnessed |
| Plaintext export gate | Advanced/collapsed UI acknowledgement; API requires `acknowledgePlaintext: EXPORT PLAINTEXT` for packet/report; packet label and readable report open with `PLAINTEXT EXPORT` | `run5-controls.test.mjs`, `audit3-hardening.test.mjs`, `run6-export.test.mjs`, browser smoke | Checkpoints are integrity metadata only; trusted in-process script helpers still export plaintext by design; historical copies remain plaintext |
| Meta-only product AI | Allowlisted Wonder + Spark Open Baseten/Fireworks routes; explicit Sample client only; missing live keys fail closed (no Sample substitute) | `models.test.mjs`, `model-identity.test.mjs`, `security.test.mjs`, `routes.mjs`, `audit-hardening.test.mjs` | Provider identity is self-reported metadata, not independent attestation |
| Dependency risk | Zero npm runtime dependencies in hackathon and root `package.json` | `package.json` inspection; root `npm audit` reports 0 vulnerabilities; hackathon has no lockfile because the dependency graph is empty | Transitive OS/toolchain risk remains; browser binary used only by smoke tooling |
| CSP / XSS posture | Strict CSP `script-src 'self'`; UI uses `textContent` for untrusted model/source text | `ui.test.mjs`, public app code | CSP does not stop malicious same-origin JS if static assets were replaced |

## Residual non-claims

- No SOC 2, ISO, FedRAMP, or manufacturing-safety certification.
- No production multi-tenant isolation, external secrets manager, enterprise SSO/MFA or SIEM integration.
- Synthetic scenarios and illustrative costs only.
- Rollback detection still requires independently retained exported anchors.


## Build run four controls

- AES-256-GCM event/anchor codec: random per-record nonce, purpose-bound AAD and HKDF-SHA256 domain separation from HMAC. Wrong keys, altered tags and purpose swaps fail; restart preserves state. Requires high-entropy stable env key; no KMS or password-hardening claim.
- Explicit migration validates legacy sequence/hash/HMAC before writing a new private sibling destination (nested paths refused). Source digest is measured after write. No source overwrite/deletion, automatic reset or retroactive encryption of old backups.
- Separate checkpoint and secret-free prefix-chain verifier check sequence/hash/head/count against independently retained evidence. Trust string is prefix-honest. Replacing both files defeats trust. Exports are plaintext; local download alone is not independent retention.
- HttpOnly/SameSite=Strict browser cookie, CSRF and logout; direct TLS adds Secure. CLI header support remains. Named local operator/auditor roles are enforced; no enterprise directory/MFA/proxy deployment claim.
- Session-bound async jobs retain at most 32 handles and preserve active lock. Restart drops sessions/jobs; pending review and accepted/consumed nonce history persist encrypted. Reauthentication as the original named identity is required.

## Cursor audit two hardening

- Removed unused prior-anchor `.bak` copies that enabled truncate-and-restore rollback.
- JSON-escape-aware redaction; weak ledger/admin secrets rejected at create time.
- Unknown meta routes no longer invoke providers; prototype workflow paths return 404.
- Tests: `tests/unit/audit-hardening.test.mjs` plus expanded `operators.test.mjs`.

Secret-scan adjudication: the legacy empty root env template causes two multiline variable-name false positives in the extra working-tree scan. gitleaks.toml extends default rules with an exact path AND literal-variable-name match; synthetic nonempty credentials remain detected in three regression cases. Required history scan and product scan use default rules. See evidence/run4/SECRET_SCAN_NOTES.md. No broad detector or file exclusion is used.

Named identity tests: integration/operators.test.mjs proves separate seats, named decision attribution, auditor-denied mutations and diagnostic inference, auditor-allowed checkpoint/report/verify, cross-session confirm denial, usable read/export permissions and fail-closed invalid/duplicate config. Browser smoke verifies visible named auditor identity and read-only controls. Operator secrets are included in centralized redaction and remain env-only. No self-asserted identity or privilege is accepted from workflow request bodies.


## Build run five controls

Encrypted write-ahead intent is flushed before event append, followed by flushed event and atomic anchor replacement, then a committed intent head. Startup validates prior prefix, exact ciphertext tail, event sequence/hash and HMAC before forward completion. It never rolls back an anchor, accepts an unknown suffix or repairs a truncated committed log. Completed intent also rejects restoring an older log/anchor pair. No old-anchor .bak is written. Tests terminate real child processes at intent/event/anchor boundaries and cover partial append, corruption and rollback.

Unexpired consent envelopes replay from AES-GCM events. After restart, sessions must reauthenticate and only the original named identity/role may resume; original plan/snapshot/run/signature and five-minute expiry still apply. Same-process cross-session access and consumed-nonce replay remain denied. Status filters pending envelopes to authorized owners. Job handles remain ephemeral.

Direct socket identity quotas isolate clients; forwarded headers cannot rotate identity. Per-client windows are API 240/min (all `/api/*` in `server.mjs`), authenticated meta/workflow 120/min (after session validation), and login attempts 12/min, all returning 429 plus Retry-After. Bounded maps expire idle entries. Failed credentials append `login_failed` with client digest and fixed reason only. Requests rejected by a quota or Host/Origin guard do not append attacker-supplied credentials/events.

Only admin resets a scenario; only a named operator revokes advisory acceptance. Auditors remain read-only. Shared investigation/review/confirmation permissions are intentional; no two-person approval claim. Plaintext packet/report downloads require an unchecked-by-default acknowledgement box and exact API acknowledgePlaintext value EXPORT PLAINTEXT. Checkpoints contain integrity metadata rather than the decision history. Trusted in-process export helpers used by local evidence scripts remain explicit plaintext exports.

Resumed confirmation records its new session digest separately from the original sealed review actor, plus resumedAfterRestart. Readable reports expose both without rewriting historical attribution. Admin resets can invalidate decisions, so separate reset/revoke rights are task permissions, not an anti-admin or two-person-control guarantee.

## Cursor audit three hardening

- Failed-login ledger events no longer bootstrap `snapshot_initialized`; unauthenticated callers cannot seed scenario state (`workflow.mjs`, `audit3-hardening.test.mjs`, `run5-controls.test.mjs`).
- Authenticated-route 120/min quota applies only after session validation on `/api/meta/*` and `/api/workflow/*`; legacy `/api/scenario` and peers keep the server 240/min ceiling (`meta-handler.mjs`, `run5-rate.test.mjs`).
- Readable reports open with an explicit `PLAINTEXT EXPORT` banner matching the packet label (`packet.mjs`, `audit3-hardening.test.mjs`).
- Control-map evidence rows now cite the run-five and audit-three tests that prove each control.

# Build run six: current controls and evidence

This run adds a global rolling failed-login audit budget: at most twelve login_failed records in any minute across all socket identities, recovered from verified ledger history across restart. The first eleven retain hashed client identity and INVALID_CREDENTIAL; the twelfth marks GLOBAL_AUDIT_CAP_REACHED and furtherAttemptsOmitted. The marker warns that subsequent attempts may be omitted; it does not claim an exact attack count. No login failure initializes a snapshot. Continued attacks can produce capped growth over time; this is not a finite lifetime retention policy.

Normal startup persists independent API 240/min, login 12/min and authenticated Meta/workflow 120/min counters in encrypted quota files before granting requests. Counters retain hashed direct socket identities, bounded map size and original window starts. Corruption/wrong key/configuration mismatch blocks startup; clock rollback conservatively extends active windows. Files use flush plus atomic replacement, with no backup rollback. An interrupted pre-rename request is not granted. Quota files are separate from the audit chain; privileged file deletion/replacement or multiple simultaneous processes sharing a directory is outside this single-process local guarantee. Sessions remain ephemeral; the isolated demo deliberately uses fresh state/key each launch. NAT clients share a socket-identity budget.

Encrypted evidence packet export is now the primary UI action, available to authenticated readers including auditors. A separate 16–160 character passphrase derives a key with scrypt N=16384, r=8, p=1; fresh salt and IV protect each AES-256-GCM packet. No export passphrase is stored in the ledger or quota files. The browser clears the field on export/lock/expiry. This HTTP interface is loopback-only; no remote transport-security claim is made. Advanced plaintext JSON/Markdown downloads retain the exact API acknowledgement and PLAINTEXT EXPORT banners. Integrity checkpoints remain plaintext metadata. Historical exports/backups remain outside encryption claims.

Use a strong unique export passphrase; minimum length does not prove entropy. Losing it loses access. Securely provision FFR_EXPORT_PASSPHRASE and run `node hackathon/scripts/decrypt-export.mjs input.encrypted.json new-private-output.json` to produce intentional plaintext for inspection/checkpoint verification. The decoder refuses an existing output; wrong password or modified ciphertext fails authentication. Keep passphrase, decrypted packet and independently retained checkpoint secure and separate.

Tests: tests/unit/run6-controls.test.mjs, tests/unit/run6-export.test.mjs, tests/integration/run6-export.test.mjs and tests/integration/run6-quota.test.mjs. Cursor audit four pinned explicit scrypt options, added clock-rollback / persist-failure / corrupt-quota startup coverage, clarified the advanced plaintext wording, and extended this control map. Current counts, scans, process cleanup and browser evidence are recorded in the reproducible checks listed in the root README. Prior run evidence remains historical. Meta-only providers, fail-closed keys, explicit Sample, verified ledger recovery, durable consent and separated rights remain unchanged. No SOC 2 certification. No external account, eligibility, filming, publication or submission evidence is invented.


## Build run seven / Cursor audit five controls

Run seven (Codex) added shared UI/API export-passphrase strength feedback, removed automatic investigation retries, restored opening decision state on reset while retaining verified history, cold-start rehearsal coverage, and targeted accessibility/browser checks. Cursor audit five verified those claims against code and evidence, then hardened:

- Control-map rows above now cite `passphrase.mjs` / `export-codec.mjs`, investigation no-retry tests, reset/readiness tests, and concrete async job failure labels.
- Decrypt remains length-only so packets created under the earlier length gate stay recoverable; new encryption rejects weak phrases server-side (`audit5-hardening.test.mjs`).
- Failed async jobs expose `STALE_INVESTIGATION` (and similar) instead of only `INVESTIGATION_FAILED_OR_STALE`; the UI always appends explicit retry copy.
- `API_CONTRACT.md` and `EVAL_SPEC.md` no longer describe length-only export rejection or automatic transient retry as current behavior.
- Historical run-four “single transient retry” wording in `HACKATHON_CONTRIBUTIONS.md` is marked superseded by run seven.

Evidence: `tests/unit/run7-readiness.test.mjs`, `tests/integration/run7-cold-start.test.mjs`, `tests/unit/audit5-hardening.test.mjs`, `evidence/run7/`. Targeted accessibility coverage is not a WCAG certification. No SOC 2 certification. Physical-phone filming, eligibility, form submission and public release remain owner actions.
