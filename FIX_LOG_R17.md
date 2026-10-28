# FIX_LOG_R17 — Raw prose API/export boundary (R16 audit)

**Skills:** `test-driven-development`, `verification-before-completion`, `systematic-debugging`, `using-superpowers`.

**Status:** NOT READY (private). Live Muse **BLOCKED** (`MODEL_API_KEY`).

## Fixes

| ID | Fix | Test |
|----|-----|------|
| R16-SL-01 | Default `/api/meta-brief` strips `rawModelProse`; session stash + `GET /api/audit/raw-model-output` (ledger `RAW_MODEL_AUDIT_VIEW`) | `round17` mock-live hostile string |
| R16-SL-01 | Default export omits raw prose; separate `raw-model-output-UNVERIFIED.json` via audit export button | `round17` API blob checks |
| R16-SL-01 | UI raw panel loads only from audit endpoint | `app.mjs` |
| SEC-19 portability | `tests/git-project-root.mjs` + static `ci.yml` / `.gitattributes`; git archive from project root | `round16`/`round17` nested parent-repo layout |

## Tests

**227/227** in git checkout (`npm test`). Clean unzip artifact: **225 pass, 2 skipped, 0 fail** (227 tests). Nested parent-git `npm test` subprocess: **227/227** when run from checkout via `round17` layout test.

## BLOCKED

- Live Muse E2E without `MODEL_API_KEY`.
- Meta JSON mode on Muse endpoint not independently verified.
