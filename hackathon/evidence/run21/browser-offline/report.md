# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 58aa7544ab17ff100f5ae1384a73f2b9caa7c97e9516a4ffa386938f47c45621
Decision: accepted
Named operator: local-admin
Review actor digest: 07d545dcb34abf56f9ad6ff9ff3a04e53183a6e971886e3fe5084b716a87d3ac
Confirmation actor digest: 07d545dcb34abf56f9ad6ff9ff3a04e53183a6e971886e3fe5084b716a87d3ac
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: b0297c9d-76f0-49e5-b310-35989e165bf3
Ledger: hash-chained, tamper-evident
Verified head: b8fd55f17fce17f1c3f7254f1f85529a810daaf676d7f3578844111934fc375f
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
Run b7f0aa29-b9ad-45e2-b5ed-cee1e4e68ad9; snapshot ff02837c9303577f40113034e1941e0947ad2d8277bc88226b7390c92c0e1560; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run b0297c9d-76f0-49e5-b310-35989e165bf3; snapshot 58aa7544ab17ff100f5ae1384a73f2b9caa7c97e9516a4ffa386938f47c45621; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> ff02837c9303577f40113034e1941e0947ad2d8277bc88226b7390c92c0e1560
ff02837c9303577f40113034e1941e0947ad2d8277bc88226b7390c92c0e1560 -> 58aa7544ab17ff100f5ae1384a73f2b9caa7c97e9516a4ffa386938f47c45621

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.