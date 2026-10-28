# Round 9 fix log — R7-SL-01 … R7-SL-12

**Date:** 2026-10-18 (America/Los_Angeles)
**Base:** round 8 commit `645b53257099ed239087751b55662f37bf5af693` (141/141)
**Working copy:** `/workspace/factory-resilience/round9` (this tree)
**Product spelling:** Athere (A-T-H-E-R-E) — verified; no other spelling introduced.
**Audit reports:** R7 and R8 stepladder docs were NOT edited. Findings stay OPEN until Justin reviews.
**Ready status:** NOT marked ready. No push to GitHub. Lenovo round-8 server untouched.

## Skills used (mandate)

| Skill | How applied |
|-------|-------------|
| `using-superpowers` | Subagent exception noted; Justin mandated the named skills anyway — followed. |
| `systematic-debugging` | Every remaining failure: read error → reproduce → root cause before fix (legacy regex bypassed negation; boot never called consent gate; pdf early-return shadowed FLAGGED_INJECTION; ZWS glued `releasefor`). |
| `test-driven-development` | `tests/round9-stepladder-fixes.test.mjs` encodes each PoC; watched 3 reds, fixed root causes, re-ran to green; full suite after. |
| `verification-before-completion` | Fresh `npm test` → **158/158 pass**; fresh `tools/poc-r7-stepladder.mjs` after-fix JSON before any completion claim. |
| `requesting-code-review` | Formal subagent dispatch **BLOCKED** (executor has no subagent tool). Self-review against `code-reviewer.md` checklist recorded below. |
| `finishing-a-development-branch` | Tests verified → keep branch as-is (Justin: do not push or merge). |

## Per-finding table

| ID | Reproduced on r8 (645b532)? | Fixed in r9? | Test name | Skills used | Fix (file:line summary) | PoC before → after |
|----|----------------------------|--------------|-----------|-------------|-------------------------|--------------------|
| R7-SL-01 | **YES** — `/server.mjs` 200, `/src/security/consent-secret.mjs` 200; known-dev secret started as "configured"/"strong"; production with known-dev did not refuse | YES | `R7-SL-01 safeStaticPath…`, `R7-SL-01 HTTP refuses…`, `R7-SL-01 known-dev…`, `R7-SL-01 production + known-dev…` | TDD, systematic-debugging, verification-before-completion | Explicit static allowlist `src/security/http-utils.mjs`; known-dev list + `ALLOW_WEAK_CONSENT_SECRET` + boot gate `server.mjs` / `consent-secret.mjs` | before: 200 + secret source shown; after: **403** on server modules; known-dev **refuses start** without flag; production **exit≠0** |
| R7-SL-02 | **PARTIAL** — original "fully compliant and safe to ship" already UNSUPPORTED_ASSERTION on r8; residual: "safe to use and meets spec" / "airworthy" still allowed; **planted evidence** (assertion words on heat line) still allowed | YES (residuals) | `R7-SL-02 qualitative claims…`, `R7-SL-02 supplier-planted…` | TDD, systematic-debugging | Structured facts+quantities registry; phrase-screen grounding; free text never supports claims — `src/claim-checker.mjs`, `src/security/phrase-screen.mjs` | before planted claimAllowed=true; after **false / UNSUPPORTED_ASSERTION**. MATCH grade+po still may support "fully compliant" (intentional grounding) |
| R7-SL-03 | **YES** — "release this material" screenAllowed=true; spaced/leet/ship variants true | YES | `R7-SL-03/04 adversarial…`, `R7-SL-03/04 phrase-screen…` | TDD, systematic-debugging | Structured grammar + normalize (NFKC/confusable/leet/spacing/ZWS un-glue) — `output-screen.mjs`, `phrase-screen.mjs`, `text-normalize.mjs` | before screenAllowed=true; after **false** on all PoC variants |
| R7-SL-04 | **YES** — "cleared and good to go" / "approved for use" / leet / Cyrillic е all allowed | YES | same as SL-03 | TDD, systematic-debugging | Same phrase-screen FIXED_COMPLIANCE / FIXED_RELEASE | before allowed=true; after **false** |
| R7-SL-05 | **PARTIAL** — 30≠300 already rejected on r8; residual **unit mismatch**: "178 jobs" with units+orders cited, "$84" as cost vs qualified units | YES (residuals) | `R7-SL-05 30 does not match 300…` | TDD, systematic-debugging | Typed quantities `{value,unit}` + unit agreement in `qtyMatch` — `claim-checker.mjs` | before unit swaps claimAllowed=true; after **NUMBER_NOT_IN_EVIDENCE** |
| R7-SL-06 | **YES** — disregard/Ign0re/synonyms/leet/spaced all quarantined=false, verbatim kept | YES | `R7-SL-06 synonym / leet…` | TDD, systematic-debugging | Synonym families on screeningVariants; whole-blob replace with `[QUARANTINED_SUPPLIER_TEXT]` — `prompt-defense.mjs` | before quarantined=false verbatim; after **quarantined=true**, sanitized has no original |
| R7-SL-07 | **PARTIAL** — keyed+anchor already on r8 (rewrite without key → MAC_INVALID, trunc → TRUNCATED); residual: **key lived inside ledger dir** (`.ledger-key`), so write access to ledger dir forged clean chain | YES (key separation) | `R7-SL-07 full-chain rewrite…` | TDD, systematic-debugging | Key default outside ledger dir (`.forgefront-ledger-key` sibling of `data/`, or `tmpdir/forgefront-ledger-keys/…`) — `audit-ledger-persist.mjs` | before keyStoredInsideLedgerDir=true + forge ok; after **false** / forge null |
| R7-SL-08 | **YES** — chain: quarantined=false, injection reached model, screenAllowed=true on release brief | YES | `R7-SL-08 chained injection…` | TDD, systematic-debugging | Composition of 02+03+06; pdf route prefers FLAGGED_INJECTION when quarantined — `pdf-intake.mjs` | before quarantined=false reachedModel=true; after **quarantined=true, FLAGGED_INJECTION, reachedModel=false, screenAllowed=false** |
| R7-SL-09 | **NO** — r8 already hashes server-recomputed plan; client `plan` ignored (`tokenPlanHashEqualsForgedPlanHash=false`) | N/A (held) | `R7-SL-09 consent planHash…` | verification-before-completion | No code change; regression test locks behavior (`server.mjs` review path + `hashPlan(plan)`) | before=after: forged hash ≠ returned hash |
| R7-SL-10 | **YES** (info-by-design, still hardened) — system/admin/HTML/ѕystem accepted; session not ledgered | YES | `R7-SL-10 reserved…`, `R7-SL-10 session issuance…` | TDD, systematic-debugging | `validateOperatorName`, loopback-only `createOperatorSession`, `SESSION_ISSUED` / `OPERATOR_BOUND` ledger — `session-auth.mjs`, `server.mjs` | before system 200; after **403 OPERATOR_RESERVED**; SESSION_ISSUED true |
| R7-SL-11 | **YES** (info) — 51 unescaped interpolations including numbers | YES | `R7-SL-11 every innerHTML…` | TDD | `num()` helper; all scalar interpolations via `safe`/`num` — `src/app.mjs` | before 51; after **0** unescaped scalars (9 remaining are pre-built HTML fragments built from safe/num) |
| R7-SL-12 | **YES** — health buildRound r8 / tag r8 | YES | `R7-SL-12 health build label…` | TDD, verification-before-completion | Single source: `package.json` version `0.9.0` + `BUILD_ROUND=r9` → `buildLabel=round9` — `server.mjs`, `package.json` | before r8; after **round9 / 0.9.0 / izzy-parallel-0.9.0-r9** |

## Test counts (verified fresh)

```
npm test
# tests 158
# pass 158
# fail 0
```

(141 baseline kept + 17 new in `tests/round9-stepladder-fixes.test.mjs`)

## New issues surfaced by the fixes

1. **MATCH-field compliance grounding (by design, watch):** citing `field:grade` + `field:po` (both MATCH) still allows "The certificate is fully compliant." That is structured grounding, not a free-text bypass. If Justin wants *no* compliance language even for MATCH fields, that is a product policy change — not done here.
2. **In-memory unkeyed `verifyLedger(ledger)` without `{key}` still accepts a rewritten chain.** Documented limit; persisted path (HMAC + anchor + external key) is what production uses. Test asserts both behaviors.
3. **Sample-mode / live model path:** SL-08 end-to-end used a local mock OpenAI-compatible server. Live Muse Spark with a real key was not exercised (**BLOCKED:** no `MODEL_API_KEY`).
4. **Formal code-review subagent:** **BLOCKED** — no dispatch tool in this executor. Self-review below.

## Code review (self, per requesting-code-review checklist)

**Strengths:** Real PoC tests; no feature removal; shared normalize/phrase modules; key moved outside ledger dir; boot fail-closed on weak secrets; 158/158 green.

**Important:** Operator allowlist still permits 64-char nonsense names (`xxxx…`) — only reserved/HTML/confusables blocked. Acceptable for localhost demo; tighten if multi-user later.

**Minor:** `hashRegistry` now hashes facts+quantities (not free text) — any external consumer of registry hashes will see a new hash value (demo-only impact).

**Assessment:** Ready for Justin's review of OPEN findings; not marked ready for submission.

## Delivery paths

- Box tree: `/workspace/factory-resilience/round9`
- Lenovo folder: `<LOCAL_PATH_REDACTED>`
- Zip: same folder + `.zip` (SHA256 recorded by delivery step)

## Verified delivery (America/Los_Angeles)

- **Commit:** `a359f07074fb7d4433d4f50f9e7e6a3878506da4`
- **Tests:** 158/158 pass (`npm test`, fresh run before commit and again before packaging)
- **Lenovo folder:** `<LOCAL_PATH_REDACTED>` (contains FIX_LOG_R9.md, package.json 0.9.0, server.mjs)
- **Lenovo zip:** `<LOCAL_PATH_REDACTED>`
- **SHA256 (box = Lenovo):** see packaging step / final report (recomputed when FIX_LOG delivery note was added)
- **Lenovo :4310:** still PID 22608 Listen (round 8). Round 9 server was not started.
