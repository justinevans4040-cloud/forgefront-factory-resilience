# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: e9836f96227647b729bc726a9b1c43d9218845973649ddad24ddd853f93fd567
Decision: accepted
Named operator: local-admin
Review actor digest: e43d0f2afd092d23dc5a1a00e5576094c2fae98cade05bbab04c1e2ce207fb82
Confirmation actor digest: e43d0f2afd092d23dc5a1a00e5576094c2fae98cade05bbab04c1e2ce207fb82
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 7454bbdf-e40a-48dd-b9dd-718cc2fa911d
Ledger: hash-chained, tamper-evident
Verified head: c050d1074b1a2978b068b356cf28ff4a40ad77b47122a5c1ae8b096c06df0780
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
Run 31e3b747-78fe-4c14-9c88-81a5ca167c8c; snapshot 36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2; LIVE META; MODEL_ERROR
Models: unavailable
Validated source claims: 0; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): 
Run 23d9f368-0028-4061-a8cc-03ddc9f1b7fa; snapshot 36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 7454bbdf-e40a-48dd-b9dd-718cc2fa911d; snapshot e9836f96227647b729bc726a9b1c43d9218845973649ddad24ddd853f93fd567; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> e9836f96227647b729bc726a9b1c43d9218845973649ddad24ddd853f93fd567

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.