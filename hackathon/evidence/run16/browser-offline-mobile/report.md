# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 6a43f3baa55673a0903fdf690ed6b3596a58bbc12ca077568bb8f658bd7ce8f6
Decision: accepted
Named operator: local-admin
Review actor digest: e9bcbad27fe68f7cee61b467a23714ea78c6fbde493d771a52755b14be926d8c
Confirmation actor digest: e9bcbad27fe68f7cee61b467a23714ea78c6fbde493d771a52755b14be926d8c
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 86d24392-096e-4b24-95a8-fdd4fbf1aa8c
Ledger: hash-chained, tamper-evident
Verified head: 168e225c5078f495109f844d106d8f171a58723848a157f21f85d6154a5a70ea
Events: 18

## Deterministic options
wait_replenishment: feasible; finish 83 hours; incremental USD 0
Assumptions: Quantities use the current certificate, receiving and stock records.; Cell costs use the hourly rates in this snapshot.; Documented replenishment lead time 48 hours
Constraints: Held lot remains unavailable until replenishment posts
Sources: ev-cert-qty, ev-recv-qty
allocate_substitute: feasible; finish 35 hours; incremental USD 3115
Assumptions: Quantities use the current certificate, receiving and stock records.; Cell costs use the hourly rates in this snapshot.; Substitute allocation uses only verified available stock
Constraints: Held MAT lot remains on hold; No supplier messaging
Sources: ev-sub-stock, ev-recv-qty
split_capacity: infeasible; finish unavailable hours; incremental USD unavailable
Assumptions: Quantities use the current certificate, receiving and stock records.; Cell costs use the hourly rates in this snapshot.
Constraints: Offline cells excluded
Sources: ev-sub-stock

## Investigations
Run 019098ae-d151-4a89-8c24-08216bb74bd2; snapshot d1981a3dd6ed65ba944ad5a04dc39ae3f5232fb15372c8393350314c6d7418bf; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 86d24392-096e-4b24-95a8-fdd4fbf1aa8c; snapshot 6a43f3baa55673a0903fdf690ed6b3596a58bbc12ca077568bb8f658bd7ce8f6; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> d1981a3dd6ed65ba944ad5a04dc39ae3f5232fb15372c8393350314c6d7418bf
d1981a3dd6ed65ba944ad5a04dc39ae3f5232fb15372c8393350314c6d7418bf -> 6a43f3baa55673a0903fdf690ed6b3596a58bbc12ca077568bb8f658bd7ce8f6

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.