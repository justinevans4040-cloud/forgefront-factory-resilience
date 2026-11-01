# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 3e231b0d82b9b332f9a3a0e8668182c7811458f67b0376ceac5a0415883babe7
Decision: accepted
Named operator: local-admin
Review actor digest: 5f7c37040009cfc6b84436d91a4cdd309c1fd1f06bfda39f229d63be9d3890b9
Confirmation actor digest: 5f7c37040009cfc6b84436d91a4cdd309c1fd1f06bfda39f229d63be9d3890b9
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: bad52ed7-f749-455b-974d-72c759b10edb
Ledger: hash-chained, tamper-evident
Verified head: 7fae790576053d97994953f60f99eac4eb62b141019398824fedb68fb89970c0
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
Run 944fcc5c-e43a-43a3-ab60-ba58a0cc12ef; snapshot 8ea4bf60280fa76e449642b6fcf572b9364279f854ec951a7cfe8f2dc2707d73; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run bad52ed7-f749-455b-974d-72c759b10edb; snapshot 3e231b0d82b9b332f9a3a0e8668182c7811458f67b0376ceac5a0415883babe7; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 8ea4bf60280fa76e449642b6fcf572b9364279f854ec951a7cfe8f2dc2707d73
8ea4bf60280fa76e449642b6fcf572b9364279f854ec951a7cfe8f2dc2707d73 -> 3e231b0d82b9b332f9a3a0e8668182c7811458f67b0376ceac5a0415883babe7

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.