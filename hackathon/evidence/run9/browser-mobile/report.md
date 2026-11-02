# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 65cbd57d11f3f930b611a44886feab8e8945bba5f4e82baea79593dad39af862
Decision: accepted
Named operator: local-admin
Review actor digest: e36218996d7019247f55b586bbaec5ebd7dbd9d1f07f95ee860ffe3b834fd038
Confirmation actor digest: e36218996d7019247f55b586bbaec5ebd7dbd9d1f07f95ee860ffe3b834fd038
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: 60633ef1-0c7f-4c92-90a8-f2576964b73a
Ledger: hash-chained, tamper-evident
Verified head: 9d98722d105aeb1795140cc1f4a460c5db97218acdd67d4e41312d94530977b3
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
Run 6321c75b-f0e1-4563-a8ba-b02bfb660171; snapshot de85488168f44c52a6247a2e356ee148683e4127b33677b3beb5bd0ce2e85d45; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory: recommend split_capacity using verified substitute MAT-ALLOY-B to meet earliest due (36h). Counterfactual: wait_replenishment =83h (48h replenishment +35h production) misses both dues despite $0 incremental cost; allocate_substitute =35h/$3115 meets dues with 1h margin on single cell; split_capacity =17.5h/$3202.5 halves time across two online cells for +$87.5 premium. All options assume synthetic demo quantities, illustrative costs not OEM quotes, and held MAT-ALLOY-A remains unavailable.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 791e3871-1153-4b7a-98df-fe3656dc0655; snapshot de85488168f44c52a6247a2e356ee148683e4127b33677b3beb5bd0ce2e85d45; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, not approval: allocate_substitute finishes 70 impacted units in 35h at $3115, versus wait_replenishment at 83h/$0 and split_capacity at 17.5h/$3202.50; the substitute is therefore lower-cost than split while far faster than waiting. Assumptions: all quantities are synthetic demo values; illustrative cell costs are not OEM quotes; substitute allocation uses only verified available stock; held MAT-ALLOY-A lot remains on hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 60633ef1-0c7f-4c92-90a8-f2576964b73a; snapshot 65cbd57d11f3f930b611a44886feab8e8945bba5f4e82baea79593dad39af862; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory recommendation: allocate_substitute finishes in 35h at $3115 incremental cost using 70 of 100 verified MAT-ALLOY-B, versus counterfactual wait_replenishment finishing in 83h at $0 but after due hours; split_capacity is infeasible as it requires at least two online compatible cells. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, and substitute allocation uses only verified available stock; held MAT-ALLOY-A remains on hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> de85488168f44c52a6247a2e356ee148683e4127b33677b3beb5bd0ce2e85d45
de85488168f44c52a6247a2e356ee148683e4127b33677b3beb5bd0ce2e85d45 -> 65cbd57d11f3f930b611a44886feab8e8945bba5f4e82baea79593dad39af862

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.