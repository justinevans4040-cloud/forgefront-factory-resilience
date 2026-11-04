# Claim-to-proof map

| Claim | Source or executable verification |
| --- | --- |
| Certificate 100, receiving 3, two jobs demanding 100 pieces | [Current scenario](../src/domain/scenario.mjs), [runtime oracle](../tests/unit/runtime-oracle.test.mjs) |
| Stock, compatible capacity, time and cost are computed | [Engine](../src/domain/engine.mjs), [engine tests](../tests/unit/engine.test.mjs) |
| Investigation uses bounded read-only tools and exact source claims | [Investigation tests](../tests/unit/investigation.test.mjs), [evidence tests](../tests/unit/evidence.test.mjs), [routes](../src/models/routes.mjs) |
| Human authorization binds the selected option and snapshot | [Workflow tests](../tests/unit/workflow.test.mjs), [security integration](../tests/integration/security.test.mjs) |
| Losing Cell Mill 2 invalidates old authority and exposes infeasibility | Runtime oracle, workflow and current browser smoke |
| Task proposals require separate human approval | [The Britt workflow](../tests/unit/britt-workflow.test.mjs), [API contract](API_CONTRACT.md) |
| Evidence is encrypted and tamper-evident | [Storage tests](../tests/unit/storage.test.mjs), [export tests](../tests/unit/run6-export.test.mjs), [security mapping](../SECURITY_CONTROLS.md) |
| Session/CSRF, roles, Host/Origin and quotas remain enforced | [Security integration](../tests/integration/security.test.mjs), [operator tests](../tests/integration/operators.test.mjs) |
| Public model budgets remain enabled | [Budget tests](../tests/unit/run23-public-budget.test.mjs), [public integration](../tests/integration/run23-public.test.mjs) |
| Current browser and public entry work | [Verification evidence](../evidence/README.md), [run guide](../RUN_GUIDE.md) |

The video demonstrates Spark Open on Baseten. Supported Wonder integration and standby Fireworks configuration are distinct from a successful current call. Historical captures, design scores, mocks and Sample do not establish new live-model success.

Synthetic data and advisory authorization are explicit boundaries. `operationalRelease` stays false; this repository does not prove real-plant safety, on-time delivery, end-to-end full-plant dispatch or SOC 2 certification.
