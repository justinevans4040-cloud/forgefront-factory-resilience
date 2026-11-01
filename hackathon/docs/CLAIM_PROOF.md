# The Meta Hackathon build — product claim proof

Every headline follows a working path. Use this map to move from the pitch to executable proof.

| Pitch claim | Test or public proof |
| --- | --- |
| A disputed certificate affects two jobs and 70 units | [Runtime oracle](../tests/unit/runtime-oracle.test.mjs), [source scenario](../src/domain/scenario.mjs) |
| Three recovery options are calculated from current stock/capacity | [Engine tests](../tests/unit/engine.test.mjs), runtime oracle, [live desktop packet](../evidence/run11/browser/packet.json) |
| Muse Spark Open investigates with read-only tools | [Investigation tests](../tests/unit/investigation.test.mjs), [live packet](../evidence/run11/browser/packet.json) |
| Muse Wonder explains the same snapshot | [Guided live proof](../evidence/run11/browser/summary.json), live packet |
| Exact structured source claims are checked | [Evidence tests](../tests/unit/evidence.test.mjs), investigation tests, accepted/rejected claims in packet |
| Only Meta models power live AI | [Model tests](../tests/unit/models.test.mjs), [route allowlist](../src/models/routes.mjs), [provider checks](../evidence/run11/providers.json) |
| Sample is explicit and offline | [Fail-closed integration](../tests/integration/security.test.mjs), [offline keyboard proof](../evidence/run11/browser-offline/summary.json) |
| A RED route stays visible and requires manual choice | [Selected-route HTTP tests](../tests/integration/run11-routes.test.mjs), [presentation tests](../tests/unit/run11-presentation.test.mjs), [controlled browser proof](../evidence/run11/browser-red/summary.json) |
| Human acceptance is typed, sealed and single-use | [Workflow tests](../tests/unit/workflow.test.mjs), [persistent consent tests](../tests/unit/run5-persistence.test.mjs), live packet |
| The second shock invalidates the earlier decision | Runtime oracle, workflow tests, [mobile guided proof](../evidence/run11/browser-mobile/summary.json) |
| Evidence is encrypted and tamper-evident | [Storage tests](../tests/unit/storage.test.mjs), [export tests](../tests/unit/run6-export.test.mjs), [security controls](../SECURITY_CONTROLS.md) |
| Interrupted ledger appends recover forward | [Persistence tests](../tests/unit/run5-persistence.test.mjs), [hardening tests](../tests/unit/audit-hardening.test.mjs) |
| Checkpoints support independent prefix verification | Storage tests and [retained checkpoint](../evidence/run11/browser/checkpoint.json) |
| Session/CSRF, roles, Host/Origin, quotas and secret redaction are enforced | [Security integration](../tests/integration/security.test.mjs), [operators](../tests/integration/operators.test.mjs), [control map](../SECURITY_CONTROLS.md) |
| Keyboard and mobile presentation work | [Offline keyboard proof](../evidence/run11/browser-offline/summary.json), [mobile screenshot](../evidence/run11/browser-mobile/mobile.png) |
| One command and zero runtime dependencies | [Package](../package.json), [cold start](../tests/integration/run7-cold-start.test.mjs), [isolated public tree](../evidence/run11/public-tree.txt) |
| The public set is scrubbed and self-contained | [Judge check](../evidence/run11/judge-check.txt), [public tree](../evidence/run11/public-tree.txt) |
| The five showcase image bytes are preserved | [Integrity proof](../evidence/run11/showcase-integrity.json) |

Manufacturing-context images show where the recovery workflow applies: aircraft production, mission-critical programs, connected assembly and independent suppliers. The images describe contexts; runtime proof comes from the recovery-room packets above.
