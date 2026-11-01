# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: f1dddb807051e1998e313ecd5273e2811c80129dac4de11e81221c37e52da85e
Decision: accepted
Named operator: local-admin
Review actor digest: 4256d7c71cfe25a7236f1caf773fef9c7bf54288edd790a36a949b38ed681a03
Confirmation actor digest: 4256d7c71cfe25a7236f1caf773fef9c7bf54288edd790a36a949b38ed681a03
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 0041a7c0-c147-44ac-8a05-a12dcda8bc6b
Ledger: hash-chained, tamper-evident
Verified head: 47b2aeb9fa9ff409bc2e0d225592914d0937eef5b4d8d614e90664f325656bff
Events: 11

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
Run 3f0f58c0-49c3-41c6-8ccb-7e531009bbc5; snapshot 41c2ba1b5f119c39c5f8f7eea4547a4abcc1719439470f08a03ea8017ac4132e; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 0041a7c0-c147-44ac-8a05-a12dcda8bc6b; snapshot f1dddb807051e1998e313ecd5273e2811c80129dac4de11e81221c37e52da85e; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 41c2ba1b5f119c39c5f8f7eea4547a4abcc1719439470f08a03ea8017ac4132e
41c2ba1b5f119c39c5f8f7eea4547a4abcc1719439470f08a03ea8017ac4132e -> f1dddb807051e1998e313ecd5273e2811c80129dac4de11e81221c37e52da85e

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.