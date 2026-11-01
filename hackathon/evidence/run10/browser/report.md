# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 860398c48ed826a5975ae75f50380ff6a04b0c60d36e930174ede7092a470696
Decision: accepted
Named operator: local-admin
Review actor digest: 879ce50fb4d6d8a943356b8a3f58c0ee28b3124010e7b89ca6565ee3368796f9
Confirmation actor digest: 879ce50fb4d6d8a943356b8a3f58c0ee28b3124010e7b89ca6565ee3368796f9
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: 56205a6e-2e68-4902-ba6c-1e5e13e4966e
Ledger: hash-chained, tamper-evident
Verified head: 604abf80c54e7d31b6aa979ce507a0d80c88ec1ddd0b24a6221d1b538ce3b6c1
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
Run 28d1a8a7-8966-4714-b5c2-3a019d4caa7a; snapshot f1817b0d0ba68c382cba7766ef2b571e33d8f016933fee831af72e7893a14702; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory: Recommend split_capacity using verified MAT-ALLOY-B (100 on-hand) split across CELL-MILL-1/CELL-MILL-2 for 17.5h finish, vs allocate_substitute 35h (meets 36h due with 1h margin, cost $3115) vs wait_replenishment 83h (48h lead +35h prod, cost $0) which misses both dues (36h/48h). Assumes synthetic demo values, illustrative costs not OEM quotes, substitute uses verified stock only, hours split across compatible online cells, held MAT-ALLOY-A not issued.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 2cda25b3-e6f2-43dc-acc1-0a4d39cac2cb; snapshot f1817b0d0ba68c382cba7766ef2b571e33d8f016933fee831af72e7893a14702; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, not approval or release: split_capacity finishes in 17.5h at $3202.5, versus allocate_substitute at 35h/$3115 and wait_replenishment at 83h/$0. Counterfactually, waiting would exceed the 36h and 48h job dues, and the single-cell substitute option saves only $87.5 while taking twice as long; splitting therefore provides substantially more schedule margin for a small premium. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, production hours can be split across compatible online cells, held primary material is not issued, and the substitute draw of 70 units is covered by 100 units verified on hand.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 56205a6e-2e68-4902-ba6c-1e5e13e4966e; snapshot 860398c48ed826a5975ae75f50380ff6a04b0c60d36e930174ede7092a470696; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, not approval: allocate_substitute finishes in 35h at $3115 incremental cost using 70 units of verified MAT-ALLOY-B stock, versus wait_replenishment counterfactually finishing in 83h at $0 cost and missing nearer due windows; split_capacity is infeasible because it requires at least two online compatible cells. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, substitute allocation uses only verified available stock, and documented replenishment lead time is 48 hours.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> f1817b0d0ba68c382cba7766ef2b571e33d8f016933fee831af72e7893a14702
f1817b0d0ba68c382cba7766ef2b571e33d8f016933fee831af72e7893a14702 -> 860398c48ed826a5975ae75f50380ff6a04b0c60d36e930174ede7092a470696

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.