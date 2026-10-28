# Hostile stepladder security audit — ForgeFront Factory Resilience ROUND 17

**Auditor mode:** Independent hostile stepladder (not the builder). Verify **R16-SL-01**, test matrix / SEC-19, full regression.
**Date:** 2026-10-19 (UTC)
**Scope:** `factory-resilience-round17_a001.zip` — commits **71b5c10 / 33a3d36 / aa5503d**, SHA256 `abfafa9041277ebd880e55fb9a2ae5648c4774b205d1a0c5bac853958e5ba1e8`
**Audit tree:** `/workspace/r17/`
**Passes:** 3 (`audit/run-stepladder.mjs`); passes 2–3 matched pass 1.
**Fix status:** **NONE** (auditor does not edit product code)

Product spelling: **Athere** (A-T-H-E-R-E).

**Skills:** `systematic-debugging`, `verification-before-completion`, `using-superpowers`.

---

## Executive summary

Round 17 closes **R16-SL-01**: default **`POST /api/meta-brief`** omits **`rawModelProse`** (stashes per session); unverified text is only via **`GET /api/audit/raw-model-output`** (session required, **401** unauthenticated, **404** cross-session, **`RAW_MODEL_AUDIT_VIEW`** ledgered). Default **evidence export** omits raw prose; separate **`raw-model-output-UNVERIFIED.json`** button uses the audit endpoint. UI raw panel uses **`textContent`** (no HTML injection).

**Test matrix:** Isolated clean copy (no parent git): **225 pass, 2 skipped, 0 fail** — skips are only `round17` git-layout tests (`SEC-19 git archive…`, `nested npm test…`) when `findProjectGitRoot` is null. Git checkout / parent monorepo with project package: **227/227 pass, 0 skip**. **SEC-19** static **`ci.yml`** enforced (pinned SHAs, `contents: read`).

**SUBMISSION.md / README / code:** `doc-claims-verify.mjs` — **no mismatches**.

**False-positive:** Fixture brief **COMPLETE**, templated advisory, **`rawModelProse` absent** on API.

**Verdict: READY** (no open Low+ findings; **R8-SL-13** INFO-RESIDUAL only). **SUBMISSION.md** still says NOT READY — owner may update status after accepting this audit.

**EXCLUDED:** Live Muse E2E, Meta `json_object` confirmation.

---

## R16-SL-01 verification

| Check | Result | Evidence |
|-------|--------|----------|
| Default meta-brief API | **PASS** — `rawModelProse` undefined; `rawModelAuditAvailable` true; no resume/script in operator JSON blob | `r16-sl01-boundary.out` |
| Default export slice | **PASS** — no `rawModelProseUnverified` in `exportReport` metaBrief (`app.mjs`) |
| Audit endpoint | **PASS** — labeled UNVERIFIED; raw hostile string only here | same |
| AuthZ | **PASS** — 401 unauth; 404 other session | same |
| Ledger | **PASS** — `RAW_MODEL_AUDIT_VIEW` | same |
| UI XSS | **PASS** — `rawOut.textContent` | same |

**Status: VERIFIED-CLOSED**

---

## Test / SEC-19 judgment

| Mode | Result | Notes |
|------|--------|-------|
| Isolated unzip (`/tmp/r17-clean`) | 225 pass, **2 skipped**, 0 fail | Legitimate skips |
| `/workspace/r17` (parent git + same `package.json` name) | **227/227** | Nested git tests run |
| Static `ci.yml` | Present + SEC-19 patterns | `doc-claims-verify`, `security-round4` |

---

## Prior findings re-check

`regress-prior-findings.mjs` — **18 VERIFIED-CLOSED**, **R8-SL-13 INFO-RESIDUAL**, **R7-SL-08 EXCLUDED**. **R15** hostile prose set **VERIFIED-CLOSED** (`r15-fix-verify.out`). Structured advisory / strict JSON paths unchanged (`r16-advisory-attacks.out` — operator-field “leak” on XSS probe is **false positive**: template text matches `/resume/` substring in “authorization”, not dropped prose).

---

## New findings (R17-SL-xx)

**None** (Low+).

---

## PoC index

```bash
cd /workspace/r17
npm test
node audit/run-stepladder.mjs
node audit/r17-test-matrix.mjs
node audit/r16-sl01-boundary.mjs
node audit/doc-claims-verify.mjs
```

---

## HOSTILE AUDIT

```
ROUND 17 (zip abfafa90…a1e8)
Passes: 3
Tests: 225+2 skip isolated; 227/227 in git checkout
R16-SL-01: VERIFIED-CLOSED
NEW OPEN: 0
VERDICT: READY
```

---

*Athere (A-T-H-E-R-E). Independent auditor; no product fixes applied.*
