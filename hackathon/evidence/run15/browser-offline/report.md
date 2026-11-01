# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 4a5d89b6f447beea463f25e60b51df55284388ec4150135d9ce25c6c26e64101
Decision: accepted
Named operator: local-admin
Review actor digest: 40ad7c65fbffa1c4f0e3f12c406b797f96aae851788fce0184f6bdb7b5f16ada
Confirmation actor digest: 40ad7c65fbffa1c4f0e3f12c406b797f96aae851788fce0184f6bdb7b5f16ada
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: d9c95b53-cc96-45b1-860e-cc59ce3c6720
Ledger: hash-chained, tamper-evident
Verified head: 6a75c34330d26deb2554e9eb6002ffdd2426ac27ab71a1e68ab8cd7307323cee
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
Run a33771bc-503b-49c4-8c07-4a585d6605cb; snapshot bcd1b9cdacbe336be9a6afc5707d044a5c3918df72321b86b2eadd6bdf2ef0fb; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.
Run d9c95b53-cc96-45b1-860e-cc59ce3c6720; snapshot 4a5d89b6f447beea463f25e60b51df55284388ec4150135d9ce25c6c26e64101; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Model analysis (human review; source validation listed separately): SAMPLE — OFFLINE; NO LIVE AI Offline recovery walkthrough · no Meta model call. Calculated recovery: Wait for replenishment. Finish in 83 hours with USD 0 incremental cost. Inspect source evidence and compare calculated options before accepting a recovery.

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> bcd1b9cdacbe336be9a6afc5707d044a5c3918df72321b86b2eadd6bdf2ef0fb
bcd1b9cdacbe336be9a6afc5707d044a5c3918df72321b86b2eadd6bdf2ef0fb -> 4a5d89b6f447beea463f25e60b51df55284388ec4150135d9ce25c6c26e64101

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.