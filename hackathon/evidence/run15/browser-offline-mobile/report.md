# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: fc0a058aaa2ca43c68724bfb969d0db0845e0b6d0d433345fbc7e944ef300ca9
Decision: accepted
Named operator: local-admin
Review actor digest: 68faf04fd92aad3f9f6f8a83f9bbd90550a2b7c833f762390d57d1d0aeefcc55
Confirmation actor digest: 68faf04fd92aad3f9f6f8a83f9bbd90550a2b7c833f762390d57d1d0aeefcc55
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 5d8eb6de-23bc-4cf4-ae1c-c4f965cfee40
Ledger: hash-chained, tamper-evident
Verified head: 5ef3ac1e96e7f38133f9e9b44fba5dc8ac5004807f487d640922814bbef82b3d
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
Run 28b656a1-cb91-425d-9285-fc8bca496ccb; snapshot f5a0bb41fa2d88c545fa2423d96460cb0018fed0274acb7b8c6779af1b1d9887; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 5d8eb6de-23bc-4cf4-ae1c-c4f965cfee40; snapshot fc0a058aaa2ca43c68724bfb969d0db0845e0b6d0d433345fbc7e944ef300ca9; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> f5a0bb41fa2d88c545fa2423d96460cb0018fed0274acb7b8c6779af1b1d9887
f5a0bb41fa2d88c545fa2423d96460cb0018fed0274acb7b8c6779af1b1d9887 -> fc0a058aaa2ca43c68724bfb969d0db0845e0b6d0d433345fbc7e944ef300ca9

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.