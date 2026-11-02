# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 90f3214a0f375a9e4640a23824548ae398210a8d1fd5f77192025d3be0a0a9df
Decision: accepted
Named operator: local-admin
Review actor digest: 1d626aeb2b2a148847d262f5eecd2435be2cf689971949165bab7032ff9a249f
Confirmation actor digest: 1d626aeb2b2a148847d262f5eecd2435be2cf689971949165bab7032ff9a249f
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: b2e33ba8-7b0f-496a-be03-8f7c0301c1d2
Ledger: hash-chained, tamper-evident
Verified head: c2f8014cf6111a328c8f5e84505d2d4dbb9a24c5555ac1f22790300c0e2489de
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
Run e1f66f59-b930-4f9a-83b7-1bfd01f3d048; snapshot 9243db3a3d5c49875dabac76b5abe01df5c6e6065f1c68bda7e713cc9ebce66b; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run b2e33ba8-7b0f-496a-be03-8f7c0301c1d2; snapshot 90f3214a0f375a9e4640a23824548ae398210a8d1fd5f77192025d3be0a0a9df; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 9243db3a3d5c49875dabac76b5abe01df5c6e6065f1c68bda7e713cc9ebce66b
9243db3a3d5c49875dabac76b5abe01df5c6e6065f1c68bda7e713cc9ebce66b -> 90f3214a0f375a9e4640a23824548ae398210a8d1fd5f77192025d3be0a0a9df

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.