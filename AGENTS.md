# AGENTS.md — ForgeFront Factory Resilience (Izzy lane)

Instructions for any AI agent working in this repository. The canonical rule file is
`.cursor/rules/build-standards.mdc` (alwaysApply); this file mirrors it for agents that read AGENTS.md.

## Justin's rules (follow exactly)

- Full effort, A through Z.
- Every feature must be dynamic and genuinely functional, computed from real state — not hardcoded,
  and no generic code that only passes an A-to-B test.
- Fix issues with real capability, never by rewording or reducing scope. Rewording only for things that
  cannot exist yet (live Muse Spark key, S24 test) — and build the full live path anyway.
- This is a Meta hackathon entry judged by top AI researchers; it must be top tier.
- Codex builds a separate parallel version; this agent owns this one. Do not touch the other build.
- **Athere spelling:** the product name is always spelled Athere (A-T-H-E-R-E), as in Athere Mesh.
  Any other spelling (Aether, Athere Mesh, Ather, etc.) is a misspelling of Athere, not a different
  product; correct it in anything you write.
- **Verify before stating:** do not guess or pattern-match. Check evidence first (read the file, run
  the command, check git/GitHub, test the endpoint) before stating any fact, status, location, or that
  something is done/working/missing. Say where each fact came from. If uncertain, say what is verified
  and what is not. If blocked, say BLOCKED and name the exact gap.

## Standing rules

- Code stays private — never push to a public repo.
- Muse Spark is explain-only; `operationalRelease` is always `false`.
- Evidence-tagged claims (`[evidence:<id>]`, `[evidence:pm:…]`), checked against the server-built registry.
- Synthetic / illustrative / Sample-mode labeling everywhere it applies; ledger wording is
  "hash-chained, tamper-evident", never "tamper-proof".
- Security model: session + CSRF, Host/Origin allowlist, rate limits (429 + Retry-After) on every API
  route, two-step consent sealed in a consent envelope (plan-parameter hash, TTL <= 15 min, persisted
  single-use nonce), HMAC-anchored ledger with on-demand + periodic verification, typed mission-chain
  events with idempotency keys on approvals and Kanban moves, deterministic-first answers with
  provenance (engine -> cache -> Muse Spark, escalation reason ledgered), CSP
  `script-src 'self'`, zero runtime dependencies, no `node:*` imports in browser code.
- Done means: `npm test` all green **and** `node --experimental-websocket tools/browser-smoke.mjs`
  (Node 20) passes the full demo with zero console errors, including the Prove-it panel (5/5) and a
  complete mission chain. Every fix ships with a test and matching docs.

## Layout

- `server.mjs` — HTTP API (session, consent review/confirm/revoke, meta-brief, pdf-intake, PM, Kanban, ledger).
- `src/engine.mjs`, `src/scenario.mjs`, `src/machine-routing.mjs` — deterministic scenario engine.
- `src/pm/*` — CPM, EVM, WSJF, measured Little's Law, Kanban (PMP Mastery port).
- `src/brief-context.mjs`, `src/model-adapter.mjs`, `src/claim-checker.mjs` — Muse Spark tool-calling brief + claim checker.
- `src/consent-gate.mjs`, `src/audit-ledger*.mjs`, `src/security/*` — consent, ledger, security.
- `src/pdf-text.mjs`, `src/pdf-intake.mjs` — PDF text-layer parser and intake.
- `src/resolution-ladder.mjs` — engine → cache → Muse Spark answers with provenance.
- `src/arbitration.mjs` — Britt Enterprise ConflictResolver port (shock contention, AI vs engine).
- `src/mission.mjs`, `src/security/idempotency.mjs`, `src/security/nonce-store.mjs` — mission chain, idempotency, consent nonces.
- `src/prove-it.mjs`, `tools/network-off.mjs`, `tools/engine-offline-check.mjs` — live judge checks.
- `tests/*.test.mjs` — `npm test`; `tools/browser-smoke.mjs` — full-demo browser smoke.
