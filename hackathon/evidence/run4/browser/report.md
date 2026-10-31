# ForgeFront recovery evidence
SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: ac7e21e318077b385dc3f9c939e08a197166926788e4cc6a2885e07fe50ee38d
Decision: accepted
Named operator: local-admin
Actor digest: 0f8cb7d37da593403d7622b53d445754b95fb824ec8e99726c38209c83e760b3
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: 9342af3a-13d0-423f-ae2b-6e5020ec74bf
Ledger: hash-chained, tamper-evident
Verified head: 73070717365ec75d6be82346aee65c117564dc2dc1abf21ffc6ec30681af3b1f
Events: 19

## Deterministic options
wait_replenishment: feasible; finish 83 hours; incremental USD 0
Assumptions: All quantities are synthetic demo values.; Illustrative cell costs are not OEM quotes.; Documented replenishment lead time 48 hours
Constraints: Held lot remains unavailable until replenishment posts
Sources: ev-cert-qty, ev-recv-qty
allocate_substitute: feasible; finish 35 hours; incremental USD 3115
Assumptions: All quantities are synthetic demo values.; Illustrative cell costs are not OEM quotes.; Substitute allocation uses only verified available stock
Constraints: Held MAT lot remains on hold; No supplier messaging
Sources: ev-sub-stock, ev-recv-qty
split_capacity: infeasible; finish unavailable hours; incremental USD unavailable
Assumptions: All quantities are synthetic demo values.; Illustrative cell costs are not OEM quotes.
Constraints: Offline cells excluded
Sources: ev-sub-stock

## Investigations
Run 63fbcb31-613e-4722-9523-68df41486230; snapshot 1bb65620dcbb23632471a80284d930675b89f967a769fc948058f4a216a3ac77; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory: allocate_substitute (35h, +$3115) meets both due dates (36h/48h) using verified MAT-ALLOY-B stock vs wait_replenishment (83h, $0) which misses dues due to 48h replenishment lead time, and split_capacity (17.5h, +$3202.50) which is fastest but higher cost. Assumes synthetic demo quantities, illustrative non-OEM costs, verified stock only, held lot not issued, no supplier messaging.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 0e2db42d-f7bb-48df-9fde-33bb40bfaec0; snapshot 1bb65620dcbb23632471a80284d930675b89f967a769fc948058f4a216a3ac77; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only: allocate_substitute finishes in 35h for $3115, meeting the 36h earliest due time, versus wait_replenishment at 83h for $0 and split_capacity at 17.5h for $3202.50. Counterfactually, waiting avoids incremental cost but misses due times, while splitting finishes faster for $87.50 more. Assumptions: quantities are synthetic demo values, cell costs are illustrative not OEM quotes, and substitute allocation uses only verified available stock.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 9342af3a-13d0-423f-ae2b-6e5020ec74bf; snapshot ac7e21e318077b385dc3f9c939e08a197166926788e4cc6a2885e07fe50ee38d; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only: allocate_substitute finishes 70 units in 35h for $3115 vs wait_replenishment finishing in 83h for $0, which would miss the 36h/48h dues; split_capacity is infeasible as it requires at least two online compatible cells. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, and substitute allocation uses only verified available stock.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> 1bb65620dcbb23632471a80284d930675b89f967a769fc948058f4a216a3ac77
1bb65620dcbb23632471a80284d930675b89f967a769fc948058f4a216a3ac77 -> ac7e21e318077b385dc3f9c939e08a197166926788e4cc6a2885e07fe50ee38d

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.