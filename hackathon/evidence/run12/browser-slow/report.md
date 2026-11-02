# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: e9836f96227647b729bc726a9b1c43d9218845973649ddad24ddd853f93fd567
Decision: accepted
Named operator: local-admin
Review actor digest: 4e99a2b25d5b8b9c4a43a33960b55a5b6cf74047708c84ebaea15e914c5c1515
Confirmation actor digest: 4e99a2b25d5b8b9c4a43a33960b55a5b6cf74047708c84ebaea15e914c5c1515
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 8b87579a-b463-4fbb-9a55-9144eaed1361
Ledger: hash-chained, tamper-evident
Verified head: d7ea2fabbdccfcc693fd14e182a9506ad1c93f55607e3ff9fc451c7f6497937a
Events: 12

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
Run 98ecba67-e3b1-4d4e-8753-666568ff501f; snapshot 36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2; LIVE META; MODEL_ERROR
Models: unavailable
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): 
Run fcccdbd2-22e0-4026-9bcd-e62663c844ef; snapshot 36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 8b87579a-b463-4fbb-9a55-9144eaed1361; snapshot e9836f96227647b729bc726a9b1c43d9218845973649ddad24ddd853f93fd567; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> e9836f96227647b729bc726a9b1c43d9218845973649ddad24ddd853f93fd567

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.