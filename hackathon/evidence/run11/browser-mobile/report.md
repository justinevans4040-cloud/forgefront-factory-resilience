# Forgefront recovery evidence
PLAINTEXT EXPORT; SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 5894cf920977144d456b5eb1532e149c0c8f6d6b85d93c90298f6284f38a59bc
Decision: accepted
Named operator: local-admin
Review actor digest: dcad526feaa61852e4e426eb2f994ca63f9c37f9f317514bb088335545e1faa1
Confirmation actor digest: dcad526feaa61852e4e426eb2f994ca63f9c37f9f317514bb088335545e1faa1
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: b032e0c8-3388-4b9c-a5b9-f4995b7463c2
Ledger: hash-chained, tamper-evident
Verified head: 522e3f1963fdce94fbc6ce516a92dc711851ef6d4ca2bee9558618184501c562
Events: 22

## Deterministic options
wait_replenishment: feasible; finish 83 hours; incremental USD 0
Assumptions: Quantities use the current certificate, receiving and stock records.; Cell costs use the hourly rates in this snapshot.; Documented replenishment lead time 48 hours
Constraints: Held lot remains unavailable until replenishment posts
Sources: ev-cert-qty, ev-recv-qty
allocate_substitute: feasible; finish 35 hours; incremental USD 3115
Assumptions: Quantities use the current certificate, receiving and stock records.; Cell costs use the hourly rates in this snapshot.; Substitute allocation uses only verified available stock
Constraints: Held MAT lot remains on hold; No supplier messaging
Sources: ev-sub-stock, ev-recv-qty
split_capacity: infeasible; finish unavailable hours; incremental USD unavailable
Assumptions: Quantities use the current certificate, receiving and stock records.; Cell costs use the hourly rates in this snapshot.
Constraints: Offline cells excluded
Sources: ev-sub-stock

## Investigations
Run 8adce54e-f034-40cb-9631-4b61bf8ab8a5; snapshot c201db73070dc338e1defad82ebfeac66a5a7386ec6f17aaad5160091cc57143; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Certificate hold on lot ALLOY-A creates a 40-unit discrepancy between certified and received quantity, holding 70 units across two jobs. Allocate Substitute recovers using 70 units of verified substitute stock to complete production in 35 hours at $3,115 incremental cost, meeting the 36-hour and 48-hour due dates while the held lot remains on hold. Counterfactual: Wait for Replenishment avoids incremental cost but extends completion to 83 hours including 48-hour lead time and misses both dues; Split Capacity would finish in 17.5 hours across two cells for $3,202.50, saving 17.5 hours for an additional $87.50. Assumes quantities use current certificate, receiving and stock records, costs use current hourly rates, and substitute draw is limited to verified available stock with no supplier messaging.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 3d9597e9-7500-4c71-ac19-3ee149daa599; snapshot c201db73070dc338e1defad82ebfeac66a5a7386ec6f17aaad5160091cc57143; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Propose split capacity across two compatible cells using the verified substitute. The certificate shows 120 each while receiving posted 80 each, a 40-each gap, so the held primary material remains on hold and is not issued. The 70 impacted units are covered by 100 each of verified substitute stock, leaving 30 each unused. Splitting production finishes in 17.5 hours for $3,202.50, ahead of the earliest 36-hour due window. By comparison, using one cell with the substitute would finish in 35 hours for $3,115, saving only $87.50 while doubling elapsed time, and waiting for replenishment would add no incremental cost but would finish in 83 hours, beyond both due windows. This rests on current certificate, receiving and stock quantities, the provided hourly cell rates, use of verified substitute stock only, and even splitting of hours across compatible online cells. The human records the decision.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run b032e0c8-3388-4b9c-a5b9-f4995b7463c2; snapshot 5894cf920977144d456b5eb1532e149c0c8f6d6b85d93c90298f6284f38a59bc; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): Propose Allocate the Substitute: the certificate shows 120 each while receiving posted 80 each, leaving a 40-each discrepancy unresolved and the original alloy on hold. Verified substitute stock of 100 each covers the 70 units required across the two impacted jobs. This option finishes in 35 hours for $3,115 incremental cost, comprising $2,975 labor and a $140 material premium, within the 36- and 48-hour due windows. Counterfactual: Waiting for Replenishment adds no incremental cost but finishes in 83 hours after a 48-hour replenishment lead time plus 35 production hours, missing both due windows; Splitting Capacity is not feasible because it requires at least two online compatible cells and the second milling cell is unavailable. This comparison assumes quantities reflect the current certificate, receiving and stock records, cell costs use the provided hourly rates, and the substitute uses only verified available stock. The held lot remains on hold, supplier messaging is not included, and the human records the decision.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> c201db73070dc338e1defad82ebfeac66a5a7386ec6f17aaad5160091cc57143
c201db73070dc338e1defad82ebfeac66a5a7386ec6f17aaad5160091cc57143 -> 5894cf920977144d456b5eb1532e149c0c8f6d6b85d93c90298f6284f38a59bc

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.