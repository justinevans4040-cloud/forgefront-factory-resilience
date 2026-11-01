# ForgeFront recovery evidence
SYNTHETIC DATA; ILLUSTRATIVE COSTS; ADVISORY ONLY
Operational release: false
Snapshot: 4a6433152877dab1ba6ca45bf67d2bfa7a45d5df22f14c33eb3789bdc2ed2e7f
Decision: accepted
Named operator: local-admin
Actor digest: 8567a4b228530e315b9bd4a430a00c129c423059902b21358557e526157857b9
Plan digest: 8a95f51ac7f15308ae33afddbc0eef357cb283b53498611340fc49b5e573a419
Accepted run: 6edd1618-a0bc-4456-b4a7-a7fdcfdaa087
Ledger: hash-chained, tamper-evident
Verified head: 37e94631c2672440abe3f06403070b542bffc277ae0e9e801dbd4409dc73c374
Events: 10

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
Run 4989052e-bdbf-4dcb-b331-25c25f5bf68b; snapshot 2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): SAMPLE — OFFLINE; NO LIVE AI Deterministic offline template (no Meta model call). Preferred feasible option: wait_replenishment (finishHours=83, incrementalCostUsd=0). Citations must come from the evidence registry; this template does not invent quantities.
Run 6edd1618-a0bc-4456-b4a7-a7fdcfdaa087; snapshot 4a6433152877dab1ba6ca45bf67d2bfa7a45d5df22f14c33eb3789bdc2ed2e7f; SAMPLE - OFFLINE; NO LIVE AI; SAMPLE_COMPLETE
Models: sample-offline-template
Validated source claims: 0; rejected: 0
Narrative (UNVALIDATED ADVISORY TEXT): SAMPLE — OFFLINE; NO LIVE AI Deterministic offline template (no Meta model call). Preferred feasible option: wait_replenishment (finishHours=83, incrementalCostUsd=0). Citations must come from the evidence registry; this template does not invent quantities.

## Snapshot transitions
2d248439c28d7248a0548f1c410f8e10ae1da215ce5b3ec83e2f8880361342af -> 4a6433152877dab1ba6ca45bf67d2bfa7a45d5df22f14c33eb3789bdc2ed2e7f

## Exact source registry
ev-cert-qty: doc-cert-441/rec-cert-line-3/quantity: Certificate line L3 quantity=120 each for lot ALLOY-A.
ev-recv-qty: doc-recv-882/rec-recv-posted/quantity: Receiving post R1 quantity=80 each for lot ALLOY-A; hold applied.
ev-sub-stock: doc-inv-snap/rec-inv-alloy-b/onHand: Verified substitute MAT-ALLOY-B on-hand=100 each, not held.

Retain the separate checkpoint independently. Exports are plaintext intentionally; store them securely. Provider identity is self-reported. No production or compliance certification.