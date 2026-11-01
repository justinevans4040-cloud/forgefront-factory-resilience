# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: d985c55decb550b4e39f509160530041ca723c8600ef8e383d6eb6d9c9556142
Decision: accepted
Named operator: local-admin
Review actor digest: bc3ba697bbaf2e4e4b1d9a8b50796d9ecaff15640806761e19621670d7bff7d2
Confirmation actor digest: bc3ba697bbaf2e4e4b1d9a8b50796d9ecaff15640806761e19621670d7bff7d2
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: e24128d5-cbb7-48a9-85f7-2468ea8157bb
Ledger: hash-chained, tamper-evident
Verified head: 348422a422a20f67dc658539a1ec46f0e3cca002fdd8b8c708da576d57b38211
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
Run 52b60304-bc27-454b-8069-d0f0fa63b7d4; snapshot dff9be23fcfcbef38d163d0087290d5a2db00e16eea478129f1c72b3149cf9df; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory, not validated: split_capacity using MAT-ALLOY-B finishes in 17.5h meeting both due dates (36h/48h) vs allocate_substitute 35h (marginal for JOB-1001) at $3115 vs wait_replenishment 83h missing due dates at $0. Counterfactual: waiting misses deadlines; split is fastest but adds $3202.5 incremental cost. Assumptions: synthetic demo values only, illustrative cell costs not OEM quotes, substitute uses verified stock only, held lot remains on hold - requires operational verification.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 6d42284d-b4a4-4cbe-9f96-49ec9d139d9e; snapshot dff9be23fcfcbef38d163d0087290d5a2db00e16eea478129f1c72b3149cf9df; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only: allocate_substitute finishes in 35h for $3115 using verified substitute stock, meeting the 36h and 48h dues. Counterfactuals: wait_replenishment costs $0 but finishes in 83h and misses dues; split_capacity finishes in 17.5h but costs $3202.5, $87.5 more than needed. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, and substitute allocation uses only verified available stock while the held lot remains on hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run e24128d5-cbb7-48a9-85f7-2468ea8157bb; snapshot d985c55decb550b4e39f509160530041ca723c8600ef8e383d6eb6d9c9556142; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, unvalidated narrative: allocate_substitute covers 70 impacted units in 35h for $3115 incremental, versus wait_replenishment at 83h for $0; counterfactually waiting avoids the premium but adds 48h replenishment delay. split_capacity is infeasible because it requires at least two online compatible cells. Assumptions: all quantities are synthetic demo values; illustrative cell costs are not OEM quotes; substitute allocation uses only verified available stock; held MAT lot remains on hold; no supplier messaging.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> dff9be23fcfcbef38d163d0087290d5a2db00e16eea478129f1c72b3149cf9df
dff9be23fcfcbef38d163d0087290d5a2db00e16eea478129f1c72b3149cf9df -> d985c55decb550b4e39f509160530041ca723c8600ef8e383d6eb6d9c9556142

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.