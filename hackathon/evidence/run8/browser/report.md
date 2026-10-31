# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 4200871e2b9be9961f1d89ef7f693c817cadecf39dbbdcda0d59341eba255b8e
Decision: accepted
Named operator: local-admin
Review actor digest: 1aefa159bc8245b77f9757b765a713c7f074efc3fed89a5e932706b46044645c
Confirmation actor digest: 1aefa159bc8245b77f9757b765a713c7f074efc3fed89a5e932706b46044645c
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: 1c74786c-745a-4478-bc90-a58494869c76
Ledger: hash-chained, tamper-evident
Verified head: c7f7930cc73dfbf0d7973d1c2271e14f1a2fcba3fb870d8fbce827976c265867
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
Run 26300426-c8cd-4b1a-8170-fad92b58395b; snapshot 1d573b9c463b249ac8ab5dfde04c2664bfc48961af5a7b8179fb2080cd1c4293; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory: allocate_substitute is recommended - finish 35h meets JOB-1001 due 36h and JOB-1002 due 48h using verified substitute stock, vs wait_replenishment 83h (48h replenishment +35h production) misses both dues despite $0 cost and held lot unavailable, vs split_capacity 17.5h fastest across CELL-MILL-1/2 but $3202.5 cost. Assumptions: all quantities synthetic demo values, illustrative cell costs not OEM quotes, substitute allocation uses only verified available stock.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run e3e0bd20-47bf-4458-a3f6-ec9f3c028df4; snapshot 1d573b9c463b249ac8ab5dfde04c2664bfc48961af5a7b8179fb2080cd1c4293; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, unvalidated: recommend split_capacity, finishing in 17.5h for $3202.50, providing margin before the earliest 36h due date. Counterfactual: allocate_substitute would finish in 35h for $3115.00, leaving little margin, while wait_replenishment would cost $0 but finish in 83h. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, production hours split across compatible online cells, held primary material is not issued, and incremental cost is illustrative only.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 1c74786c-745a-4478-bc90-a58494869c76; snapshot 4200871e2b9be9961f1d89ef7f693c817cadecf39dbbdcda0d59341eba255b8e; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, not approval/release: allocate_substitute draws 70 verified MAT-ALLOY-B units, finishes in 35h at $3115 incremental cost, versus wait_replenishment finishing in 83h at $0 incremental cost; counterfactual waiting avoids the added cost but delays completion by 48h. split_capacity is infeasible as it requires at least two online compatible cells and CELL-MILL-2 is unavailable. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, substitute allocation uses only verified available stock, and replenishment lead time is 48h.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> 1d573b9c463b249ac8ab5dfde04c2664bfc48961af5a7b8179fb2080cd1c4293
1d573b9c463b249ac8ab5dfde04c2664bfc48961af5a7b8179fb2080cd1c4293 -> 4200871e2b9be9961f1d89ef7f693c817cadecf39dbbdcda0d59341eba255b8e

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.