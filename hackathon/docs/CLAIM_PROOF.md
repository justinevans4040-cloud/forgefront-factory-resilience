# The Meta Hackathon build — product claim proof

Every headline follows a working path. Use this map to move from the pitch to executable proof.

| Pitch claim | Test or public proof |
| --- | --- |
| A disputed certificate affects two jobs and 70 units | [Runtime oracle](../tests/unit/runtime-oracle.test.mjs), [source scenario](../src/domain/scenario.mjs) |
| Three recovery options are calculated from current stock/capacity | [Engine tests](../tests/unit/engine.test.mjs), runtime oracle, [live desktop packet](../evidence/README.md) |
| Muse Spark Open investigates with read-only tools | [Investigation tests](../tests/unit/investigation.test.mjs), [live packet](../evidence/README.md) |
| Muse Wonder explains the same snapshot | [Guided live proof](../evidence/README.md), live packet |
| Exact structured source claims are checked | [Evidence tests](../tests/unit/evidence.test.mjs), investigation tests, accepted/rejected claims in packet |
| Only Meta models power live AI | [Model tests](../tests/unit/models.test.mjs), [route allowlist](../src/models/routes.mjs), [provider checks](../evidence/README.md) |
| Sample is explicit and offline | [Fail-closed integration](../tests/integration/security.test.mjs), [offline keyboard proof](../evidence/README.md) |
| A RED route stays visible and requires manual choice | [Selected-route HTTP tests](../tests/integration/run11-routes.test.mjs), [presentation tests](../tests/unit/run11-presentation.test.mjs), [controlled browser proof](../evidence/README.md) |
| Human acceptance is typed, sealed and single-use | [Workflow tests](../tests/unit/workflow.test.mjs), [persistent consent tests](../tests/unit/run5-persistence.test.mjs), live packet |
| The second shock invalidates the earlier decision | Runtime oracle, workflow tests, [mobile guided proof](../evidence/README.md) |
| Evidence is encrypted and tamper-evident | [Storage tests](../tests/unit/storage.test.mjs), [export tests](../tests/unit/run6-export.test.mjs), [security controls](../SECURITY_CONTROLS.md) |
| Interrupted ledger appends recover forward | [Persistence tests](../tests/unit/run5-persistence.test.mjs), [hardening tests](../tests/unit/audit-hardening.test.mjs) |
| Checkpoints support independent prefix verification | Storage tests and [retained checkpoint](../evidence/README.md) |
| Session/CSRF, roles, Host/Origin, quotas and secret redaction are enforced | [Security integration](../tests/integration/security.test.mjs), [operators](../tests/integration/operators.test.mjs), [control map](../SECURITY_CONTROLS.md) |
| Keyboard and mobile presentation work | [Offline keyboard proof](../evidence/README.md), [mobile screenshot](../evidence/README.md) |
| One command and zero runtime dependencies | [Package](../package.json), [cold start](../tests/integration/run7-cold-start.test.mjs), [isolated public tree](../evidence/README.md) |
| The public set is scrubbed and self-contained | [Judge check](../evidence/README.md), [public tree](../evidence/README.md) |
| The five showcase image bytes are preserved | [Integrity proof](../evidence/README.md) |

Manufacturing-context images show where the recovery workflow applies: aircraft production, mission-critical programs, connected assembly and independent suppliers. The images describe contexts; runtime proof comes from the recovery-room packets above.
