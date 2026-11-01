# Forgefront recovery evidence
PLAINTEXT EXPORT; Demo scenario data
Decision authority: human review and typed acceptance
Snapshot: 10dd18f701cc8e4f62922587e28abdcd306b618b63fb84ee89c094362cc9671a
Decision: accepted
Named operator: local-admin
Review actor digest: 9997e80357e4bad4f0a993dfaccc0cf7ad4b212e3963b5c57314905f1ff9e084
Confirmation actor digest: 9997e80357e4bad4f0a993dfaccc0cf7ad4b212e3963b5c57314905f1ff9e084
Resumed after restart: false
Plan digest: 5fda8ef60f389a53484a3630ed243a809056033b45194bd4c3b97148f206eeca
Accepted run: 32e881e5-17e7-4ba6-8be6-394b3c6265d1
Ledger: hash-chained, tamper-evident
Verified head: 7b1b775e815a1f3d634a4e4cdbe28cc2eccd866d6e2873def9a609077a3c0adf
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
Run ffe7b472-e44f-4f88-9144-07e3b0f6deaf; snapshot fa473402c0aab4362919cf46619bcc79e7154d45fdafbc0fa9c2b444701fdb59; LIVE META; MODEL_STOP
Models: meta-models/muse-spark-open, meta-models/muse-spark-open, meta-models/muse-spark-open
Validated source claims: 3; rejected: 0
Model analysis (human review; source validation listed separately): Certificate hold reflects certified 120 each versus 80 each received, leaving 70 units impacted across two jobs (due 36h and 48h). Allocate Substitute is selected: it draws 70 units from verified MAT-ALLOY-B stock of 100 and completes in 35 hours on CELL-MILL-1 at $3,115 incremental cost ($2,975 labor + $140 material premium), meeting both due dates with margin. Counterfactual: Wait for Replenishment costs $0 but finishes at 83 hours including 48-hour replenishment lead time, missing both dues; Split Capacity finishes fastest at 17.5 hours across two cells at $3,202.50, $87.50 more for 17.5 hours saved. Analysis assumes quantities use current certificate, receiving and stock records, cell costs use hourly rates in this snapshot, and allocation uses only verified available stock. Constrained by held MAT-ALLOY-A remaining on hold with no supplier messaging. Human records decision; no release or approval.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 71ea6e1e-221b-4e0b-a48d-58ffdb57294c; snapshot fa473402c0aab4362919cf46619bcc79e7154d45fdafbc0fa9c2b444701fdb59; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Model analysis (human review; source validation listed separately): Propose Split Capacity using the verified substitute for the 70 units across the two impacted jobs. Drawing 70 of the 100 units on hand and splitting 35 production hours evenly across two compatible online cells finishes in 17.5 hours for $3,202.50. Compared with Allocate Substitute on one cell at $3,115 in 35 hours, the $87.50 increase halves completion time and avoids leaving only one hour before the earliest 36-hour due time. Wait for Replenishment avoids incremental cost but needs 83 hours, including 48 hours for replenishment plus 35 production hours, missing the 36- and 48-hour due times. This assumes quantities reflect the current certificate, receiving, and stock records, cell costs use current hourly rates, and only verified substitute stock is used. The held alloy remains unissued while the 120-versus-80 quantity discrepancy remains unresolved.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each
Run 32e881e5-17e7-4ba6-8be6-394b3c6265d1; snapshot 10dd18f701cc8e4f62922587e28abdcd306b618b63fb84ee89c094362cc9671a; LIVE META; MODEL_STOP
Models: muse-wonder-1.0, muse-wonder-1.0, muse-wonder-1.0
Validated source claims: 3; rejected: 0
Model analysis (human review; source validation listed separately): The certificate records 120 each (ev-cert-qty) while receiving posted 80 each (ev-recv-qty); the 40-each discrepancy remains unexplained and the held alloy stays on hold. Allocate Substitute uses 70 of the 100 each of verified substitute stock (ev-sub-stock) to cover both impacted jobs, finishing in 35 hours at $3,115 incremental cost ($2,975 labor plus $140 material premium), ahead of the 36- and 48-hour due windows. By contrast, Wait for Replenishment adds no incremental cost but finishes in 83 hours after a 48-hour replenishment lead plus 35 production hours, missing both windows. Split Capacity is not feasible because only one online compatible cell remains while the second mill cell is unavailable. This comparison rests on current certificate, receiving and stock quantities, current hourly cell rates, and using only verified available substitute stock.
Validated: ev-cert-qty; doc-cert-441/rec-cert-line-3/quantity; 120 each
Validated: ev-recv-qty; doc-recv-882/rec-recv-posted/quantity; 80 each
Validated: ev-sub-stock; doc-inv-snap/rec-inv-alloy-b/onHand; 100 each

## Snapshot transitions
36522abb373c9d54e26b10fcbc3bc9768d24009b4ca32b1e6955753f2e99e1b2 -> fa473402c0aab4362919cf46619bcc79e7154d45fdafbc0fa9c2b444701fdb59
fa473402c0aab4362919cf46619bcc79e7154d45fdafbc0fa9c2b444701fdb59 -> 10dd18f701cc8e4f62922587e28abdcd306b618b63fb84ee89c094362cc9671a

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the checkpoint independently and protect this plaintext report. Exact source validations and provider-returned identities are recorded above.