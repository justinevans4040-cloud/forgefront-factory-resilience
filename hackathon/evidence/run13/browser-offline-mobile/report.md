# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 5d547389080ac04d4bf7fadffa0642a88ee867d61ce34eba48c762b70667038c
Decision: accepted
Named operator: local-admin
Review actor digest: 19117eb0fcd62f10f5da8d7dc12a44698ed38d8ff28ae122adc4b5019e6c8fd7
Confirmation actor digest: 19117eb0fcd62f10f5da8d7dc12a44698ed38d8ff28ae122adc4b5019e6c8fd7
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: b9f51753-e786-4236-ae67-4301421e0ca7
Ledger: hash-chained, tamper-evident
Verified head: c29791e13ce09a79b6afb8eacfc972ff139700051ca8c1c327f741fd0f6171bf
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
Run 2556c240-9aa0-4138-9b33-effbd763fe19; snapshot f5e23a07c40d148a5965794ea0c6ae9a967e41a486ce008eea832fb8721ab06c; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run b9f51753-e786-4236-ae67-4301421e0ca7; snapshot 5d547389080ac04d4bf7fadffa0642a88ee867d61ce34eba48c762b70667038c; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> f5e23a07c40d148a5965794ea0c6ae9a967e41a486ce008eea832fb8721ab06c
f5e23a07c40d148a5965794ea0c6ae9a967e41a486ce008eea832fb8721ab06c -> 5d547389080ac04d4bf7fadffa0642a88ee867d61ce34eba48c762b70667038c

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.