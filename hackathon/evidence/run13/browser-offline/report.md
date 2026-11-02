# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: caeb386cf227d2395dbc4efba7a1469101be01f884f98898d210b098047d25da
Decision: accepted
Named operator: local-admin
Review actor digest: b007464e7d2262606542b0641bcf4799ff5c21cc93e5167320fd3427a44c780e
Confirmation actor digest: b007464e7d2262606542b0641bcf4799ff5c21cc93e5167320fd3427a44c780e
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 5a7ecee4-8081-4fe3-8457-b3ab400b9122
Ledger: hash-chained, tamper-evident
Verified head: ec3e698dec1ce854cb317f71038e158a4e8890cd1c0df94f23e27d02dfdd1792
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
Run 6b97025f-3aed-40fe-bc2f-12562894fd1e; snapshot 9f97233e17f0cc8fb5035e6a63b7c61d9e49cac898f7ff71ebb44af1a5ac2739; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 5a7ecee4-8081-4fe3-8457-b3ab400b9122; snapshot caeb386cf227d2395dbc4efba7a1469101be01f884f98898d210b098047d25da; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 9f97233e17f0cc8fb5035e6a63b7c61d9e49cac898f7ff71ebb44af1a5ac2739
9f97233e17f0cc8fb5035e6a63b7c61d9e49cac898f7ff71ebb44af1a5ac2739 -> caeb386cf227d2395dbc4efba7a1469101be01f884f98898d210b098047d25da

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.