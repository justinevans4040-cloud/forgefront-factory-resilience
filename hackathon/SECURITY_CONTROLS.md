# The Meta Hackathon build — SOC 2-style control mapping

Concrete controls protect the recovery decision from open room through evidence export. This map ties every control theme to implementation and executable verification.

## Recovery work and sovereign-agent controls

| Control theme | Implementation | Verification |
| --- | --- | --- |
| Human approval | Britt proposals are bound to actor/session, snapshot, accepted decision and a five-minute expiry; approve/decline precedes task creation | Britt workflow tests |
| Task validation | Exact schema, allowlisted owners/evidence, finite due windows, cycle and dependency deadline rejection | Recovery board tests |
| Durable tasks | Create, move and shock re-plan events share the encrypted HMAC-anchored ledger and encrypted export | Britt workflow tamper/export tests |
| Scoped memory | Recovery context is encrypted in event storage and filtered by session, operator and scenario | Britt memory/scoping tests |
| Primary Meta routes | Britt uses Wonder or Baseten; explicit offline Sample remains separate | Board provider tests |
| Read-only review | Back and completed-step controls render retained states; task controls are disabled during review | Primary-guide browser regression |
| Meta design review | Local screenshots sent to allowlisted primary routes with bounded deadlines; output schema and public-text checks precede evidence writes | Design-director mocked tests |

## Command-center control continuity

| Control theme | Implementation | Verification |
| --- | --- | --- |
| Human authority | Stage transitions reveal results; the server still requires exact typed single-use consent on the current plan, actor and snapshot | Consent, replay, race and workflow suites; desktop/mobile guides |
| Observable model activity | Progress reports counts only after read-only tools return; exact source claims remain separately validated | command-center tests; investigation and owner-bound job tests |
| Deliberate offline use | Explicit Sample selects its own guide; its results never fulfill live-model gates | guide and command-center tests; keyboard walkthrough |
| Primary-route spending | Standard provider pre-flight omits the backup credential; browser verification excludes the backup route | provider policy regression; primary pre-flight and live packets |
| Accessible action results | Stage reveal precedes scroll/focus; highlighted results honor reduced motion | command-center tests and real keyboard smoke |
| Brand asset integrity | Official Forgefront Systems logo at `assets/brand/forgefront-systems-logo.png` (byte-identical source); web-optimized app mark and favicon; five showcase images preserved | official-logo unit test; image hash evidence; public asset routes |
| Official logo in public set | Canonical brand logo and app-served mark/favicon ship in the judge public file set | `public-set.mjs` includes `assets/brand/`; command-center logo tests |

## Independent audit nine

| Control theme | Implementation | Verification |
| --- | --- | --- |
| Demo opens without sign-in | `HACKATHON_DEMO_MODE=1` enables `POST /api/meta/demo-entry`; rehearse sets the flag and never prints a token; the browser auto-enters the recovery room | `tests/integration/run12-demo-entry.test.mjs`; browser smoke recovery-open check |
| Persistent mode keeps authentication | `npm start` leaves demo mode unset; `POST /api/meta/session` still requires Bearer admin or named operator tokens | Session/security suites; demo-entry returns 404 without the flag |
| Judge pitch stays sharp | Root and hackathon README, RUN_GUIDE and demo runbook open without token/login instructions, hedges or internal field names; manufacturing contexts sit after highlights; Fireworks stays out of the landing pitch | `tests/unit/run12-copy.test.mjs`; `tests/unit/run10-judge.test.mjs` |
| Fireworks optional backup | Provider pre-flight still reports Fireworks GREEN/RED; overall readiness follows Wonder and Baseten only | `tests/unit/run12-copy.test.mjs`; `scripts/provider-check.mjs` |
| Branding | Visible product and company spelling is Forgefront / Forgefront Systems | `tests/unit/run12-copy.test.mjs`; `public/index.html` |

## Independent audit ten

| Control theme | Implementation | Verification |
| --- | --- | --- |
| Official logo | Canonical `assets/brand/forgefront-systems-logo.png` matches owner source SHA256; header, opening story, favicon and README use it; theme uses black with emerald and silver surfaces | `tests/unit/command-center.test.mjs` official logo test |
| Demo without sign-in retained | Demo-entry and rehearse path unchanged; persistent mode still authenticates | Demo-entry and browser smoke suites |
| Path scrub includes newest evidence | Public tracked text under `evidence/run12` has no profile paths or file URLs; report artifacts stay relative | `tests/unit/run10-judge.test.mjs` path scrub |

## Build run eleven

| Control theme | Implementation | Verification |
| --- | --- | --- |
| Explicit live pre-flight | Session/CSRF/role/schema/quota guards protect provider-check; one selected allowlisted Meta route; eight-second timeout; nonce and returned identity required | tests/integration/run11-routes.test.mjs |
| Recorded health outcomes | Every check records a model-call event with actor, model, latency and accepted/rejected status; raw nonce responses and credentials stay out of the result | Route-check HTTP tests; current browser packet |
| Honest presenter status | GREEN/RED/UNCHECKED, fifteen-minute expiry, failure reason, recently GREEN alternatives; user selects the next route | tests/unit/run11-presentation.test.mjs; controlled route-failure browser proof |
| Clear human decision | Confident acceptance UI retains exact typed consent, replay/stale/expiry enforcement and second-shock invalidation | Workflow/consent suites; live desktop/mobile guide |
| Public proof integrity | Newest numbered run, relative evidence paths, preserved showcase bytes, public text and link checks | Judge/public-tree checks and showcase integrity |

## Enforced controls

| Control theme | Implementation | Test / evidence | Operating requirement |
|---|---|---|---|
| Secrets from environment only | Keys read from `process.env` / injected `env` in `server.mjs`, `meta-handler.mjs`, model clients, smoke scripts. `.env.example` lists names only; no dotenv auto-load (`RUN_GUIDE.md`). Minimum length 12 for ledger key and admin token. | `tests/unit/smoke.test.mjs`; `tests/unit/audit-hardening.test.mjs`; gitleaks before commits | Process env and memory remain readable to a privileged local attacker; length floor is a minimum, not an entropy proof |
| No secret logging / export | `src/security/redact.mjs` removes raw and JSON-escaped secret forms from packets, investigation records and diagnostic responses | `audit-hardening.test.mjs`; investigation/unit redaction tests; browser/investigation evidence packets | Digests are correlators; operator screenshots can still leak tokens if pasted |
| Authentication | `POST /api/meta/session` requires Bearer matching env-provisioned admin or named operator/auditor tokens (timing-safe). Demo mode uses server-gated `demo-entry`. HTML grants no seat | `security.test.mjs`, `meta.test.mjs`, `operators.test.mjs`, `server.test.mjs`, `run12-demo-entry.test.mjs` | Compatible local admin token; no enterprise SSO/MFA |
| Session + CSRF | Random session and CSRF; HttpOnly/SameSite=Strict cookie; logout clears cookie and revokes seat; CLI headers remain | `session-lifecycle.test.mjs`; browser smoke lock check | Sessions are in-memory only; restart drops seats |
| Access control / least privilege | Static allowlist; private state ACL; read-only tools; auditor role denied privileged workflow and diagnostic inference; admin-only reset; named-operator-only revoke (`meta-handler.mjs`) | `operators.test.mjs`, `run5-controls.test.mjs`, `ui.test.mjs`, `private-directory.test.mjs`, `tools.test.mjs` | Admin alone resets scenarios; named operators alone revoke acceptance. Both may investigate/review/confirm |
| Host / Origin allowlist | `request.mjs` Host allowlist; Origin must match request Host including port | `request-guards.test.mjs`, `security.test.mjs`, `server.test.mjs` | Default allowlist is loopback only; misconfigured `allowedHosts` widens exposure |
| Input validation | JSON content-type, body size cap, null-prototype workflow route map, unknown `/api/meta/*` returns 404 (no provider call), provider allowlist, prompt length on diagnostic route, export acknowledgement field | `audit-hardening.test.mjs`, `workflow-schema.test.mjs`, `run5-controls.test.mjs`, security/server/tools/models tests | Focused route maps, not a universal schema language |
| Rate limiting | Per-socket-client API window (240/min in `server.mjs`), authenticated meta/workflow window (120/min after session in `meta-handler.mjs`) and login-attempt window (12/min) with `429` + `Retry-After`. Forwarded headers ignored. | `security.test.mjs`, `run5-rate.test.mjs`, `run5-controls.test.mjs`, `run6-controls.test.mjs`, `run6-quota.test.mjs` | Encrypted quota files retain counters on normal restart; direct socket clients behind NAT share a budget. Global login_failed ledger budget is twelve/minute, including a suppression marker |
| Error handling without internal leak | `sendError` maps known `ERROR_CODES` / intentional `status`; unexpected errors return generic `INTERNAL` / `request failed` | `tests/unit/errors.test.mjs` | Intentional public messages may name missing env var *names* (never values) |
| Audit trail integrity | Hash-chained events + HMAC head anchor; AES-256-GCM event/anchor/intent files; no swappable prior-anchor `.bak`; verified forward-only crash recovery; verify on read/mutate, periodically, and on demand; fail closed; never reset | `workflow.test.mjs`, `storage.test.mjs`, `audit-hardening.test.mjs`, `run5-persistence.test.mjs` | Privileged attacker with key + all anchors can forge; historical plaintext copies remain plaintext |
| Consent gate | HMAC-sealed five-minute envelope; typed `APPROVE <optionId>`; actor/session/snapshot/plan binding; single-use nonce; shock invalidation; cross-session confirm denied during a process lifetime; recovered reviews require original named identity | `run5-persistence.test.mjs`, `run5-controls.test.mjs`, workflow unit/integration tests; `operators.test.mjs` | Encrypted ledger replay restores unexpired pending envelopes to the same named identity after reauthentication |
| Encryption at rest (pending consent + ledger) | AES-256-GCM purpose-bound codec for events, anchors and write-ahead intent; pending consents are ledger events, not a separate plaintext store | `run5-persistence.test.mjs`, `storage.test.mjs` | Key is process env HMAC/ledger key material. Disposable demo launches fresh state each time |
| Encryption at rest (quotas) | Independent encrypted quota snapshots (`quota-api|login|meta.json`) via the same state codec purpose `client-quota`; flush + atomic rename before grant; hashed socket identities only | `run6-controls.test.mjs`, `run6-quota.test.mjs` | Single-process local files; privileged delete/replace or multi-process share changes the trust boundary; clock rollback extends windows |
| Encrypted packet export | Primary UI/API path `encrypted-export`; scrypt N=16384/r=8/p=1 (explicit options) + AES-256-GCM with fresh salt/IV/AAD; offline decoder refuses existing destinations and never echoes passphrases | `export-codec.mjs`, `decrypt-export.mjs`, `run6-export.test.mjs` (unit+integration), browser smoke | Passphrase entropy/custody is operator-owned; HTTP is loopback-only; decoder intentionally emits plaintext; lost passphrase loses access |
| Export passphrase strength (UI+API) | Shared `public/passphrase.mjs` heuristic enforced by UI feedback and `encryptPacket` before scrypt; 16–160 chars, >=8 distinct case-folded chars, three words or three character classes; predictable prefixes rejected | `run7-readiness.test.mjs`, `run6-export` integration weak-phrase 400s, browser smoke live feedback | Use a unique high-entropy passphrase; decryption stays length-only for existing packets (`audit5-hardening.test.mjs`) |
| Explicit provider retry only | Investigation wrapper records each failed call once; no automatic HTTP retry/Sample substitution; AbortError labeled `MODEL_TIMEOUT`; UI requires a new Investigate | `investigation.mjs`, `investigation.test.mjs`, `adversarial-acceptance.test.mjs`, controlled browser `--timeout-check` | Provider identity remains self-reported; operator must choose the next route deliberately |
| Demo reset opening state | `reset:true` on `snapshot_changed` restores `decision.status='none'` (shock still invalidates); UI clears consent/guide/export/ack fields; history retained | `workflow.mjs`, `run7-readiness.test.mjs`, browser smoke reset check | Admin-only reset remains a task permission; disposable demo still starts fresh each launch |
| Job failure labeling | Async investigation rejection retains concrete `error.message` (for example `STALE_INVESTIGATION`) rather than a generic opaque label; UI appends explicit retry copy | `workflow.mjs`, `audit5-hardening.test.mjs`, `public/app.mjs` | Unexpected throws without a message still fall back to `INVESTIGATION_FAILED_OR_STALE` |
| Independent checkpoint | Secret-free prefix verifier returns `PREFIX_INCLUDES_RETAINED_CHECKPOINT_HEAD`; optional HMAC signature exported but not checked without the key | `packet.mjs`, `verify-checkpoint.mjs`, `storage.test.mjs`, `audit-hardening.test.mjs` | Same-host download is not independent retention; substituting packet and checkpoint defeats trust; post-prefix tails are not independently witnessed |
| Plaintext export gate | Advanced/collapsed UI acknowledgement; API requires `acknowledgePlaintext: EXPORT PLAINTEXT` for packet/report; packet label and readable report open with `PLAINTEXT EXPORT` | `run5-controls.test.mjs`, `audit3-hardening.test.mjs`, `run6-export.test.mjs`, browser smoke | Checkpoints are integrity metadata only; trusted in-process script helpers still export plaintext by design; historical copies remain plaintext |
| Meta-only product AI | Allowlisted Wonder + Spark Open Baseten routes; Fireworks retained as optional backup; explicit Sample client only; missing live keys fail closed (no Sample substitute) | `models.test.mjs`, `model-identity.test.mjs`, `security.test.mjs`, `routes.mjs`, `audit-hardening.test.mjs`, `run12-copy.test.mjs` | Provider identity is self-reported metadata |
| Dependency risk | Zero npm runtime dependencies in the Meta Hackathon build | `package.json` inspection; no dependency installation required | Transitive OS/toolchain risk remains; browser binary used only by smoke tooling |
| CSP / XSS posture | Strict CSP `script-src 'self'`; UI uses `textContent` for untrusted model/source text | `ui.test.mjs`, public app code | CSP does not stop malicious same-origin JS if static assets were replaced |


## Operator custody

Keep stable ledger keys and retained checkpoints under separate trusted custody. Independently retained checkpoints supply rollback evidence. Private process/key/all-anchor control defines the local trust boundary. Persistent quotas use one process and direct socket identity; shared NAT clients share a budget. Use high-entropy env secrets and a unique separate export passphrase. Historical plaintext copies and explicitly decoded exports require private storage.

The cryptographic controls use AES-256-GCM, HKDF-SHA256, HMAC and pinned scrypt parameters. New encrypted state does not transform older plaintext artifacts. Account permissions, external provider internals and media/submission actions are verified by the owner. [Current proof](evidence/README.md) · [Security model](docs/SECURITY_MODEL.md) · [API contract](docs/API_CONTRACT.md).
