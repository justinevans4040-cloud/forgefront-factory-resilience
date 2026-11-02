# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 525dd40d11667dffc1cbcb9111fa6bdee5a61e2c0c1faef025debb04a8e9e24d
Decision: accepted
Named operator: local-admin
Review actor digest: 32ca4c7397b459fe997b744015aa8a669e7634e58457c023ea4a911e874853f4
Confirmation actor digest: 32ca4c7397b459fe997b744015aa8a669e7634e58457c023ea4a911e874853f4
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: b17a24d2-cd96-4e88-a2c1-1bf8b572cd7a
Ledger: hash-chained, tamper-evident
Verified head: 35ec6091e9febf357bbba020b2d0ffea3a0fd41b571bc9ffc179fe41a54e9516
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
Run a2797a06-6aba-4beb-af86-041004d89259; snapshot 6605d531fee68554a2a4e93c367bee2df0f63a7cd7ba94c4e6a454bbe84b4ccf; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run b17a24d2-cd96-4e88-a2c1-1bf8b572cd7a; snapshot 525dd40d11667dffc1cbcb9111fa6bdee5a61e2c0c1faef025debb04a8e9e24d; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 6605d531fee68554a2a4e93c367bee2df0f63a7cd7ba94c4e6a454bbe84b4ccf
6605d531fee68554a2a4e93c367bee2df0f63a7cd7ba94c4e6a454bbe84b4ccf -> 525dd40d11667dffc1cbcb9111fa6bdee5a61e2c0c1faef025debb04a8e9e24d

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.