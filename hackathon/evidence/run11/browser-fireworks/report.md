# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 81c3f96afacd788ef3f63382c58990da1e2ca20bdb6c00df42bc9df75e3c4abf
Decision: accepted
Named operator: local-admin
Review actor digest: f6a6bc830cc4d0f110088489d903d7e975318227a530292d9ed43dd5a402b226
Confirmation actor digest: f6a6bc830cc4d0f110088489d903d7e975318227a530292d9ed43dd5a402b226
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: aaf9cade-a78c-4768-afc0-3ef304bbd6e7
Ledger: hash-chained, tamper-evident
Verified head: 87f9cb3abb98de6313d6e1fee77925142adcda3984105c8afdacac6bb3cb1607
Events: 22

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
Run 68b1bd0e-9d4e-4a89-9b55-0f9d952a7aa5; snapshot de58aa9a8d708c79ec5f41a659d3b4fc769b81c1e8a9afa98fb9cf14b1b47c66; LIVE META; MODEL_STOP
Models: accounts/fireworks/models/muse-spark-open, accounts/fireworks/models/muse-spark-open, accounts/fireworks/models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Certificate hold on MAT-ALLOY-A blocks 70 units (JOB-1001 40 units due 36h, JOB-1002 30 units due 48h). Counterfactual vs computed options: wait_replenishment 83h (48h lead +35h production) cost $0 but misses both dues; allocate_substitute 35h cost $3115 on CELL-MILL-1; split_capacity 17.5h cost $3202.5 split across CELL-MILL-1 (17.5h/$1487.5) and CELL-MILL-2 (17.5h/$1575) using MAT-ALLOY-B. Recommend split_capacity for due-date compliance. Assumptions: synthetic demo quantities only, illustrative cell costs not OEM quotes, substitute uses only verified available stock, held lot remains unavailable.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run c207139a-e34c-4f93-8600-aa0f4f448433; snapshot de58aa9a8d708c79ec5f41a659d3b4fc769b81c1e8a9afa98fb9cf14b1b47c66; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only: allocate_substitute uses verified substitute stock 100 each to cover 70 impacted units, finishing in 35h at $3115 incremental cost, within the 36h and 48h dues. Counterfactuals: wait_replenishment costs $0 but finishes in 83h and would miss dues; split_capacity finishes faster in 17.5h but costs $3202.50, $87.50 more than allocate_substitute. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, substitute allocation uses only verified available stock, held MAT lot remains on hold, and no supplier messaging.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run aaf9cade-a78c-4768-afc0-3ef304bbd6e7; snapshot 81c3f96afacd788ef3f63382c58990da1e2ca20bdb6c00df42bc9df75e3c4abf; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, not an approval: allocate_substitute finishes 70 units in 35h at $3115 incremental cost, versus wait_replenishment finishing in 83h at $0; counterfactually, waiting would exceed the 36h and 48h job dues, while splitting is infeasible because it requires at least two online compatible cells. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, and substitute allocation uses only verified available stock.
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> de58aa9a8d708c79ec5f41a659d3b4fc769b81c1e8a9afa98fb9cf14b1b47c66
de58aa9a8d708c79ec5f41a659d3b4fc769b81c1e8a9afa98fb9cf14b1b47c66 -> 81c3f96afacd788ef3f63382c58990da1e2ca20bdb6c00df42bc9df75e3c4abf

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.