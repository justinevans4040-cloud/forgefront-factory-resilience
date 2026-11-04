# Judge walkthrough

[Open the live app](https://forgefront-factory-resilience.onrender.com) · [Watch the demo (2:55)](https://youtu.be/CZSc0KaQ-Uc) · [Project overview](../../README.md)

ForgeFront Factory Resilience helps a shop understand a material hold before it spreads into idle machines. The Britt connects source evidence and explains calculated recovery options; a human chooses and authorizes the response.

## What to inspect

1. **Incident:** compare the certificate's 100 pieces with the receiving count of 3. The 97-piece discrepancy holds Alloy A. Two jobs need 60 and 40 pieces; their due windows are 36 and 48 hours.
2. **Findings:** start a live investigation with Muse Spark Open on Baseten. Inspect the source records, read-only tools and validated quantities. Choose **Live** for Meta call evidence or **Sample** for the complete repeatable workflow.
3. **Decision:** compare feasibility, completion estimate, added cost and stock coverage. The default substitute option is 40 hours / $4,500; split capacity is 26 hours / $4,570. Review the assumptions and authorize the selected option deliberately.
4. **The Britt plan:** inspect server-calculated work allocations and source-linked task proposals. Drafting and approving tasks are separate actions. A model cannot authorize work.
5. **Disrupt:** inspect the outage before applying it. Losing Cell Mill 2 leaves 40 usable hours against 50 required. The old decision cannot authorize the changed snapshot; a fresh investigation must report the shortfall rather than invent a feasible recovery.
6. **Evidence:** inspect the document, record, line and quantity behind the decision. Verify and export through the available evidence controls; keep any independent checkpoint separately.
7. **Shop:** inspect all 45 machines across seven departments. Ten are offline; nineteen are starved downstream. A starved machine can be mechanically ready yet idle because upstream parts do not arrive. This is a dependency consequence, not nineteen additional mechanical failures.
8. **Settings:** inspect the session, plant snapshot and configured model definitions. Restoring the opening incident replaces the current visitor workspace.

## What drives The Britt and the math

| Responsibility | Implementation |
| --- | --- |
| Evidence investigation | Meta Muse Spark Open on Baseten, bounded read-only tools and exact source-claim validation |
| Supported reasoning/task route | Meta Muse Wonder through the Meta Model API for provisioned accounts |
| Standby inference | Spark Open on Fireworks, isolated from normal public-demo traffic |
| Quantity, compatibility, stock, time and cost | Deterministic server engine, separate from model prose |
| Decision and task approval | Human actions bound to the current snapshot and workflow |
| Accountability | Encrypted, hash-chained, tamper-evident records and export/checkpoint support |

The 100 pieces require 50 production hours at 0.5 hour per piece. Cell Mill 1 has 40 usable hours and Cell Mill 2 has 24. The split estimate divides processing across compatible capacity. Due windows remain visible beside the calculated material, time, cost and machine-capacity decision.

## Competition build and production path

The competition build demonstrates the complete decision cycle on a populated factory scenario: evidence, Meta investigation, deterministic recovery math, human authorization and disruption-driven replanning. The full-shop dependency view shows the production cascade; the source-bound two-cell snapshot calculates the recovery. The approved decision package is ready for the production connector layer that serves scheduling, inventory, suppliers and machine controls. Current regression results are organized in the [evidence index](../evidence/README.md).

Public access supports 10 model operations per visitor per hour and 300 per UTC day. Provider status and the active Live or Sample route remain visible throughout the session.

[Run locally](../RUN_GUIDE.md) · [Model integration](META_MODEL_USAGE.md) · [Claim proof](CLAIM_PROOF.md) · [Security](SECURITY_MODEL.md)
