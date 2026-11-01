# ForgeFront recovery evidence
SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 36545453c54a80846b6d0ac0b42f7e324daa3597d3258dd6fe90244564e1fcb9
Decision: accepted
Named operator: local-admin
Review actor digest: 47419af74e6f5698fc4a3fc361d6ee0a713b8d7a5f97c6bc88b17c2cdf2cdcf3
Confirmation actor digest: 47419af74e6f5698fc4a3fc361d6ee0a713b8d7a5f97c6bc88b17c2cdf2cdcf3
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: 43028ebe-1240-486b-a333-c88e77775499
Ledger: hash-chained, tamper-evident
Verified head: a077ddec670a0462f315bb6b4aa2323a2b15c81e1e977fc3aefdc4ce24d98b31
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
Run 8fd6d1e6-ba39-4dec-a2c4-a2b81854412d; snapshot fc733383bd0a4cef9d9c325553547e146bd5d85ffb0527b466d5e881f4ba4b98; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory recommendation only (unvalidated). Certificate hold MAT-ALLOY-A: cert 120 vs receiving 80 held. 70 units impacted (JOB-1001 40u/due 36h, JOB-1002 30u/due 48h). Counterfactual comparison: wait_replenishment feasible but finishes 83h (48h replenishment +35h production) missing both due dates despite $0 incremental cost; allocate_substitute feasible finishes 35h using 70u MAT-ALLOY-B within verified 100 on-hand at $3115; split_capacity feasible finishes 17.5h split across CELL-MILL-1/2 at $3202.5. Recommend split_capacity as fastest margin to due dates using substitute stock, held lot remains on hold. Assumptions: All quantities are synthetic demo values, Illustrative cell costs are not OEM quotes, Production hours split across compatible online cells, Substitute allocation uses only verified available stock.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run f472d464-3b50-4d00-b071-ef8ddea12c79; snapshot fc733383bd0a4cef9d9c325553547e146bd5d85ffb0527b466d5e881f4ba4b98; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, not approval: allocate_substitute finishes in 35h at $3115 incremental, within the 36h/48h due windows, versus wait_replenishment at 83h/$0 which would miss dues, and split_capacity at 17.5h/$3202.50 which is faster but $87.50 more. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, and substitute allocation uses only verified available stock while the held lot remains on hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 43028ebe-1240-486b-a333-c88e77775499; snapshot 36545453c54a80846b6d0ac0b42f7e324daa3597d3258dd6fe90244564e1fcb9; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory: allocate_substitute finishes in 35h for $3115 incremental, covering 70 impacted units from 100 verified substitute on-hand; counterfactually, wait_replenishment costs $0 but finishes in 83h, and split_capacity is infeasible. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, and substitute allocation uses only verified available stock.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> fc733383bd0a4cef9d9c325553547e146bd5d85ffb0527b466d5e881f4ba4b98
fc733383bd0a4cef9d9c325553547e146bd5d85ffb0527b466d5e881f4ba4b98 -> 36545453c54a80846b6d0ac0b42f7e324daa3597d3258dd6fe90244564e1fcb9

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.