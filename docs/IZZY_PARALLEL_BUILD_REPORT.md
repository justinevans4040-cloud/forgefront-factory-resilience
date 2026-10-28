# Izzy parallel build report — ForgeFront Factory Resilience

**Build lane:** Independent parallel implementation for comparison with Justin Evans’s primary hackathon entry.  
**Base snapshot:** `factory-resilience-source-snapshot` (2026-10-18 00:15 PT).  
**Round 2 date:** 2026-10-18 (IP survey + CertFlow-informed intake).  
**Round 3 date:** 2026-10-18 — hostile stepladder audit (`docs/SECURITY_AUDIT_STEPLADDER.md`).  
**Round 4 date:** 2026-10-18 — session auth, rate limits, durable ledger (SEC-06–20 closed).  
**Round 5 date:** 2026-10-18 — **PMP Mastery PM add-on** (CPM, EVM, WSJF, Kanban).  
**Round 6 date:** 2026-10-18 — **Realistic Haas-class four-cell shop** (capability routing, varied Little’s Law stats).  
**Round 7 date:** 2026-10-18 — browser-safe SHA-256, import-graph guard, browser smoke (UI fix).  
**Round 8 date:** 2026-10-18 — all 27 claim-drift audit items made true; Muse Spark tool-calling brief, two-step consent, HMAC-anchored ledger, Flate PDF parser, measured Little's Law. See `docs/ROUND8_CHANGES.md`.  
**Status:** **141 tests** + full-demo browser smoke; PM logic ported from Justin Evans PMP Mastery (see `docs/PROVENANCE.md`); live Muse optional via `tools/live-model-verify.mjs`.

See **`docs/PROVENANCE.md`** for source-repo attribution (read-only survey; no secrets copied).

---

## 1. Round 5 — Project Management add-on

| Module | Source | Role in demo |
|--------|--------|--------------|
| `src/pm/cpm-calculator.mjs` | PMP Mastery `CpmCalculatorService` | Per-plan critical path, float, finish Δ vs baseline |
| `src/pm/evm-calculator.mjs` | `EvmCalculatorService` | Synthetic PV/EV/AC, CPI/SPI, EAC per recovery plan |
| `src/pm/wsjf-calculator.mjs` | `WsjfCalculatorService` + `LittlesLawService` | Rank impacted jobs; cell WIP/throughput hints |
| `src/pm/kanban.mjs` | `KanbanService` (execution columns only) | Post-consent recovery board with WIP limit |
| `src/pm/pm-analysis.mjs` | Factory scheduler integration | Deterministic PM bundle for UI + export |

**API:** `POST /api/pm/analyze`, `GET /api/kanban`, `POST /api/kanban/move` (Round 4 security model).

---

## 2. Round 2 additions (Meta 25% + Demo 25% focus)

| # | Feature | Implementation |
|---|---------|----------------|
| 1 | **PDF cert intake** (CertFlow-inspired) | `src/pdf-intake.mjs` + `src/pdf-text.mjs` — FlateDecode / ToUnicode text-layer parser, `FLAGGED` / `TEXT_LAYER_UNREADABLE`, `/api/pdf-intake`, bundled sample PDFs, UI upload |
| 2 | **Claim checker** | `src/claim-checker.mjs` — sentences need `[evidence:id]` or registry match; **blocked count in UI** |
| 3 | **Epistemic states** | `src/epistemic.mjs` — `unknown` / `verified_false` / `verified_true` + **next actions** per field |
| 4 | **Consent + audit** | `src/consent-gate.mjs` — expiring single-use token, `APPROVE <planId>`, `src/audit-ledger.mjs` hash chain in export |
| 5 | **Model adapter** | `src/model-adapter.mjs` — muse-spark / llama (Ollama) / fixture; `src/output-screen.mjs` blocks model release text |
| 6 | **Prompt injection defense** | `src/prompt-defense.mjs` + adversarial cases **A25–A26** |

**Round 1** items (multi-doc packet, graph, incident FSM, second shock, 26 adversarial cases, CI) remain in place.

---

## 2. Before / after (cumulative)

| Capability | P00 foundation | After Round 2 |
|------------|----------------|---------------|
| Tests | 13 | **56** (Round 2; Round 8: 141) |
| PDF intake | None | Text-layer PDF → deterministic fields; model proposes only |
| AI brief safety | Optional endpoint | Claim-checked + output screen + blocked sentence meter |
| Operator approval | Name + click | **HMAC consent token** + typed `APPROVE <plan>` |
| Audit trail | Event list | **Hash-chained ledger** tip in export + `/api/audit/verify` |
| Adversarial cases | — | **26** (incl. injection) |

---

## 3. Judging criteria self-assessment (Round 2)

| Criterion | Weight | Score | Rationale |
|-----------|--------|-------|-----------|
| **Impact** | 30% | **7.5/10** | CertFlow-aligned intake story; still synthetic shop |
| **Meta AI tooling** | 25% | **7/10** | Adapter boundary, claim gate, fixture+eval harness; live Muse/Llama needs owner keys |
| **Technical depth** | 20% | **8.5/10** | Epistemic model, consent, ledger, injection suite |
| **Demo** | 25% | **7.5/10** | PDF drop, blocked-claims meter, APPROVE phrase, second shock, export chain tip |

**Still not claimed:** recorded 2-min video, public judge URL, S24 device pass, official rules compliance sign-off.

---

## 4. Unverified

- `MODEL_API_KEY` → live Muse Spark briefs (`verifiedLive: true`).
- `OLLAMA_ENDPOINT` / `OLLAMA_MODEL` → local Llama extraction/brief (CertFlow-style).
- Scanned/image-only PDFs (no OCR pipeline — routes to `FLAGGED`).
- P01 registration / final rules.

---

## 5. Risks

| Risk | Mitigation |
|------|------------|
| CertFlow / wake-engine / athere pre-event IP | Document in `PROVENANCE.md`; separate event-era commits |
| `CONSENT_HMAC_SECRET` default in dev | Set env var for any shared deployment |
| Lite PDF parser vs production PDFs | Label method `pdf-text-layer-lite`; flag unreadable |
| Public repo leak | Keep private; zip for desktop copy only |

---

## 6. Merge recommendations (priority)

1. **Claim checker + blocked count UI** — strongest measurable “safe Meta use” story.
2. **Consent gate + audit ledger** on plan acceptance — differentiator vs dashboard-only entries.
3. **PDF intake route** with FLAGGED taxonomy (port of CertFlow stages).
4. **Model adapter** with fixture CI and live provider flags.
5. **Epistemic next-actions** on every field row.
6. **Injection adversarial fixtures** in shared benchmark.

---

## 7. How to run

```bash
npm start
npm test    # 141 tests (Round 8)
npm run check

# Optional providers
MODEL_API_KEY=... META_BRIEF_MODE=live npm start
OLLAMA_ENDPOINT=http://127.0.0.1:11434/v1/chat/completions MODEL_PROVIDER=llama npm start
CONSENT_HMAC_SECRET=... npm start
```

---

## 8. Artifact

Desktop zip: **`izzy-factory-resilience-build.zip`** (repo tree, no `node_modules` / `.git` / `uploads` / duplicate snapshot folder).
