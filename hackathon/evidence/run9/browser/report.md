# ForgeFront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 7b494638fb770ba3fdb425c4f440b1798816b2b399599ab2875997eda65f25a9
Decision: accepted
Named operator: local-admin
Review actor digest: cfa3a68e7490b43002694590b1175141957fe3d322a7a5794126a0fa07491ff4
Confirmation actor digest: cfa3a68e7490b43002694590b1175141957fe3d322a7a5794126a0fa07491ff4
Resumed after restart: false
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: a953b98f-2080-433f-b686-d591935a3e18
Ledger: hash-chained, tamper-evident
Verified head: 3a2fd459ccfea692c80b21e9d7d5102682b1cce6e11b70c51d013940f688e105
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
Run 12572e7d-ed10-4301-b026-e69e2142eef0; snapshot 42227488dbc328e063a1269e8774dbc57089917817098e28b1eea9628b99d5de; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Certificate hold blocks MAT-ALLOY-A (cert 120 vs recv 80). Wait option finishes 83h (48h replenishment +35h production) missing 36h/48h dues at $0. Allocate substitute meets dues in 35h using MAT-ALLOY-B stock for $3,115 ($2,975 labor + $140 premium). Split capacity fastest at 17.5h but higher cost $3,202.50. Recommended allocate_substitute as lowest-cost feasible meeting dues. Assumptions per snapshot: synthetic demo values, illustrative cell costs not OEM quotes, substitute allocation uses only verified available stock.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 6d13569e-69dc-49d5-8637-f51ec3b3f258; snapshot 42227488dbc328e063a1269e8774dbc57089917817098e28b1eea9628b99d5de; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only, unvalidated: split_capacity finishes in 17.5h at $3202.5, versus allocate_substitute at 35h/$3115 (only $87.5 cheaper but twice the duration) and wait_replenishment at 83h/$0 but beyond the 36h/48h due hours. Split uses verified substitute stock of 100 each for 70 impacted units. Assumptions: all quantities are synthetic demo values; illustrative cell costs are not OEM quotes; production hours split across compatible online cells; held primary material not issued.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run a953b98f-2080-433f-b686-d591935a3e18; snapshot 7b494638fb770ba3fdb425c4f440b1798816b2b399599ab2875997eda65f25a9; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Advisory only: allocate_substitute finishes in 35h at $3115 incremental cost using 70 each of verified MAT-ALLOY-B stock, versus wait_replenishment counterfactual finishing in 83h at $0 after 48h replenishment plus 35h production; split_capacity is infeasible because it requires at least two online compatible cells. Assumptions: all quantities are synthetic demo values, illustrative cell costs are not OEM quotes, and substitute allocation uses only verified available stock with the held MAT-ALLOY-A lot remaining on hold.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> 42227488dbc328e063a1269e8774dbc57089917817098e28b1eea9628b99d5de
42227488dbc328e063a1269e8774dbc57089917817098e28b1eea9628b99d5de -> 7b494638fb770ba3fdb425c4f440b1798816b2b399599ab2875997eda65f25a9

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.