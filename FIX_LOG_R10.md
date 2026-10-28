# Round 10 fix log — R9-SL-01 … R9-SL-15 (stepladder R9)

**Date:** 2026-10-19 (America/Los_Angeles)  
**Base commit:** `f350c07` (Round 9 baseline, 158/158)  
**Product spelling:** Athere (A-T-H-E-R-E) — unchanged.  
**Audit doc:** `uploads/SECURITY_AUDIT_STEPLADDER_R9_61b7.md` — **not edited** (statuses stay OPEN per Justin).  
**Ready / submit:** NOT marked ready. Repo stays private.

## Skills used (mandate)

| Skill | How applied |
|-------|-------------|
| `test-driven-development` | `tests/round10-stepladder-fixes.test.mjs` — one failing PoC per R9 finding before each fix. |
| `systematic-debugging` | Root-caused Kanban ordering (move before failed append), unit binding (`of the units`), round8 mission-close test vs R9-SL-04 policy. |
| `verification-before-completion` | Fresh `npm test` → **174/174 pass** (command output below). |
| `requesting-code-review` | Self-review against round9 checklist; formal subagent **BLOCKED** (no dispatch in this run). |

## Test count (verified)

```
npm test
# tests 174
# pass 174
# fail 0
```

(158 baseline + 16 in `tests/round10-stepladder-fixes.test.mjs`)

## Per-finding table

| ID | Test name | Fix summary (evidence) |
|----|-----------|-------------------------|
| R9-SL-01 | `R9-SL-01 scenarioHash includes plan-affecting fee assumptions` | `src/scenario-hash.mjs` — `ASSUMPTION_KEYS` now includes fee/timing keys (`expediteFee`, `hybridFee`, `latenessCostPerHour`, `substitutionPremiumPerUnit`, `reissueHours`, `hybridRemainderHours`). |
| R9-SL-02 | `R9-SL-02 PDF inflate bomb capped before unbounded decompress` | `src/pdf-text.mjs` — `maxOutputLength` + `INFLATE_BOMB`; `tryInflateFlate()` for PoC; `pdf-intake.mjs` surfaces reason. |
| R9-SL-03 | `R9-SL-03 Kanban move fails closed when ledger verification is broken` | `server.mjs` — `ledgerTrusted()` gate; move rolls back if `ledgerAppend` returns false; `/api/audit/verify` PoC. |
| R9-SL-04 | `R9-SL-04 mission close bound to open mission scenario hash` | `server.mjs` — `MISSION_SCENARIO_MISMATCH` when open mission `scenarioHash` ≠ submitted inputs. |
| R9-SL-05 | `R9-SL-05 double-negation release language blocked…` | `src/security/phrase-screen.mjs` — litotes patterns; claim + output screen. |
| R9-SL-06 | `R9-SL-06 idiomatic and Spanish release synonyms blocked` | `phrase-screen.mjs` — idiomatic / Spanish `liberar` patterns. |
| R9-SL-07 | `R9-SL-07 fabricated qualitative reassurance blocked` | `src/claim-checker.mjs` — `QUALITATIVE_REASSURANCE` + unsupported assertion path. |
| R9-SL-08 | `R9-SL-08 number grounding: spelled, unicode digits…` | `claim-checker.mjs` — `foldUnicodeDigits`, `a hundred`/`dozen`/`half`, sci notation, `of the units` binding, CPI rounding removed from `qtyMatch`. |
| R9-SL-09 | `R9-SL-09 injection synonym matrix quarantines supplier text` | `src/prompt-defense.mjs` — expanded `FAMILY` (pay no attention, set aside, note-to-AI, dotted ignore, FR/DE). |
| R9-SL-10 | `R9-SL-10 known-dev consent secret variants refuse weak start` | `src/security/consent-secret.mjs` — `canonicalDevSecret()` normalization (case, trailing `!`). |
| R9-SL-11 | `R9-SL-11 extreme finite assumptions rejected by engine` | `src/engine.mjs` — `MAX_ASSUMPTION = 1e12`. |
| R9-SL-12 | `R9-SL-12 API rejects non-JSON Content-Type…` | `server.mjs` — `bodyJSON` requires `Content-Type: application/json` → **415**. |
| R9-SL-13 | `R9-SL-13 MATCH grade+po does not allow certificate fully compliant` | `claim-checker.mjs` — certificate-level compliance requires **all** fields `MATCH`. |
| R9-SL-14 | `R9-SL-14 unkeyed verifyLedger fails closed…` | `src/audit-ledger.mjs` — non-empty chain requires `{ key }` (`KEY_REQUIRED`). |
| R9-SL-15 | `R9-SL-15 CSP security headers present on health` | Positive control test on `/api/health` headers (`server.mjs` `baseHeaders`). |
| R9-SL-15a | `R9-SL-15a witness detects ledger rollback…` | `src/audit-ledger-persist.mjs` — append-only `.witness.jsonl`; verify detects `WITNESS_ROLLBACK` / `WITNESS_TIP_MISMATCH`. |

## Hostile re-test (round 10)

- Re-ran full `npm test` (includes R7/R8/R9 regression suites + 16 R9 PoCs).
- Variant probes added in round10 tests: litotes + Spanish release, `of the units` + CPI=1, consent-secret punctuation/case, witness truncation, Content-Type matrix.
- **No new exploit class** found beyond R9 list after fixes (test pass 174/174).

## New / adjusted behavior (not in R9 table)

- `tests/round8-capabilities.test.mjs` — mission-close flow updated: cert swap while conflict mission open → **409**; revoke then close reconciled cert → **NO_OPEN_MISSION** (matches R9-SL-04).

## BLOCKED

| Item | Gap |
|------|-----|
| Live Muse Spark E2E | No `MODEL_API_KEY` in this environment. Code path: set `MODEL_API_KEY` + optional `MODEL_API_BASE` / `MODEL_NAME`, `META_BRIEF_MODE=live` or `auto`; run `npm run verify-live-model`. |
| Tamper-proof ledger | Key + witness still **tamper-evident**; holder of `LEDGER_HMAC_KEY` with coordinated ledger+anchor+witness rollback remains a documented residual (R9-SL-15a class). |

## Commits (this round)

1. `f350c07` — Round 9 baseline  
2. `0518ba5` — Round 10 stepladder security fixes + tests + FIX_LOG_R10 + README polish
