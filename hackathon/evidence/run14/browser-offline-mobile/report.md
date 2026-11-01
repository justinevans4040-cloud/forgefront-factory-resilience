# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: ebd6c23bcec40188598469d32b6d904f06d440ea9876452144c4d031749522b1
Decision: accepted
Named operator: local-admin
Review actor digest: 12f64ca62dcd43a30e459c700f3f6eb228f010edeb3aaf98f0d8e54662afe21f
Confirmation actor digest: 12f64ca62dcd43a30e459c700f3f6eb228f010edeb3aaf98f0d8e54662afe21f
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: d4701757-1e01-4425-ab3c-7c75a5ef4647
Ledger: hash-chained, tamper-evident
Verified head: 7cc92c634c37e4fca8f0c06e86fd30d33a3f242f0093e20ea06ea79367999aaf
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
Run 11798cc4-27d9-4024-862c-69658e8c215b; snapshot ba6fe43b2fd648d062e601dad73fa777bc2cfb4796857f3081bedcd51baa888e; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run d4701757-1e01-4425-ab3c-7c75a5ef4647; snapshot ebd6c23bcec40188598469d32b6d904f06d440ea9876452144c4d031749522b1; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> ba6fe43b2fd648d062e601dad73fa777bc2cfb4796857f3081bedcd51baa888e
ba6fe43b2fd648d062e601dad73fa777bc2cfb4796857f3081bedcd51baa888e -> ebd6c23bcec40188598469d32b6d904f06d440ea9876452144c4d031749522b1

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.