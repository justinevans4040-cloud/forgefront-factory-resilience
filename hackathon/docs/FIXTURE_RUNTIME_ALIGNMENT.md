# Planning fixtures and runtime calculations

The independent planning fixture and the recovery-room runtime solve different declared problems. Expected fixture answers never drive production calculations.

| Dimension | Independent planning fixture | Current recovery-room runtime |
| --- | --- | --- |
| Incident / demand | Separate 120-piece scheduling case | Certificate 100, receiving 3; jobs 60 + 40 = 100 pieces |
| Work model | Indivisible jobs, setup, queue order and hard horizon | Divisible processing at 0.5 hour/piece: 50 work-hours; no setup term |
| Available mills | Fixture-specific earliest starts | Cell Mill 1: 40 usable hours; Cell Mill 2: 24; material compatibility enforced |
| Due windows | Used by fixture lateness rules | Job due windows 36h / 48h are displayed, not a lateness guarantee |
| Verified substitute | Fixture-specific inventory | 100 pieces of Alloy B; stock is conserved across all assignments |
| Substitute result | 7.5h / 240 planning credits | 40h / $4,500: 40h on Cell 1 + 10h on Cell 2, $200 material premium |
| Split result | 5h / 410 planning credits | 26h / $4,570: 26h on Cell 1 + 24h on Cell 2, same $200 premium |
| Replenishment | 15.5h / 0 incremental credits | Constrained: Alloy A-compatible capacity cannot cover all 50 work-hours; no zero-hour completion claim |
| Cell Mill 2 outage | Fixture-specific horizon constraint | 40 usable hours remain for 50 needed; no feasible complete recovery, 10h shortfall |
| Units | Planning credits | Scenario USD, pieces and hours |

The substitute estimate is elapsed processing under a cost-first allocation; the split estimate is parallel processing under compatible capacity bounds. Neither is a full factory dispatch schedule. Server-produced job portions must sum to the same material and machine totals; the browser must not invent a contradictory whole-job allocation.

[Runtime oracle](../tests/unit/runtime-oracle.test.mjs) and [engine tests](../tests/unit/engine.test.mjs) independently derive the runtime arithmetic and vary demand, stock, compatibility and capacity. [Calculation notes](../fixtures/CALCULATION_NOTES.md) document the separate planning oracle.
