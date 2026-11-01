# Planning fixtures and runtime calculation boundary

The planning fixture evaluates indivisible job scheduling. The recovery room calculates divisible production throughput from its own immutable source snapshot. Each has an explicit input contract and an independent arithmetic oracle. Product code reads src/domain/scenario.mjs and src/domain/engine.mjs; fixtures/expected-outputs.json supplies the planning evaluation. Tests unit/runtime-oracle.test.mjs and engine.test.mjs verify runtime results.

| Dimension | Independent planning fixture | Runtime engine |
| --- | --- | --- |
| Input contract | fixtureSchema independent-evaluation-v1; id, pieces, units | validated snapshot; materialId, available, unitsRequired, hoursPerUnit |
| Incident and demand | grade discrepancy; three jobs 60 + 40 + 20 = 120 pieces | certificate quantity discrepancy 120 vs receiving 80; two held-lot jobs 40 + 30 = 70 units |
| Processing | indivisible jobs, per-job setup 0.5 h; A cycle 0.05 h/piece and B 0.075 | divisible aggregate processing hours; 0.5 h/unit in default affected jobs; no setup term |
| Scheduling | due-hour then ID queues; hard horizon 16 h; job-assignment enumeration | cost-first capacity fill for substitute; capped water-fill for parallel split; no queue or hard horizon feasibility rule |
| Availability | earliest start; shock B earliest start 24 h | availableHours is usable capacity; online false excludes a cell |
| Due time | used to calculate late jobs | reported on jobs but not used to compute lateness or feasibility |
| Money | planning credits; busy cost minus original-material baseline plus premium | scenario USD; substitute/split labor plus nonnegative material premium; wait incremental cost explicitly zero |
| Replenishment | earliest start 8 h, then 7.5 h processing | documented lead 48 h plus total 35 h processing; aggregate compatible capacity checked |
| Baseline results | wait 15.5 h / 0 credits; substitute 7.5 h / 240; split 5 h / 410 | wait 83 h / USD 0; substitute 35 h / USD 3115; split 17.5 h / USD 3202.50 |
| Shock results | nonempty B assignment misses hard horizon; split infeasible | CELL-MILL-2 offline removes second compatible cell; split infeasible, substitute stays 35 h |
| Precision | independent arithmetic tolerance 1e-9 | per-step two-decimal rounding |
| Validation evidence | fixtures/CALCULATION_NOTES.md and fixtures/expected-outputs.json are hand-derived expectations | tests/unit/runtime-oracle.test.mjs checks default arithmetic; engine.test.mjs covers changed quantities, capacity and stock |

Present runtime values in the recovery room, model comparison and evidence packets. The planning oracle evaluates its own setup, job-queue and horizon rules. Runtime capacity is usable hours; planning availability is an earliest start. Costs use their respective scenario units. These explicit contracts keep the displayed recovery calculations reproducible as quantities, stock and cell availability change.
