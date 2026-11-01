# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: e9836f96227647b729bc726a9b1c43d9218845973649ddad24ddd853f93fd567
Decision: accepted
Named operator: local-admin
Review actor digest: e30899e016a616a9f4f3b8c3351e3ac15dd92a31d08b303d29bbbcb9c2161669
Confirmation actor digest: e30899e016a616a9f4f3b8c3351e3ac15dd92a31d08b303d29bbbcb9c2161669
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: cf21b848-2c4d-4bcc-86c3-ba8f3039e607
Ledger: hash-chained, tamper-evident
Verified head: 6979a6f4949e928c675407a2f8d056a7b79f56f345e965ad97ba696442872ab9
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
Run f0143d49-6a01-4aab-910e-e510d5d95c91; snapshot 36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run cf21b848-2c4d-4bcc-86c3-ba8f3039e607; snapshot e9836f96227647b729bc726a9b1c43d9218845973649ddad24ddd853f93fd567; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
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