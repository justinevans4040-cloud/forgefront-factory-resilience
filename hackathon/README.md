# Forgefront Factory Resilience — the Meta Hackathon build

**Turn a disputed material certificate into an evidence-backed recovery decision.** Production planners, quality teams and shop operators inspect source records, compare feasible recovery paths and record a deliberate human decision. Muse Spark Open investigates with read-only tools; Muse Wonder explains recovery tradeoffs. A second machine outage tests whether the decision still holds.

## Run it in 60 seconds

Use Node 20 or later, npm and a current browser. No install, dependencies or build step. From the repository root:

```sh
npm run demo --prefix hackathon
```

Open **http://127.0.0.1:8791** — the demo opens straight into the recovery room. Choose **Start guided recovery**. The command binds to loopback and starts fresh disposable private state. Stop with **Ctrl+C**.

Privately provision `MUSE_API_KEY` (or `MODEL_API_KEY`) and `BASETEN_API_KEY` in the parent environment for live calls. No key is entered in the browser. Without keys, deliberately choose **Sample · offline walkthrough; no live AI** to walk the full local workflow.

## 3-minute demo path

Use **Show next action** to focus the current step. The guide advances on actual application state.

1. Inspect the source certificate discrepancy and receiving records.
2. Run Spark Open on Baseten, then Wonder on the same snapshot. Inspect source-validated facts, read-only traces and model narrative.
3. Compare **Wait for replenishment**, **Use verified substitute** and **Split available capacity**. Review a feasible option and type its exact acceptance phrase.
4. Take **CELL-MILL-2** offline. Observe invalidation, investigate the changed snapshot and accept a revised feasible plan.
5. Verify the hash-chained, tamper-evident ledger. Export an encrypted packet using a separate passphrase; retain its checkpoint independently.

[Shot-by-shot demo](docs/DEMO_RUNBOOK.md) · [Latest evidence](evidence/README.md) · [Run guide](RUN_GUIDE.md).

## How Meta models are used

Muse Spark Open on Baseten investigates through bounded read-only source and calculation tools. Muse Wonder on the Meta Model API explains recovery choices and counterfactuals through the tested JSON-envelope protocol. Deterministic code owns quantities, feasibility and hours; exact structured source claims are validated against the server-built registry. Details: [Meta model usage](docs/META_MODEL_USAGE.md).

Before filming, make one real nonce/identity request per primary provider:

```sh
npm run check:providers --prefix hackathon
```

Each route reports GREEN or RED without showing keys. Wonder and Baseten gate readiness. An optional Fireworks backup route reports its own light and never fails the overall check. Missing keys, wrong identities, HTTP errors and deadlines remain RED; the command exits nonzero when a primary route fails. It starts no server and performs no automatic retry.

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
