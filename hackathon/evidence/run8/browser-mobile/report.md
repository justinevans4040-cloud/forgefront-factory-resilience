# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 48f5dfce82c0a7075178f2c4e54191d4f79d49fd27f9f644937fc7e82de5e83a
Decision: accepted
Named operator: local-admin
Review actor digest: dea8381ed2452b3a54f4c77b3b9bc3eea729e86652397feba216622603ab8407
Confirmation actor digest: dea8381ed2452b3a54f4c77b3b9bc3eea729e86652397feba216622603ab8407
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: 2a897f9f-1ae0-4354-9bd5-26e661b27a4c
Ledger: hash-chained, tamper-evident
Verified head: cc8d9b23fdd3f6423fdb642bf1611b27bfa7e318ae895369dbd4da9a4300df79
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
Run 16ea5ac3-12bd-4b73-a927-df83806fdb16; snapshot 63fdb786ee3431f44990dbbba1263f01c77709cb732980ea301ac667bdd837be; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory: split_capacity with verified MAT-ALLOY-B finishes in 17.5h across CELL-MILL-1/2 meeting both due dates, vs allocate_substitute 35h (meets barely) and wait_replenishment 83h (misses 36h/48h dues). Counterfactual: waiting saves cost but delays; single-cell substitute meets due but slower than split. Assumptions: all quantities are synthetic demo values; illustrative cell costs are not OEM quotes; production hours split across compatible online cells; held primary material not issued.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 1bd8ff9b-2c55-4d86-be0d-f23685648877; snapshot 63fdb786ee3431f44990dbbba1263f01c77709cb732980ea301ac667bdd837be; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, unvalidated: Recommend split_capacity, finishing in 17.5h for $3202.50. Counterfactual: wait_replenishment costs $0 but finishes in 83h, beyond the 36h and 48h dues; allocate_substitute finishes in 35h for $3115, so split_capacity costs $87.50 more but halves completion time. Assumptions: all quantities are synthetic demo values; illustrative cell costs are not OEM quotes; production hours split across compatible online cells; held primary material is not issued.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 2a897f9f-1ae0-4354-9bd5-26e661b27a4c; snapshot 48f5dfce82c0a7075178f2c4e54191d4f79d49fd27f9f644937fc7e82de5e83a; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory recommendation; unvalidated narrative: allocate_substitute is feasible, finishing 70 impacted units in 35 hours at $3115 incremental cost, versus wait_replenishment finishing in 83 hours at $0 and split_capacity infeasible for requiring at least two online compatible cells. Counterfactually, waiting would miss the 36-hour and 48-hour job dues. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, substitute allocation uses only verified available stock, held MAT-ALLOY-A remains on hold, and no supplier messaging.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> 63fdb786ee3431f44990dbbba1263f01c77709cb732980ea301ac667bdd837be
63fdb786ee3431f44990dbbba1263f01c77709cb732980ea301ac667bdd837be -> 48f5dfce82c0a7075178f2c4e54191d4f79d49fd27f9f644937fc7e82de5e83a

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.