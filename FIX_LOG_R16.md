# FIX_LOG_R16 — Structured advisory allowlist (R15 audit)

**Skills:** `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `using-superpowers`.

**Status:** NOT READY — `SUBMISSION.md` reverted after premature READY; live Muse E2E **BLOCKED**.

## Fixes

| ID | Fix | Test |
|----|-----|------|
| R15-SL-01..04 | `src/structured-advisory.mjs` — closed enum advisory items + server templates; free `commentary` prose dropped (count visible); security boundary not phrase screen | `round16` hostile probes (passive, double_neg, synonym2, italian, spanish, split, implication) |
| R15-SL-01..04 | Raw prose only in API `rawModelProse` + UI “Raw model output (unverified, audit only)” | export JSON uses `decisionText`/`advisoryText` only |
| R15-SL-01..04 | `commentary-decision-screen` remains defense-in-depth on raw view label | `round15` phrase-screen unit tests retained |
| R15-SL-05 | `.github/workflows/ci.yml` in repo + `.gitattributes` + `git archive` includes CI | `round16` SEC-19 archive test; `security-round4` SEC-19 |

## Tests

**222/222** (`npm test`, 2026-10-19). Clean-unzip of `git archive` artifact: **222/222**.

## BLOCKED

- `MODEL_API_KEY` live Muse path not verified in CI.
- Meta `response_format: json_object` not independently verified on Muse endpoint.
