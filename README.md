# ForgeFront Factory Resilience

A local synthetic factory disruption and recovery demonstrator by Justin Evans / ForgeFront Systems. It traces material-certificate discrepancies to scheduled jobs, compares constrained recovery plans, and records operator review. It combines a deterministic engine, optional model explanations, project planning calculations and a Command Center bridge.

This is an engineering demonstration, not a manufacturing release system. All factory data, costs, schedules and scenarios are synthetic or illustrative. Boeing, Lockheed Martin, Airbus, Haas, Spirit and other company names are illustrative references only: no affiliation, endorsement, customer relationship or OEM specification claim.

**Competition status: preparation only; eligibility is not established.** Imported R18 functionality is pre-event foundation work. Read [PROVENANCE.md](PROVENANCE.md) before recording or submitting a demo.

## Run and test

Use Node.js 24 (used for this release check) and npm. There are no declared npm dependencies.

```sh
npm install
npm start
# Open http://127.0.0.1:4173
```

In a second terminal:

```sh
npm test
npm run check
```

The server binds to loopback; `PORT` changes its port. Run from this directory. Runtime data and ledger secrets are generated locally and ignored by Git. Never publish them. Environment files are excluded; set configuration in the server process environment.

`npm run smoke:browser` launches a supported local Chrome/Edge for the full walkthrough and creates temporary state. A skipped smoke test is not verification. Consult the publish report for checks actually performed.

## Muse Spark / Meta Model API

`src/model-adapter.mjs` implements a configurable chat-completions path, bounded read-only tool calls and structured JSON output. Server-built evidence and claim checks constrain the displayed brief. Raw model prose is quarantined from the normal brief. The model cannot approve plans or set operational release.

Without credentials the app uses a labeled fixture/sample explanation, not a live Meta result. For authenticated use, set `MODEL_API_KEY`, `MODEL_API_BASE` (provider-approved base without `/chat/completions`) and `MODEL_NAME` in the server environment. `MODEL_PROVIDER=muse-spark` selects that adapter; `META_BRIEF_MODE=sample` forces sample mode. An optional Ollama adapter also exists.

The code's default endpoint and model ID are implementation assumptions, not independently verified Meta specifications. Confirm them against your authorized account. `npm run verify-live-model` is the separate authenticated check. No live API success is claimed for this release.

## Architecture

Browser (`index.html`, `src/app.mjs`) → loopback Node server (`server.mjs`) → deterministic engine and PM calculators → optional model adapter and claim screening → operator consent, mission events, Kanban and local audit storage.

- Engine, scenario and machine-routing modules calculate impact and recovery plans.
- `src/pm/` implements CPM, EVM, WSJF and Kanban calculations.
- Claim-checker and structured brief/advisory modules validate evidence and restrict rendering.
- Consent and security modules provide session-bound review, confirmation, nonce and request controls.
- Audit modules store hash-chained, HMAC-anchored, tamper-evident records.
- `src/program-bridge.mjs` and `vendor/command-center-v3/` provide the synthetic Command Center integration and pre-event reference code.

## Security model and limits

The implementation includes session and CSRF checks, Host/Origin validation, rate limiting, expiring two-step consent, single-use nonces, idempotency controls and a content security policy. These controls are not production certification. Keep credentials server-side and obtain a separate deployment and identity review before exposing the server publicly.

The ledger is tamper-evident, not tamper-proof. An attacker controlling local storage and all signing/anchor secrets can alter the local evidence set. Independently retained export anchors provide an additional comparison point. Use synthetic documents only; exported or quarantined model text may contain untrusted input.

## Provenance and rights

Read [PROVENANCE.md](PROVENANCE.md), the historical [derivation table](docs/PROVENANCE.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The existing proprietary [LICENSE](LICENSE) is preserved; this is not an MIT release. Vendored code and artwork require supporting rights evidence before submission.

## Demo video

Placeholder: add a public video URL after the eligible October 26–November 4, 2026 contribution scope is evidenced. Clearly identify original event work and pre-event foundation. Pre-event demo materials do not prove event-period development.
