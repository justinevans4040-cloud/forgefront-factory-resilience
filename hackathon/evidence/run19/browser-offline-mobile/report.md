# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 6f1ad8b5cc45d061852861cbcac7336d433c74c00aa1b142336ce9c80d464649
Decision: accepted
Named operator: local-admin
Review actor digest: 173e7b9615e14ca7a8ae09f1c6cc23a9c9fe4953003a1004e343a22c42c241e3
Confirmation actor digest: 173e7b9615e14ca7a8ae09f1c6cc23a9c9fe4953003a1004e343a22c42c241e3
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 67704ceb-2c2e-4cd9-9647-2cbb2b276d3c
Ledger: hash-chained, tamper-evident
Verified head: 5c9eb39120f9304d4d3304e972f554c3721a580d19fd4174357e1e6d9c8350c5
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
Run fa5d9385-1e08-4869-aa0e-d8713c5411ce; snapshot 6e8f51935c8d091cf72ec0c949a69cb4b5ddec3f4f1295971663402bb405b501; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 67704ceb-2c2e-4cd9-9647-2cbb2b276d3c; snapshot 6f1ad8b5cc45d061852861cbcac7336d433c74c00aa1b142336ce9c80d464649; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 6e8f51935c8d091cf72ec0c949a69cb4b5ddec3f4f1295971663402bb405b501
6e8f51935c8d091cf72ec0c949a69cb4b5ddec3f4f1295971663402bb405b501 -> 6f1ad8b5cc45d061852861cbcac7336d433c74c00aa1b142336ce9c80d464649

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.