# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: b61ee5bc9826893dcdaae3b372cc54f34a295c3d3440539fef1f42ae9802fc8f
Decision: accepted
Named operator: local-admin
Review actor digest: d4f599976310926bb9b31cf3f89b181a3b2ced29ff23db3d5d6540bd5f209610
Confirmation actor digest: d4f599976310926bb9b31cf3f89b181a3b2ced29ff23db3d5d6540bd5f209610
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 20071ea4-ec14-4530-a9bd-9be97d8a6cbe
Ledger: hash-chained, tamper-evident
Verified head: 2d2f0bc9bb3a8f15cb4246ec3d22580e263ecc9dacc5b819196236ec879ad2dd
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
Run 57062b1b-2c30-49c9-9d14-f999690cb7e1; snapshot dacb0f0cff53454f28c1bf117416f6c357b15a34900f8dd36543d0b08c0e038a; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run 20071ea4-ec14-4530-a9bd-9be97d8a6cbe; snapshot b61ee5bc9826893dcdaae3b372cc54f34a295c3d3440539fef1f42ae9802fc8f; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> dacb0f0cff53454f28c1bf117416f6c357b15a34900f8dd36543d0b08c0e038a
dacb0f0cff53454f28c1bf117416f6c357b15a34900f8dd36543d0b08c0e038a -> b61ee5bc9826893dcdaae3b372cc54f34a295c3d3440539fef1f42ae9802fc8f

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.