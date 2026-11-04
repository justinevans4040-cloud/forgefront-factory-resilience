<!-- live-demo:start -->
**Live demo:** [Open the recovery room](https://forgefront-factory-resilience.onrender.com)
<!-- live-demo:end -->

# Run ForgeFront Factory Resilience

For a product-first review, use the [judge walkthrough](docs/JUDGES_GUIDE.md). The current interface has Incident, Findings, Decision, The Britt plan, Disrupt, Evidence, Shop and Settings.

## Local launch

Use supported Node 24 LTS and npm. From the repository root:

```sh
npm run demo --prefix hackathon
```

Open `http://127.0.0.1:8791`. This launcher creates an isolated private state directory and temporary session credentials. `HACKATHON_DEMO_PORT` selects another port. Stop with Ctrl+C. There are zero npm runtime dependencies and no build step.

Provision `BASETEN_API_KEY` privately for live Muse Spark Open. The supported Muse Wonder route uses `MUSE_API_KEY` (or `MODEL_API_KEY`) and activates for accounts with provider access. Keep every credential server-side. **Sample** runs the complete workflow without a provider call, while the Live route reports its exact connection and model status.

```sh
npm run check:providers --prefix hackathon
```

The provider check sends a bounded nonce/identity request on each primary route. It can fail when a provider is unavailable; report that outcome honestly. The Fireworks standby is not called by the standard check.

## Recovery workflow

Start investigation from Incident, inspect the returned source evidence in Findings, compare options in Decision and authorize the selected recovery. The initial records are 100 certificate pieces, 3 received, and two jobs demanding 100 pieces. The engine computes 50 work-hours, a 40-hour substitute option and a 26-hour split option.

The Britt plan separates server-calculated allocations, a proposed task draft and human task approval. Applying a Cell Mill 2 outage changes the snapshot, invalidates old consent and leaves a 10-hour shortfall. A new investigation must use the changed evidence. The current default has no feasible complete recovery after that outage; successful rejection is the expected result.

Evidence controls inspect actual registry records and workflow verification/export results. Export passphrases stay separate from retained packets; independent checkpoints belong in separate trusted storage. Inspect model identity and source-validation results rather than treating a dropdown or configured key as live proof.

## Public hosting

The root `render.yaml` targets `submission`, uses `hackathon` as its root, and starts the `serve:public` package script on Node 24. `/healthz` is the health endpoint. Provision stable `HACKATHON_LEDGER_KEY`, `HACKATHON_ADMIN_TOKEN`, primary model keys and `HACKATHON_STATE_DIR=/var/data/forgefront` through the host secret settings. A persistent disk keeps encrypted state. Losing the ledger key prevents recovery of that state.

The public launcher opens a visitor-isolated demo workspace and removes the standby Fireworks credential. Persistent operator mode instead uses `npm start --prefix hackathon` at `http://127.0.0.1:8787`, environment-provisioned admin/operator/auditor tokens and a dedicated private directory. The public demonstration seat is not production authorization.

Public traffic is bounded to 30 API requests per visitor per minute, 10 live operations per visitor per hour and 300 globally per UTC day. These controls remain enabled. Quota responses return 429 with Retry-After. The configured daily-cap behavior may offer a labeled offline Sample path; it is never live-model evidence.

## Verification

```sh
npm test --prefix hackathon
npm run check:judge --prefix hackathon
npm run check:public-tree --prefix hackathon
npm run smoke:browser --prefix hackathon
```

Browser verification uses a local installed Chrome/Edge or `CHROME_PATH`. Node 24 provides the WebSocket client used by browser verification. Current tests target the `public/ui/kit.mjs` interface. Tests and captures for the retired guided interface are preserved as historical material and do not prove the current UI.

The three entry documents' live URL is managed by `hackathon/scripts/live-demo.mjs`. Run it without arguments to check alignment; `--write` synchronizes the configured URL. [Security controls](SECURITY_CONTROLS.md) explain consent, role separation, quotas, encrypted storage and checkpoint limitations.
