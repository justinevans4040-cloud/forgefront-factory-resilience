# FIX_LOG_R13 — Allowlist structured claims (R12 audit)

**Skills used:** `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `using-superpowers`.

**Status:** NOT READY (live Muse E2E BLOCKED without `MODEL_API_KEY`).

## Architecture (allowlist)

| Layer | Behavior |
|-------|----------|
| **Model output** | JSON only: `{ claims: [{ type, evidenceIds, params }], commentary? }` with **closed enum** (`src/structured-brief.mjs`). |
| **Decisions** | Operator brief text is **rendered server-side** from validated claims + registry facts (templates). Wording/language cannot introduce release/resume. |
| **Commentary** | Optional `commentary` → labeled advisory block; screened; **never** affects `COMPLETE`, Kanban, consent, or `decisionText`. |
| **Prose attacks** | Plain-text model output → `SCHEMA_INVALID` → not `COMPLETE` (R12-SL-01/02 impossible at API). |
| **Injection** | PDF/intake quarantine unchanged; outcomes do not depend on quarantine hits (R13 tests). `instruction-intake.mjs` extended (hop/walk/not binding) defense-in-depth only. |
| **Export anchor** | `GET /api/audit/export-anchor` optional verify; residual dual-key on-disk rewrite documented (`SUBMISSION.md`). |

## R12 findings — why impossible (not merely blocked)

| ID | Impossibility |
|----|----------------|
| R12-SL-01 | No claim type for production resume; prose mock → schema fail → not `COMPLETE`. |
| R12-SL-02 | Paraphrase prose never enters renderer; only enum types with bound evidence render. |
| R12-SL-03 | Injection misses cannot change decisions (claims-only path); quarantine extended anyway. |
| R12-SL-04 | Documented + export-anchor API. |

## Tests

`npm test` → **195/195** (per-file, 2026-10-19). `tests/round13-stepladder-fixes.test.mjs` + prior round suites.

## Demo

No clip re-record (UI shows same flow; decision text still readable). `buildLabel` **round13**.

## BLOCKED

- Live Muse Spark without `MODEL_API_KEY`.
