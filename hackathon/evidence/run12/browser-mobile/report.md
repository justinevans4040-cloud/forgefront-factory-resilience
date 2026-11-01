# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: da7e8f1b7cbc063a90232a8b3f150ebfc4c2baebd8b2bb96e5b2a8ca59ecc9f1
Decision: accepted
Named operator: local-admin
Review actor digest: d8ed11e0ed268abdd9262879751074bf98b9a3cd3d04a0812207dd9db1e3bb9f
Confirmation actor digest: d8ed11e0ed268abdd9262879751074bf98b9a3cd3d04a0812207dd9db1e3bb9f
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: d82f7b3a-2801-47d5-80a7-e7df49283bb9
Ledger: hash-chained, tamper-evident
Verified head: bd81b2ff6726ba84ae24cea81238cb9b13c2518bc507d90a91c0c21a4e2eb82b
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
Run c8050ef8-5b1c-47ca-8f2a-f3be7136b5f5; snapshot 5289a9e515c30a5525ddbef21acee707c4695a055377419d1bf88f32856337ad; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Model analysis (human review; source validation listed separately): Selected Allocate Substitute completes the 70 impacted units across two jobs in 35 hours, meeting the 36 and 48 hour due windows, by drawing 70 units from 100 units of verified substitute on hand. Incremental cost is $3,115 ($2,975 labor + $140 material premium) and the held alloy lot remains on hold with no supplier messaging. Counterfactual: Wait for Replenishment finishes in 83 hours (48 hour lead time + 35 hour production) at $0 incremental cost but misses due dates while the held lot remains unavailable; Split Capacity finishes faster in 17.5 hours by splitting production across compatible online cells but at a slightly higher $3,202.50 cost. Assessment assumes quantities use current certificate, receiving and stock records, cell costs use snapshot hourly rates, and substitute use is limited to verified available stock. Human records the decision; no material released.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 752c0779-ce0d-48fe-bc32-7ca6dcfcbf79; snapshot 5289a9e515c30a5525ddbef21acee707c4695a055377419d1bf88f32856337ad; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Model analysis (human review; source validation listed separately): The held alloy shows a 40-unit gap between the certificate quantity of 120 each and the receiving quantity of 80 each, leaving 70 units across two jobs uncovered while the held lot remains unavailable. Allocate Substitute uses 70 units from the verified 100 each of substitute alloy in stock, leaving 30 each, and completes the work in 35 hours for $3,115, within the 36-hour earliest due time. This assumes quantities reflect the current certificate, receiving, and stock records, cell costs use current hourly rates, and substitute use is limited to verified available stock. If Wait for Replenishment were chosen instead, incremental cost would be $0 but completion would extend to 83 hours and miss the due times. If Split Capacity were chosen instead, completion would fall to 17.5 hours but cost would rise to $3,202.50, adding $87.50 without a due-time need. The certificate-versus-receiving discrepancy remains unresolved and the held material is not used.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run d82f7b3a-2801-47d5-80a7-e7df49283bb9; snapshot da7e8f1b7cbc063a90232a8b3f150ebfc4c2baebd8b2bb96e5b2a8ca59ecc9f1; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Model analysis (human review; source validation listed separately): The certificate shows 120 each (ev-cert-qty) while receiving posted 80 each and held the lot (ev-recv-qty), leaving the 40-each gap unresolved. Propose allocating the substitute: verified stock is 100 each (ev-sub-stock), enough for the 70 units across both impacted jobs, using 35 hours on the available milling cell to finish in 35 hours at $3,115 incremental cost ($2,975 labor plus $140 material premium). If instead waiting for replenishment, finish would slip to 83 hours at no incremental cost, missing the 36- and 48-hour dues. Splitting across cells is unavailable because a second compatible cell is offline. This assumes quantities follow the current certificate, receiving and stock records, cell costs follow the snapshot hourly rates, and substitute use draws only on verified available stock; the held lot stays held and no supplier messaging is included.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> 5289a9e515c30a5525ddbef21acee707c4695a055377419d1bf88f32856337ad
5289a9e515c30a5525ddbef21acee707c4695a055377419d1bf88f32856337ad -> da7e8f1b7cbc063a90232a8b3f150ebfc4c2baebd8b2bb96e5b2a8ca59ecc9f1

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.