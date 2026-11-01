# The Meta Hackathon build — run the recovery room

Turn one disputed certificate into a recovery decision backed by sources, Meta investigation and calculated options.

## Start in 60 seconds

Use Node 20+ and npm. From the repository root:

```sh
npm run check:providers --prefix hackathon
npm run demo --prefix hackathon
```

For live investigation, provision MUSE_API_KEY (or MODEL_API_KEY) and BASETEN_API_KEY through the parent environment. Pre-flight makes one nonce/identity request per route and prints GREEN/RED. Wonder and Baseten gate readiness. The optional backup reports RED without a request in the standard check; primary routes determine readiness. Select a GREEN primary route for the live presentation. Each failed route keeps its result; choose another route deliberately.

Open **http://127.0.0.1:8791** — the demo opens straight into the recovery room. Choose **Start guided recovery**. The demo uses a fresh private directory and key on every launch. HACKATHON_DEMO_PORT selects another port. Stop with Ctrl+C.

## The command center

A fixed header identifies Forgefront Systems. The stage rail opens **Incident**, **Investigate**, **Decide**, **Shock** and **Proof**, plus **Project board**. Each stage keeps its own focused content inside the workspace. **highlighted primary action** performs the current guided action and focuses the next required control. Typed recovery acceptance and Britt approval remain deliberate human actions. **Back** and completed rail steps review earlier states without repeating model calls or changing the ledger. A highlighted result and a short recap explain every completed action. Revisit any stage with the rail.

The opening story computes affected parts, production orders and due windows from the snapshot. **Start guided recovery** begins a fresh incident. The live story has ten steps; explicit Sample has nine. Both include Britt task approval and revised-work review. Successful Sample results advance only the offline story. Switching back to a primary route restores the live-model requirements.

During inference, the status names the selected model, elapsed time, each bounded request and the remaining timeout. Read-only tool results add the number of source records read and feasible paths calculated. Final source matches, rejected claims and model analysis remain separately inspectable. The Proof stage compares the accepted completion time with replenishment and records the second shock, human acceptance and matching-head verification/export/checkpoint outcomes.

## Follow the recovery

1. **Understand:** use **highlighted primary action** to open source evidence. Compare the certificate's 120 pieces with receiving's 80 and inspect the two jobs demanding 70 units.
2. **Investigate:** select Spark Open on Baseten, press **Check selected route**, then **Investigate recovery**. Run Wonder on the unchanged snapshot. Inspect validated facts, model interpretation, read-only tools and observed latency.
3. **Decide:** compare wait, verified substitute and split-capacity plans. Review a feasible option. Type the exact displayed APPROVE phrase and choose **Accept recovery decision**. **Recovery decision accepted** confirms the recorded decision.
4. **Challenge:** take CELL-MILL-2 offline. The earlier acceptance becomes invalid and split capacity becomes constrained. Investigate the changed snapshot and accept a remaining feasible option.
5. **Prove:** choose **Verify ledger**, export the encrypted packet with a separate passphrase and export the independent checkpoint. Retain the checkpoint in separate trusted storage. The guide reaches **Recovery story complete** after all three actions match the ledger head.

The route check is explicit: one request on the selected route, bounded to eight seconds, with nonce and returned-model matching. Status shows GREEN, RED or UNCHECKED; checks expire after fifteen minutes. A RED route names the reason and any recently checked GREEN alternatives. Selection remains yours. Every check records a model-call event. Auditors inspect/export; operator or admin permissions are required to call a model.

**Sample · offline walkthrough; no live AI** runs the complete decision workflow without a provider request. Select it deliberately for offline review. The live guide advances from successful Spark Open and Wonder results.

## Persistent operation

Provision HACKATHON_ADMIN_TOKEN, a stable high-entropy HACKATHON_LEDGER_KEY and HACKATHON_STATE_DIR pointing to a dedicated private directory. Start with `npm start --prefix hackathon` and open http://127.0.0.1:8787. Authenticate with the provisioned admin or named operator token. The environment template lists variable names; supply values through the process environment. The app uses zero runtime dependencies and needs no build step.

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

Run `npm run design:review --prefix hackathon -- design/screens.json 3` from the repository root with primary keys provisioned privately. The screenshot manifest contains paths relative to hackathon/. Wonder receives actual PNG inputs; Baseten is the bounded structured-layout fallback. Reviews are saved under design/.

## Current verification evidence

Set `HACKATHON_EVIDENCE_RUN=run14` in the shell before provider, primary-guide or browser smoke commands to retain this run’s sanitized proof. Evidence destinations accept numbered run names only. Run `npm run smoke:guide` for Sample and `npm run smoke:guide:mock` for controlled live-route regression. The live guide repeats Spark Open on Baseten then Muse Wonder after the machine shock, before revised typed acceptance. Britt task drafting uses Wonder with a bounded Baseten fallback; fallback never grants approval.
