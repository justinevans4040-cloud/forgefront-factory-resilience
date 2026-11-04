<!-- live-demo:start -->
**Live demo:** [Open the recovery room](https://forgefront-factory-resilience.onrender.com)
<!-- live-demo:end -->

**Demo video · 2:55:** [Play the demo](https://justinevans4040-cloud.github.io/forgefront-factory-resilience/) · [Video details and download](https://github.com/justinevans4040-cloud/forgefront-factory-resilience/releases/tag/demo-video-v14)

[![Play Factory Resilience demo — 2:55](assets/showcase/current/demo-video.jpg)](https://justinevans4040-cloud.github.io/forgefront-factory-resilience/)


<p align="center"><img src="assets/brand/forgefront-systems-logo.png" width="320" alt="ForgeFront Systems" /></p>

# ForgeFront Factory Resilience

**The shop floor is in trouble. The Britt finds the way forward. You make the call.**

Only **3 of 100 pieces arrived**. **10 of 45 machines are offline**, with **19 more starved downstream**. Two orders need 100 pieces, and the first is due in 36 hours. A shortage at receiving has become a factory emergency. Starved downstream means a machine can be ready to run but idle because the upstream parts it needs have not arrived.

ForgeFront Factory Resilience connects the material hold, source records, machine capacity and waiting jobs in one recovery room. **The Britt**, powered by **Meta Muse models**, investigates the discrepancy, explains calculated recovery choices and turns your authorized decision into a plan you can inspect.

## The emergency across the shop

![Shop: 45 machines across seven departments, with 10 offline and 19 starved downstream](assets/showcase/current/shop.png)

**Shop.** The 45-machine reference floor illustrates how a held lot starves downstream work across Saw, CNC mills, CNC lathes, Heat treat, Inspection, Finishing and Assembly. Filter the held path, online machines and offline machines. The recovery comparison uses a separate, source-bound two-cell snapshot; its current capacity stays visible beside the reference floor.

## From incident to recovery

### Incident

![Incident: certificate lists 100 pieces, receiving counted 3, and two orders are waiting on the held lot](assets/showcase/current/incident.png)

**Find the discrepancy.** The supplier certificate lists 100 pieces; receiving counted 3. Inspect the 97-piece gap, follow the held material into two waiting orders, and preview recovery paths before starting The Britt's investigation.

### Findings

![Findings: a 97-piece discrepancy, 100 pieces of verified Alloy B stock, and two waiting jobs traced to their cells](assets/showcase/current/findings.png)

**Check the evidence.** The Britt brings certificate, receiving and substitute-stock records into one snapshot. Open the supporting record behind a quantity, station or job, then compare the calculated recovery paths.

### Decision

![Decision: compare replenishment, verified substitute and split capacity, with split capacity selected for authorization](assets/showcase/current/decision.png)

**Choose the tradeoff.** Compare feasibility, time, cost and coverage. In this snapshot, verified substitute finishes in 40 hours for $4,500; splitting available capacity finishes in 26 hours for $4,570. Replenishment cannot cover the waiting orders with the available capacity.

### Authorize

![Authorize: review split capacity, 26-hour finish, $4,570 added cost and 100-piece coverage against the plant snapshot](assets/showcase/current/authorize.png)

**Make the call.** Review the selected path, waiting orders, held lot and exact snapshot before recording your authorization. The Britt builds the recovery plan from that choice.

### The Britt plan

![The Britt plan: inspect job assignments, compatible cell loads and recovery totals](assets/showcase/current/the-britt-plan.png)

**See how the work fits.** Inspect the replanned assignments, material, due times and remaining cell capacity. The screen keeps the selected recovery, 50 hours of planned work, available substitute stock and source records beside the job assignments.

### Disrupt

![Disrupt: preview Cell Mill 2 dropping from 24 hours to zero, leaving 40 hours available against 50 hours of work](assets/showcase/current/disrupt.png)

**Test the next failure.** Preview Cell Mill 2 going offline. With 50 hours needed and 40 hours remaining elsewhere, the screen exposes a 10-hour shortfall and offers a fresh investigation of the changed capacity.

### Evidence

![Evidence: compare certificate, receiving and verified stock, inspect certificate line L3, and check all three retained excerpts](assets/showcase/current/evidence.png)

**Keep the reasoning with the decision.** Inspect the source document, record and line behind each quantity. Check the packet against the analysis snapshot, review the waiting jobs and assumptions, and export a copy of the evidence.

### Settings

![Settings: connected Meta models, five available definitions, the signed-in session and a 45-machine plant snapshot](assets/showcase/current/settings.png)

**Inspect the connection.** Check model availability, the session and the plant snapshot. Review what restoring the opening incident will replace, or return to Incident with the current work intact.

## Powered by Meta models

**Muse Spark Open on Baseten** powers The Britt's investigation of factory evidence through read-only calls. **Muse Wonder through the Meta Model API** is supported for recovery reasoning and task drafting. **Fireworks** is the standby Spark Open host, excluded from normal public-demo traffic. The recovery engine computes stock, capacity, feasibility, hours and cost from the current snapshot. The models explain the options; your authorization records the decision.

## Why ForgeFront

A material hold spreads through connected work. ForgeFront makes that chain visible, puts source evidence beside the numbers, and carries the chosen recovery into job assignments. When capacity changes, you can see the shortfall and investigate again with the new facts.

[Open the recovery room](https://forgefront-factory-resilience.onrender.com)  [Run it yourself](hackathon/RUN_GUIDE.md)  [Meta model integration](hackathon/docs/META_MODEL_USAGE.md)

Built by **ForgeFront Systems**.

## For judges

[Judge walkthrough](hackathon/docs/JUDGES_GUIDE.md) · [Architecture and model roles](hackathon/docs/ARCHITECTURE.md) · [Calculation boundaries](hackathon/docs/FIXTURE_RUNTIME_ALIGNMENT.md) · [Security controls](hackathon/SECURITY_CONTROLS.md) · [Verification evidence](hackathon/evidence/README.md)

The factory records are synthetic demonstration data. Recorded authorization is advisory: `operationalRelease` remains `false`; the app does not send production commands to real machines. Due windows are shown for review; the throughput comparison is not a certified production schedule. Source code is available under the [MIT license](LICENSE).
