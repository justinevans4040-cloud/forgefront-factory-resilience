# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: add0ae0507271e390cf192e76a173aa34ce48c3b98c7503192412fd0064abafb
Decision: accepted
Named operator: local-admin
Review actor digest: 3071f06d0d4c03bb1d908989df0970f509d64beaab40826e80ba02d0ba43ea6e
Confirmation actor digest: 3071f06d0d4c03bb1d908989df0970f509d64beaab40826e80ba02d0ba43ea6e
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: eff87851-449c-4399-9570-156fe92b46e2
Ledger: hash-chained, tamper-evident
Verified head: 9a0a4799bf1f5b45a85d2a86ee471af56e776a58520b896321a855eed18e94a6
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
Run f495c54c-bf90-4abe-bae7-718ca9f6d5cb; snapshot 099d35a47d4f1a379c5c07d5c4170084ad15ea642797370a4a368b2b4c5d6e91; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory recommendation only (unvalidated): allocate_substitute completes 70 units in 35h for $3115 using verified MAT-ALLOY-B stock, meeting dueHours 36h/48h. Counterfactual: wait_replenishment is 83h ($0) and misses dues due to 48h lead time; split_capacity is fastest at 17.5h but higher cost $3202.50. Assumptions: All quantities are synthetic demo values; Illustrative cell costs are not OEM quotes; Substitute allocation uses only verified available stock; Held lot remains on hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run dda778f4-463d-4a73-8da3-ae3042948581; snapshot 099d35a47d4f1a379c5c07d5c4170084ad15ea642797370a4a368b2b4c5d6e91; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, not approval: split_capacity finishes in 17.5h for $3202.50 versus allocate_substitute at 35h/$3115 and wait_replenishment at 83h/$0. Counterfactually, waiting avoids incremental cost but exceeds the 36h and 48h due hours, while single-cell substitution only narrowly meets the earliest due; splitting adds $87.50 over substitution for a much larger schedule buffer. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, production splits across compatible online cells, substitute uses verified available stock, and the held MAT-ALLOY-A lot remains on hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run eff87851-449c-4399-9570-156fe92b46e2; snapshot add0ae0507271e390cf192e76a173aa34ce48c3b98c7503192412fd0064abafb; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory, unvalidated: allocate_substitute covers 70 impacted units in 35h at $3115 incremental cost, versus wait_replenishment at 83h/$0 which would miss 36h/48h dues; split_capacity is infeasible as it requires at least two online compatible cells. Assumptions: all quantities are synthetic demo values; illustrative cell costs are not OEM quotes; substitute allocation uses only verified available stock; documented replenishment lead time is 48 hours.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> 099d35a47d4f1a379c5c07d5c4170084ad15ea642797370a4a368b2b4c5d6e91
099d35a47d4f1a379c5c07d5c4170084ad15ea642797370a4a368b2b4c5d6e91 -> add0ae0507271e390cf192e76a173aa34ce48c3b98c7503192412fd0064abafb

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.