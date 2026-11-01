# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 7ad2b98422fa094d816ed3307fc03460bcf779073cc8567732343115ed07a145
Decision: accepted
Named operator: local-admin
Review actor digest: e02430433e06d1f7075ddbd780a1de3563311743d90592d3e45e9b014dfbfa9a
Confirmation actor digest: e02430433e06d1f7075ddbd780a1de3563311743d90592d3e45e9b014dfbfa9a
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 56f067d6-54ae-4387-b129-4e5f321726cb
Ledger: hash-chained, tamper-evident
Verified head: a52983ac4577fdf5f4ef290628f31d1e06d7436ca5a62484fc296cc37e783638
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
Run e2f87700-6268-4377-abf6-f24099c18b43; snapshot 9b2ddcd43924ee83c72b543e340efbb9e243f2b047cba8de81158113ee4a5cc7; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 56f067d6-54ae-4387-b129-4e5f321726cb; snapshot 7ad2b98422fa094d816ed3307fc03460bcf779073cc8567732343115ed07a145; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 9b2ddcd43924ee83c72b543e340efbb9e243f2b047cba8de81158113ee4a5cc7
9b2ddcd43924ee83c72b543e340efbb9e243f2b047cba8de81158113ee4a5cc7 -> 7ad2b98422fa094d816ed3307fc03460bcf779073cc8567732343115ed07a145

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.