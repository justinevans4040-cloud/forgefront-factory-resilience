# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: f5cd863a3663c04f2a5f7054e8d33a1c8e94bebe57a0bb7c27594d30a849435d
Decision: accepted
Named operator: local-admin
Review actor digest: 97d741b40d6764f117630ffb8b5cb11b27b8f643c37a13b7ef36bf99fc67d715
Confirmation actor digest: 97d741b40d6764f117630ffb8b5cb11b27b8f643c37a13b7ef36bf99fc67d715
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 91d0254e-68d0-4af4-a16e-75d24dbf03a6
Ledger: hash-chained, tamper-evident
Verified head: 1e57b6a7af7e15b6f04215fbe4f845ee1fc863e13ad56ff6ff5598625ccc01c7
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
Run 46a4dd6b-ea04-48d3-8106-d33934dc5849; snapshot c9259a47a5e5ec0e4da28f9cb39f97c0cfe926a3aa14435710f0c140a231876c; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 91d0254e-68d0-4af4-a16e-75d24dbf03a6; snapshot f5cd863a3663c04f2a5f7054e8d33a1c8e94bebe57a0bb7c27594d30a849435d; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> c9259a47a5e5ec0e4da28f9cb39f97c0cfe926a3aa14435710f0c140a231876c
c9259a47a5e5ec0e4da28f9cb39f97c0cfe926a3aa14435710f0c140a231876c -> f5cd863a3663c04f2a5f7054e8d33a1c8e94bebe57a0bb7c27594d30a849435d

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.