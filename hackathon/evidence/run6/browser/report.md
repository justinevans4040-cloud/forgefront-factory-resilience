# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: d9a42367b44819362937bdf03f0eef64a3dd5b712efeb7ac9a1fe4aa6e925d5e
Decision: accepted
Named operator: local-admin
Review actor digest: aa7ec5e59b308b9618e0439440198be6573f2af7a264990b6220969bdecfac81
Confirmation actor digest: aa7ec5e59b308b9618e0439440198be6573f2af7a264990b6220969bdecfac81
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: 23fac0c1-81b5-48a2-97fa-32ab1aeb1c92
Ledger: hash-chained, tamper-evident
Verified head: 27164615566fb6d21e22add61e451af0808f9e6e61327927c109fb6f504e22be
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
Run b4499d08-c744-4008-9ce5-497cf55b34fa; snapshot bb090afd1d48ccf3c9b1c69db5d59c84cc45b387bb97fb2e3d9820243007a318; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory: split_capacity is fastest feasible using verified MAT-ALLOY-B to complete 70 units in 17.5h vs allocate_substitute 35h (risky vs 36h due) vs wait_replenishment 83h (late, includes 48h replenishment lead). Counterfactual: wait saves cost ($0) but misses dues; allocate meets dues at $3115; split adds $87.5 for schedule buffer. Assumptions: all quantities synthetic demo values, illustrative cell costs not OEM quotes, split production across compatible online cells, held MAT-ALLOY-A remains unavailable.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 398db99a-98c7-404d-8534-52a69dec6428; snapshot bb090afd1d48ccf3c9b1c69db5d59c84cc45b387bb97fb2e3d9820243007a318; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, not an approval or release: split_capacity finishes in 17.5h for $3202.5 using substitute stock, versus allocate_substitute at 35h for $3115 and wait_replenishment at 83h for $0, which would exceed the 36h/48h job dues. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, production hours are split across compatible online cells, and the held primary material is not issued.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 23fac0c1-81b5-48a2-97fa-32ab1aeb1c92; snapshot d9a42367b44819362937bdf03f0eef64a3dd5b712efeb7ac9a1fe4aa6e925d5e; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, unvalidated: allocate_substitute is feasible, finishing in 35h at $3115 incremental cost, versus counterfactual wait_replenishment which is feasible but finishes in 83h at $0 and would miss the 36h/48h job dues; split_capacity is infeasible as it requires at least two online compatible cells. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, substitute allocation uses only verified available stock, and replenishment lead time is 48h.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> bb090afd1d48ccf3c9b1c69db5d59c84cc45b387bb97fb2e3d9820243007a318
bb090afd1d48ccf3c9b1c69db5d59c84cc45b387bb97fb2e3d9820243007a318 -> d9a42367b44819362937bdf03f0eef64a3dd5b712efeb7ac9a1fe4aa6e925d5e

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.