# Provenance — parallel build derivations

This document records **conceptual sources** for re-implemented pieces. No secrets, browser profiles, cookies, or Tailnet hostnames were copied from any repository.

| Capability in this repo | Inspired by (read-only survey) | Notes |
|-------------------------|--------------------------------|-------|
| PDF cert intake stage machine (`FLAGGED` / text extract) | CertFlow v1.0 (`cert_processor.py`, Drive May 2026) | Node port: dependency-free PDF text-layer parser (FlateDecode, ObjStm, ToUnicode) + deterministic parser authority |
| Claim checker (`[evidence:…]` per sentence) | `wake-engine-v6` Tier Zero claim validation | Re-implemented and extended in `src/claim-checker.mjs` (token/spelled-number, entity and commitment checks; server-built registry) |
| Epistemic unknown / false / true + next actions | `athere-mesh` `epistemic-state.js` (MIT) | Re-implemented in `src/epistemic.mjs` |
| Consent token + `APPROVE <plan>` phrase | `wakeforged` WakeGate + PRAXIS `confirmOwnerApproval` | Re-implemented as two-step review/confirm in `src/consent-gate.mjs` |
| Hash-chained audit ledger | `wakeforged` `audit_ledger.mjs` | Re-implemented in `src/audit-ledger.mjs` + HMAC keying and head anchor in `src/audit-ledger-persist.mjs` |
| Model adapter (content-only) + providers | `athere-mesh` `model-adapter.js` | `src/model-adapter.mjs` — muse-spark / llama / fixture |
| Output screen (no model release) | Athere Sentinel / PRAXIS advisory boundary | `src/output-screen.mjs` |
| Prompt injection quarantine in supplier docs | Survey §2 #6 + adversarial eval guidance | `src/prompt-defense.mjs` |
| Conflict arbitration (weighted claims → MERGED / RESOLVED / ESCALATED / UNRESOLVED_CONFLICT) | **Britt Enterprise v4.0.0** (`the_britt/arbitration.py` `ConflictResolver`, Justin Evans IP; read from Justin's local S24 evidence copy) | Logic re-ported to dependency-free JS in `src/arbitration.mjs`; the four Python unit cases are reproduced in `tests/round8-capabilities.test.mjs`. Persistence (Postgres) not copied — decisions are recorded in the audit ledger instead |
| Consent envelope, deterministic-first resolution ladder, Prove-it checks, mission chain with typed events + idempotency keys | **Athere Mesh v4 / v4.1 design** (Justin Evans) | Design ideas implemented from scratch for this scenario in `src/consent-gate.mjs`, `src/resolution-ladder.mjs`, `src/prove-it.mjs`, `src/mission.mjs`, `src/security/*`; no Athere Mesh source copied |
| CPM / EVM / WSJF / Kanban / Little's Law PM layer | **PMP Mastery** (`justinevans4040-cloud/wakeforged`, Justin Evans IP) — `CpmCalculatorService`, `EvmCalculatorService`, `WsjfCalculatorService`, `KanbanService`, `LittlesLawService` | Study/exam UI **not** copied. Logic re-ported in `src/pm/*.mjs` (Node ESM, no dependencies) |

**CertFlow zip SHA:** inspected in cloud agent environment only; not committed. Use Drive file id `1Pgu4Crn1PqLey59AfEOoOJdPBxEL4v_L` for owner records.

**Pre-event boundary:** CertFlow (May 2026) and GitHub assets listed in `IP_SURVEY.md` predate Oct 26, 2026 hackathon start — disclose in submission provenance statement.
