<!-- live-demo:start -->
**Live demo:** [Open the recovery room](https://forgefront-factory-resilience.onrender.com)
<!-- live-demo:end -->

# The Meta Hackathon build — run the recovery room

Turn one disputed certificate into a recovery decision backed by sources, Meta investigation and calculated options.

## Run locally

Use Node 20+ and npm. From the repository root:

```sh
npm run check:providers --prefix hackathon
npm run demo --prefix hackathon
```

For live investigation, provision MUSE_API_KEY (or MODEL_API_KEY) and BASETEN_API_KEY through the parent environment. Pre-flight makes one nonce/identity request per route and prints GREEN/RED. Wonder and Baseten gate readiness. The optional backup reports RED without a request in the standard check; primary routes determine readiness. Select a GREEN primary route for the live presentation. Each failed route keeps its result; choose another route deliberately.

Open `http://127.0.0.1:8791` — the demo opens straight into the recovery room. Choose **Start guided recovery**. The demo uses a fresh private directory and key on every launch. HACKATHON_DEMO_PORT selects another port. Stop with Ctrl+C.

## Public recovery room on Render

The repository-root `render.yaml` selects the `submission` branch, uses `hackathon` as its root directory and starts `npm run serve:public` on Node 20. The service binds `0.0.0.0` using Render’s `PORT`. `GET /healthz` checks service health. A persistent disk mounted at `/var/data` supplies `HACKATHON_STATE_DIR=/var/data/forgefront`.

Provision `MUSE_API_KEY`, `BASETEN_API_KEY`, `HACKATHON_LEDGER_KEY` and `HACKATHON_ADMIN_TOKEN` through Render’s secret settings. The blueprint declares each with `sync: false`. Keep a stable ledger key with persistent state. Public launch opens the recovery room directly and removes the standby provider credential before app creation.

Render is the designed public host because the recovery room needs a long-lived Node process plus a persistent encrypted state disk. A Vercel serverless deploy is not a drop-in substitute for that shape.

Each visitor has a separate recovery workspace. Public API traffic allows 30 requests per minute per visitor; live investigation, connection checks and task drafts share 10 bounded operations per visitor per hour. Limit responses return 429 with Retry-After. The global allowance is 300 bounded live operations per UTC day, persisted in encrypted storage. At daily capacity the recovery continues using the offline Sample route. Public investigation polling waits five seconds between checks. Request bodies are limited to 64 KiB. Forwarded identity and HTTPS metadata are trusted only from the hosting proxy.

The live link is managed by `scripts/live-demo.mjs`. Change its `LIVE_DEMO_URL`, then run `node hackathon/scripts/live-demo.mjs --write` from the repository root to synchronize all three entry documents. `node hackathon/scripts/live-demo.mjs` checks alignment.

## The command center

A fixed header identifies Forgefront Systems. The stage rail opens **Incident**, **Investigate**, **Decide**, **Shock** and **Proof**, plus **Project board**. Each stage keeps its own focused content inside the workspace. **highlighted primary action** performs the current guided action and focuses the next required control. One-click recovery approval and The Britt authorization wall remain deliberate human actions. **Back** and completed rail steps review earlier states without repeating model calls or changing the ledger. A highlighted result and a short recap explain every completed action. Revisit any stage with the rail.

The opening story computes affected parts, production orders and due windows from the snapshot. **Start guided recovery** begins a fresh incident. The live story has ten steps; explicit Sample has nine. Both include The Britt task approval and revised-work review. Successful Sample results advance only the offline story. Switching back to a primary route restores the live-model requirements.

During inference, the status names the selected model, elapsed time, each bounded request and the remaining timeout. Read-only tool results add the number of source records read and feasible paths calculated. Final source matches, rejected claims and model analysis remain separately inspectable. The Proof stage compares the accepted completion time with replenishment and records the second shock, human acceptance and matching-head verification/export/checkpoint outcomes.

## Follow the recovery

1. **Understand:** use **highlighted primary action** to open source evidence. Compare the certificate's 120 pieces with receiving's 80 and inspect the two jobs demanding 70 units.
2. **Investigate:** select Spark Open on Baseten, press **Check selected route**, then **Investigate recovery**. Run Wonder on the unchanged snapshot. Inspect validated facts, model interpretation, read-only tools and observed latency.
3. **Decide:** compare wait, verified substitute and split-capacity plans. Review a feasible option. Choose the one-click **Approve** button, then **Authorize this decision**. **Recovery decision accepted** confirms the recorded decision.
4. **Challenge:** take CELL-MILL-2 offline. The earlier acceptance becomes invalid and split capacity becomes constrained. Investigate the changed snapshot and accept a remaining feasible option.
5. **Prove:** choose **Verify ledger**, export the encrypted packet with a separate passphrase and export the independent checkpoint. Retain the checkpoint in separate trusted storage. The guide reaches **Recovery story complete** after all three actions match the ledger head.

The route check is explicit: one request on the selected route, bounded to eight seconds, with nonce and returned-model matching. Status shows GREEN, RED or UNCHECKED; checks expire after fifteen minutes. A RED route names the reason and any recently checked GREEN alternatives. Selection remains yours. Every check records a model-call event. Auditors inspect/export; operator or admin permissions are required to call a model.

**Sample · offline walkthrough; no live AI** runs the complete decision workflow without a provider request. Select it deliberately for offline review. The live guide advances from successful Spark Open and Wonder results.

## Persistent operation

Provision HACKATHON_ADMIN_TOKEN, a stable high-entropy HACKATHON_LEDGER_KEY and HACKATHON_STATE_DIR pointing to a dedicated private directory. Start with `npm start --prefix hackathon` and open `http://127.0.0.1:8787`. Authenticate with the provisioned admin or named operator token. The environment template lists variable names; supply values through the process environment. The app uses zero runtime dependencies and needs no build step.

HACKATHON_OPERATORS_JSON accepts up to 32 named seats: id, role (operator or auditor) and distinct opaque token. Tokens are 12–256 characters. Admin alone resets; a named operator alone revokes; admin/operators investigate, review and confirm. Auditors read, verify and export. Restart invalidates sessions. Unexpired encrypted reviews resume for the original named identity within the original five-minute deadline.

Windows private state grants access to the current identity and SYSTEM; POSIX uses mode 0700. Keep the stable ledger key with the same state. Integrity or key failure blocks startup. Preserve failed state for inspection. The migration command verifies a legacy chain before copying to a new private destination specified by HACKATHON_MIGRATION_DESTINATION.

## Retain the proof

The primary export uses scrypt and AES-256-GCM. Use a unique 16–160 character passphrase with three distinct words or three character types and at least eight distinct characters. Store it separately. Advanced plaintext packet/report downloads require acknowledgement. Checkpoints contain integrity metadata.

To inspect a packet, securely provision FFR_EXPORT_PASSPHRASE and run `node hackathon/scripts/decrypt-export.mjs input.encrypted.json new-private-output.json`. The destination must be new. Verify a retained plaintext packet/checkpoint with `node hackathon/scripts/verify-checkpoint.mjs packet.json checkpoint.json`. The verifier checks the chain prefix against the independently retained head.

## Verify the presentation

```sh
npm test --prefix hackathon
npm run check:judge --prefix hackathon
npm run check:public-tree --prefix hackathon
npm run check:a11y --prefix hackathon
npm run smoke:browser --prefix hackathon -- --live --guided
npm run smoke:browser --prefix hackathon -- --live --guided --mobile
```

Browser checks use installed Chrome/Edge or CHROME_PATH. On Node 20 set NODE_OPTIONS=--experimental-websocket. The browser harness closes its server and browser in finally. The keyboard check uses explicit Sample and real keyboard events. The public-tree check runs the exact public files without provider credentials or the root package.

[Current evidence](evidence/README.md) · [Shot list](docs/DEMO_RUNBOOK.md) · [Control mapping](SECURITY_CONTROLS.md) · [Claim proof](docs/CLAIM_PROOF.md)

## Meta design director

Run `npm run design:review --prefix hackathon -- design/screens.json 44` from the repository root with primary keys provisioned privately. The screenshot manifest contains paths relative to hackathon/. Wonder receives actual PNG inputs; Baseten is the bounded structured-layout fallback. Reviews are saved under design/.

## Current verification evidence

Set `HACKATHON_EVIDENCE_RUN=run19` in the shell before provider, primary-guide or browser smoke commands to retain this run’s sanitized proof. Evidence destinations accept numbered run names only. Run `npm run smoke:guide` for Sample and `npm run smoke:guide:mock` for controlled live-route regression. The live guide repeats Spark Open on Baseten then Muse Wonder after the machine shock, before revised one-click authorization. The Britt task drafting uses Wonder with a bounded Baseten fallback; fallback never grants approval.

Inspect every proposed task with the numbered task selector before approval; arrow keys move between its named controls. Prior blocked tasks remain separately inspectable during re-planning. The separate export passphrase field unlocks after Verify ledger completes on the current head. Back and completed rail items retain read-only review.

## Current visual workspaces

The opening presents source comparison and affected orders at stage scale. On each The Britt step, select a stage task tile or numbered inspector control to inspect that complete task, then approve through the highlighted primary action. The second-shock preview shows the selected cell capacity before application. Proof blocks track the same current-ledger gates as Verify, Seal and Retain. [Current evidence](evidence/README.md) holds the exact screenshot inputs and original Wonder scores.

## Current layout verification

Use `HACKATHON_EVIDENCE_RUN=run21` in the shell environment for fresh checks. Run `node --experimental-websocket hackathon/scripts/primary-guide-smoke.mjs --mock-live --guided --geometry` from the repository root for every measured state at both desktop sizes. Run `npm run check:a11y --prefix hackathon` for the independent keyboard flow. Review the screenshot index in current evidence before recording. Design reviews require a new iteration number and refuse existing iterations.

## Current recovery controls

Use the large header tabs for Incident, Investigate, Decide, Shock, Project board and Proof. The compact guided row reviews completed steps without changing decisions. Check model connection verifies the selected provider; the highlighted stage action performs the investigation. Inspect proposed work using its scene cards or numbered task controls, then approve deliberately. Machine capacity remains above the proposed work.

## Full-shop floor and recording view

In the recovery room, choose **Explore the full shop** beside the factory legend. Choose a failure, then **Trigger failure**. Department cards show affected operation counts and every machine. Select a department to inspect machines; activate a machine to highlight its downstream dependency chain. Choose a recovery path to recompute time and cost. **Recording view** hides the controls for a clean capture; **Show controls** restores them. Escape returns to the recovery room.

The source fixture is `fixtures/job-shop.mjs`; calculations are in `public/plant-engine.mjs`. Generated plant fixtures and geometry tests exercise the larger navigation path. The guided recovery remains the camera path for authenticated Meta investigation, persisted human decisions and approved The Britt work.

## Prepare judge access for the final hosting switch

During building and recording keep `HACKATHON_DEMO_MODE=1`. For the final owner-controlled switch, set `HACKATHON_DEMO_MODE=0` and provision `HACKATHON_OPERATORS_JSON` in the hosting environment as an array of objects with `id`, `role: "operator"` and a private `token`. Provision one entry for each sponsor pool. Tokens use 12–256 characters; do not place their values in source. The screen says **Judge access code**. Demo-entry closes in this mode. The access tests use test-only values and reject an incorrect code. Publish the final codes only when the owner activates that switch.

## Current verification commands

```sh
npm test --prefix hackathon
npm test
npm run check:judge --prefix hackathon
npm run check:public-tree --prefix hackathon
npm run check:a11y --prefix hackathon
node hackathon/scripts/plant-cap-audit.mjs
node hackathon/scripts/primary-guide-smoke.mjs --geometry --mock-live --jpeg-evidence --lean-evidence
node hackathon/scripts/primary-guide-smoke.mjs --geometry --mock-live --live-proposals --jpeg-evidence --lean-evidence
```

Set `HACKATHON_EVIDENCE_RUN=run24` before captures. Browser tools choose an ephemeral port and close owned processes. Wonder can retry once before Baseten serves the same Meta family; actual identity and fallback use remain visible in the evidence. A model identity mismatch fails closed.

