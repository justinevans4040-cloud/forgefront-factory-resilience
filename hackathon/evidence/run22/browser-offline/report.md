# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 22ce2dbf07bf3225cb55f752993d4b1181e703196741848c8d4606a271db7719
Decision: accepted
Named operator: local-admin
Review actor digest: 4b8384d2c69a836d260ba869d520102da27a955de5b65e1c58efafb3c66899fa
Confirmation actor digest: 4b8384d2c69a836d260ba869d520102da27a955de5b65e1c58efafb3c66899fa
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 517430d3-91b3-4099-92fa-8d94b4882b38
Ledger: hash-chained, tamper-evident
Verified head: 92353d221163e1402725723e80dc71a6c26bfa1be7c14d278ba2658fcf90b48c
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
Run 30a583f2-cc77-4650-9a3a-7d94134acc37; snapshot 9242089728a5e928e7634d5c9217a1663509c411622c435c2e3c6868477dbf42; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 517430d3-91b3-4099-92fa-8d94b4882b38; snapshot 22ce2dbf07bf3225cb55f752993d4b1181e703196741848c8d4606a271db7719; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 9242089728a5e928e7634d5c9217a1663509c411622c435c2e3c6868477dbf42
9242089728a5e928e7634d5c9217a1663509c411622c435c2e3c6868477dbf42 -> 22ce2dbf07bf3225cb55f752993d4b1181e703196741848c8d4606a271db7719

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.