# The Meta Hackathon build — independent planning oracle

The planning evaluation uses an independent schema and authored demo inputs. Time is elapsed hours; costs are planning credits. [Runtime alignment](../docs/FIXTURE_RUNTIME_ALIGNMENT.md) maps this scheduling contract to the recovery room's throughput model.

One piece per finished unit; yield 1; indivisible jobs; cells run in parallel. Every assigned job incurs setup once. Within each cell, sort by due hour then ID. Due times measure lateness; horizon 16 is a hard completion bound. No overtime or preemption. Busy cost includes setup; waiting is free. Stock must be verified, compatible and available before processing starts.

Affected units = 60 + 40 + 20 = 120 across three held-lot jobs. Held stock contributes zero usable pieces. Substitute 120 exactly covers demand. A baseline = 3 * 0.5 + 120 * 0.05 = 7.5 busy hours; cost = 7.5 * 100 = 750. Substitute premium = 120 * 2 = 240.

Wait: A job durations = 3.5, 2.5, 1.5. Start at 8; completions 11.5, 14, 15.5. All miss due hours 6, 8, 10. Finish 15.5 <= 16 is feasible despite lateness. Incremental cost = 750 - 750 = 0.

Substitute: start at 0; completions 3.5, 6, 7.5; none late. Incremental cost = 750 - 750 + 240 = 240.

Split: enumerate nonempty proper A assignments; B receives the remainder. B duration per job = 0.5 + units * 0.075.

| A jobs | A hours | B hours | Makespan |
| --- | ---: | ---: | ---: |
| J1 | 3.5 | 5.5 | 5.5 |
| J2 | 2.5 | 7 | 7 |
| J3 | 1.5 | 8.5 | 8.5 |
| J1,J2 | 6 | 2 | 6 |
| J1,J3 | 5 | 3.5 | 5 |
| J2,J3 | 4 | 5 | 5 |

Two assignments tie at 5 hours. A:J1,J3 costs 5 * 100 + 3.5 * 120 = 920; A:J2,J3 costs 4 * 100 + 5 * 120 = 1000. The cost tie-break selects A:J1,J3 and B:J2. Incremental = 920 - 750 + 240 = 410. J1 completes 3.5, J3 5, J2 3.5; none late. Split saves 7.5 - 5 = 2.5 hours over substitute for 410 - 240 = 170 extra. The tradeoff is explicit: wait is cheapest, split fastest.

Shock: B starts no earlier than 24, beyond horizon 16, so every required-two-cell split fails. Wait and substitute stay 15.5/0 and 7.5/240. Fastest feasible option changes to substitute, increasing completion by 2.5 hours. Old acceptance and envelopes must invalidate even if some numbers stay unchanged.

Stock 119 creates a one-piece shortfall; never rescue it with held stock. Replenishment 17 plus 7.5 = 24.5 > 16. Together these remove all options. Apply adversarial cases independently. Reject malformed quantities rather than coercing to zero. Numerical tolerance 1e-9; display rounding cannot change feasibility.

Pass-two independent enumeration records every assignment, busy cost and completion in expected-outputs.json. The minimum B duration is J3: 0.5 + 20 * 0.075 = 2 hours. With outage availability 24, the earliest possible nonempty B completion is 26 > 16. Stock-short demand minus stock is 120 - 119 = 1. Replenishment at 17 completes 24.5. These hand-derived expectations verify the planning evaluator. The runtime oracle verifies the recovery room against its own material and capacity contract.
