# FIX_LOG_R12 — Round 12 structural convergence (R11 audit)

**Skills used:** `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `using-superpowers`.

**Status:** NOT READY (live Muse E2E still BLOCKED without `MODEL_API_KEY`; independent re-audit not claimed).

## Structural changes

| Area | Change |
|------|--------|
| **Deny-by-default assertions** | `src/security/brief-assertion-gate.mjs` classifies every sentence; regulated acceptability/compliance/conformance/operator directives require field-level `MATCH` (certificate-level acceptability requires all intake findings `MATCH`). Wired into `checkSentence` → `UNBOUND_REGULATED_ASSERTION`. Phrase lists remain secondary in `phrase-screen.mjs` / `findUnsupportedAssertions`. |
| **Output screen** | `screenModelOutput` blocks operator directives + release/safety at screen layer; acceptability/compliance enforced in claim checker so multi-sentence adversarial briefs still report per-sentence blocks. |
| **Meta-brief COMPLETE** | Unchanged formula but `blockedCount` now includes assertion-gate blocks — no `COMPLETE` with unbound regulated assertions. |
| **Prompt defense** | `src/security/instruction-intake.mjs` structural override-of-prior-rules detection; integrated in `scanSupplierText` (not synonym-only). |
| **Ledger export anchor** | Sibling `*.export.jsonl` append-only file (`LEDGER_EXPORT_ANCHOR_PATH` optional); verified in `verifyPersistedLedger` (`EXPORT_ANCHOR_*` reasons). Operator copies off-box; dual-key disk rollback still possible if attacker rewrites ledger + anchor + notary + export together — **residual documented**. |
| **Docs** | README round 12 security bullet; `clips-meta.json` repo-relative paths. |
| **buildLabel** | `BUILD_ROUND=r12`, tag `r12`. |

## R11 findings

| ID | Fix | Test |
|----|-----|------|
| R11-SL-01 Critical | Assertion gate + operator screen | `tests/round12-stepladder-fixes.test.mjs` — auditor spindle PoC + **23** operator paraphrases |
| R11-SL-02 High | Acceptability needs all findings MATCH on conflict scenario | **22** acceptability paraphrases (claims `UNBOUND_REGULATED_ASSERTION`) |
| R11-SL-03 Medium | Structural instruction intake | **23** injection paraphrases + `scanSupplierText` |
| R11-SL-04 Low | README | round 12 bullet |
| R11-SL-05 Low | `demo/01_screen_recordings/clips-meta.json` | `demo/...` relative paths |
| R11-SL-06 / R8-SL-13 | Export anchor + SUBMISSION residual | export anchor rollback test in round12 |

## Tests

`npm test` → **186/186** (per-file run with 180s timeout, 2026-10-19).

## BLOCKED

- **Live Muse Spark:** no `MODEL_API_KEY` in cloud agent environment — `npm run verify-live-model` not pass/fail gate.
- **Playwright demo recorder:** registry unavailable in prior rounds; CDP clips unchanged unless operator re-records locally after UI review.

## Demo

No clip re-record this round (health label `round12` only; claim-check behavior is server-side). Teleprompter unchanged.
