# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 9e9fe3555a9298ac50487e98de59de6a7e666d38cc28daf5dcd58a7afe07b043
Decision: accepted
Named operator: local-admin
Review actor digest: 71521e4c4a720f04cfd1a0ce50512cb7603e1421c2ed08b83f4e3cdbdf82cc95
Confirmation actor digest: 71521e4c4a720f04cfd1a0ce50512cb7603e1421c2ed08b83f4e3cdbdf82cc95
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: 395772a8-6c58-4642-bf2e-6cf512600e7d
Ledger: hash-chained, tamper-evident
Verified head: cce7834912230a832d076ebd25f1376ff8b1296096c90d6fbbdfc06d15ace578
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
Run 33bcaaa6-de79-442b-a35d-61ac8eb63d23; snapshot 97aa25f4a34576226beacd101976db88cce7148413627af2ddaedfee820326f2; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory (unvalidated, synthetic demo): allocate verified substitute MAT-ALLOY-B via split_capacity. Counterfactual: wait_replenishment finish 83h (48h replenishment +35h production) misses dues 36h/48h despite $0 incremental cost and held lot unavailable; allocate_substitute finish 35h cost $3115 in CELL-MILL-1 meets dues using 70 of 100 each stock; split_capacity finish 17.5h cost $3202.50 split 17.5h CELL-MILL-1 ($1487.5) +17.5h CELL-MILL-2 ($1575) fastest, uses 70/100 each, held MAT-ALLOY-A not issued. Assumptions: all quantities synthetic demo values, illustrative cell costs not OEM quotes, production split across compatible online cells, substitute uses only verified available stock.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 252d2545-5fad-44bb-a17c-c1655a83305f; snapshot 97aa25f4a34576226beacd101976db88cce7148413627af2ddaedfee820326f2; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only: allocate_substitute finishes in 35 hours for $3115, meeting the 36- and 48-hour dues, whereas wait_replenishment costs $0 but finishes in 83 hours and split_capacity finishes in 17.5 hours but costs $3202.50. If the substitute were unavailable, the timely low-cost recovery would not be possible. Assumptions: synthetic demo quantities, illustrative non-OEM cell costs, and substitute allocation limited to verified available stock; held material remains on hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 395772a8-6c58-4642-bf2e-6cf512600e7d; snapshot 9e9fe3555a9298ac50487e98de59de6a7e666d38cc28daf5dcd58a7afe07b043; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory: allocate_substitute finishes in 35h at $3115 incremental, using 70 of 100 verified MAT-ALLOY-B units, versus wait_replenishment finishing in 83h at $0. Counterfactual: waiting avoids the premium but is much later than the 35h option. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, substitute allocation uses only verified available stock, held MAT lot remains on hold, and no supplier messaging.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> 97aa25f4a34576226beacd101976db88cce7148413627af2ddaedfee820326f2
97aa25f4a34576226beacd101976db88cce7148413627af2ddaedfee820326f2 -> 9e9fe3555a9298ac50487e98de59de6a7e666d38cc28daf5dcd58a7afe07b043

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.