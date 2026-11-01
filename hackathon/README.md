<!-- live-demo:start -->
**Live demo:** [Open the recovery room](https://forgefront-factory-resilience.onrender.com)
<!-- live-demo:end -->

# Forgefront Factory Resilience — the Meta Hackathon build

**Turn a disputed material certificate into an evidence-backed recovery decision.** Production planners, quality teams and shop operators inspect source records, compare feasible recovery paths and record a deliberate human decision. Muse Spark Open investigates with read-only tools; Muse Wonder explains recovery tradeoffs. A second machine outage tests whether the decision still holds.

## Run locally

Use Node 20 or later, npm and a current browser. No install, dependencies or build step. From the repository root:

```sh
npm run demo --prefix hackathon
```

The launch command prints the recovery-room link. Open it to enter the recovery room. Choose **Start guided recovery**. The command binds to loopback and starts fresh disposable private state. Stop with **Ctrl+C**.

Privately provision `MUSE_API_KEY` (or `MODEL_API_KEY`) and `BASETEN_API_KEY` in the parent environment for live calls. No key is entered in the browser. Without keys, deliberately choose **Sample · offline walkthrough; no live AI** to walk the full local workflow.

## 3-minute demo path

Use the full-screen command center and **highlighted primary action** to open and focus the current step. Each result is highlighted and explained; the Proof stage summarizes the computed recovery. The guide advances on actual application state.

1. Inspect the source certificate discrepancy and receiving records.
2. Run Spark Open on Baseten, then Wonder on the same snapshot. Inspect source-validated facts, read-only traces and model narrative.
3. Compare **Wait for replenishment**, **Use verified substitute** and **Split available capacity**. Review a feasible option and type its exact acceptance phrase.
4. Take **CELL-MILL-2** offline. Observe invalidation, investigate the changed snapshot and accept a revised feasible plan.
5. Verify the hash-chained, tamper-evident ledger. Export an encrypted packet using a separate passphrase; retain its checkpoint independently.

[Shot-by-shot demo](docs/DEMO_RUNBOOK.md) · [Latest evidence](evidence/README.md) · [Run guide](RUN_GUIDE.md).

## Designed with Muse Wonder

Muse Wonder directs the visual design of the Meta Hackathon build: real full-screen captures go to Meta for a component specification and scored step critiques. The [saved design reviews](design/design-direction.json) guide the black, emerald and brushed-silver command center. The factory map connects source quantities, affected orders, accepted allocations and sealed events to the live recovery state. Validated Spark findings pass into Wonder’s tradeoff analysis, and the accepted investigation passes into Britt’s task plan. The second shock repeats that evidence-to-decision sequence.

**Britt 4.0, Forgefront’s sovereign agent**, plans recovery work with Meta models and read-only investigation tools. It drafts source-linked tasks from an accepted decision, remembers the recovery in encrypted session-scoped state, and waits for your approval. The recovery project board tracks owners, dependencies, due windows and blockers; a second shock visibly blocks affected work for a fresh human review. Provider keys stay on the server; encrypted recovery state stays in private storage. Inference uses the selected Meta route.

## How Meta models are used

Muse Spark Open on Baseten investigates through bounded read-only source and calculation tools. Muse Wonder on the Meta Model API explains recovery choices and counterfactuals through the tested JSON-envelope protocol. Deterministic code owns quantities, feasibility and hours; exact structured source claims are validated against the server-built registry. Details: [Meta model usage](docs/META_MODEL_USAGE.md).

Before filming, make one real nonce/identity request per primary provider:

```sh
npm run check:providers --prefix hackathon
```

Each route reports GREEN or RED without showing keys. Wonder and Baseten gate readiness. The standard check sends requests only to the two primary routes. Missing keys, wrong identities, HTTP errors and deadlines remain RED; the command exits nonzero when a primary route fails. It starts no server and performs no automatic retry.

## Reproduce checks

```sh
npm test --prefix hackathon
npm run check:judge --prefix hackathon
npm run check:public-tree --prefix hackathon
npm run check:a11y --prefix hackathon
npm run smoke:browser --prefix hackathon -- --live --guided
npm run smoke:browser --prefix hackathon -- --live --guided --mobile
```

Browser checks need installed Chrome/Edge or `CHROME_PATH`. On Node 20 enable WebSocket with `NODE_OPTIONS=--experimental-websocket`. The offline accessibility command uses explicit Sample and real keyboard events without provider access. Smoke tools close their own server and browser. Public-tree verification copies the exact public set without credentials or the root package and runs tests plus link checks.

## Security

Session/CSRF and Host/Origin guards, durable encrypted quotas and consent, separated roles, single-use acceptance, encrypted verified forward ledger recovery and passphrase-encrypted export remain enforced. [Security controls](SECURITY_CONTROLS.md) maps each control to code and tests.

Built by **Forgefront Systems**. [Contributions](HACKATHON_CONTRIBUTIONS.md) · [Plan coverage](docs/PLAN_COVERAGE.md) · [Release gates](docs/RELEASE_GATES.md) · [Submission checklist](docs/SUBMISSION_CHECKLIST.md) · [License](../LICENSE)
