# Forgefront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: cd11ff7bd219e1853ce336c21a10794c14bd94d8c6d538c97c1acae940c208b0
Decision: accepted
Named operator: local-admin
Review actor digest: 4dc98bd0433ff9f50c2e6a5acb6b3511cca9173c5c1c6f9ae0b3e76efded28e7
Confirmation actor digest: 4dc98bd0433ff9f50c2e6a5acb6b3511cca9173c5c1c6f9ae0b3e76efded28e7
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: b2da957a-fbf7-45da-bbec-9b8eb9464795
Ledger: hash-chained, tamper-evident
Verified head: 34e15b5bbe0ecc651c546aeb7fc4befc7de62bbbd09e000e03dc0a18153e7415
Events: 22

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
Run d46d30c3-92f3-4410-a2e3-f990f29cde7f; snapshot 8d5663bf8de14d95416a5e6f42fa6b3048f2019e194e5433c4aa9f631441d71f; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Certificate hold verified: lot ALLOY-A certificate shows 120 each [ev-cert-qty] but receiving posted 80 each and hold applied [ev-recv-qty], leaving 70 units across 2 jobs without primary material. Verified substitute MAT-ALLOY-B on-hand 100 each [ev-sub-stock] covers the requirement. Three feasible options compared: Wait for Replenishment finishes in 83 hours at $0 incremental cost but misses both dues (36h and 48h) due to 48-hour replenishment lead time and held lot remaining unavailable; Allocate Substitute Material finishes in 35 hours at $3,115 ($2,975 labor + $140 material premium) using 70 units of substitute on CELL-MILL-1, meeting both dues; Split Capacity Across Cells finishes fastest in 17.5 hours at $3,202.50 by splitting production across CELL-MILL-1 and CELL-MILL-2. Selected Allocate Substitute Material balances timing and cost while respecting constraints that held primary material is not issued and no supplier messaging is used. Business assumptions: quantities from current certificate, receiving and stock records, cell costs from snapshot hourly rates, and substitute limited to verified available stock.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 040029c5-7027-41a8-9188-b943fde04d33; snapshot 8d5663bf8de14d95416a5e6f42fa6b3048f2019e194e5433c4aa9f631441d71f; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): The certificate shows 120 each but receiving posted 80 each for the held alloy, so the 40-each gap leaves that lot unavailable and affects 70 units across two jobs. Allocate substitute is proposed: the verified substitute has 100 each available, enough to cover all 70 units with 30 each remaining, finishing in 35 hours for $3,115 and within the 36- and 48-hour due windows. Counterfactual: waiting for replenishment would add no incremental cost but finish in 83 hours, beyond both due windows; splitting production across both mills would finish in 17.5 hours but cost $3,202.50, an extra $87.50 without being needed to meet those windows. This rests on the current certificate, receiving and stock quantities, the snapshot hourly cell rates, and using only verified available substitute stock, while the held lot remains on hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run b2da957a-fbf7-45da-bbec-9b8eb9464795; snapshot cd11ff7bd219e1853ce336c21a10794c14bd94d8c6d538c97c1acae940c208b0; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Allocate substitute is proposed for the 70 impacted units: it draws 70 units of the verified substitute from 100 on hand, completes in 35 hours, and costs $3,115 incrementally ($2,975 labor and $140 material premium), using the current certificate, receiving and stock quantities and the provided cell hourly rates, with allocation limited to verified available stock. The 40-unit gap between the 120-unit certificate and 80-unit receiving record remains unresolved, and the held lot remains unavailable for this recovery. Counterfactual: waiting for replenishment costs $0 incrementally but, assuming the documented 48-hour replenishment lead time, completes in 83 hours instead of 35 hours; splitting capacity is not available because it requires at least two online compatible cells while the second milling cell is unavailable. The human records the decision; this proposal does not clear the hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 8d5663bf8de14d95416a5e6f42fa6b3048f2019e194e5433c4aa9f631441d71f
8d5663bf8de14d95416a5e6f42fa6b3048f2019e194e5433c4aa9f631441d71f -> cd11ff7bd219e1853ce336c21a10794c14bd94d8c6d538c97c1acae940c208b0

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.