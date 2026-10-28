# Redesign Pass 2 Implementation Plan

> **For agentic workers:** Implement task-by-task. Front-end only; allowlist any NEW static files; do not weaken CSP/consent/ledger.

**Goal:** Bold IA + visual break (Consequence River / Ops Theater) for the Muse Spark demo film.

**Architecture:** Horizontal stage ribbon; navy-steel + copper + cyan tokens; hero river + real-data viz mounts; all DOM IDs preserved (M5).

**Tech Stack:** Vanilla HTML/CSS/JS modules already in tree; CSP `font-src 'self'`; zero new runtime deps.

---

### Task 1: Concepts + backup
- [x] `docs/superpowers/specs/redesign2_concepts.md`
- [ ] `*.bak_20261025_0625` (Shell may be BLOCKED — note in FIX_LOG)

### Task 2: Shell + CSS + viz
- [ ] Rewrite `index.html` (no left sidebar)
- [ ] Rewrite `src/styles.css` (new tokens; forbid `#050505`/`#E5222D` chrome)
- [ ] Expand `src/ui-viz.mjs` (river, plan compare, ledger chain)
- [ ] Wire `src/app.mjs` router + viz + R18 build tag display
- [ ] Restyle `ForgeFront_PM.html` tokens to match
- [ ] `BUILD_ROUND = "r18"` label in `server.mjs` (display only)

### Task 3: Tests + verify
- [ ] `tests/ui-redesign2-20261025.test.mjs`
- [ ] `npm test` + browser screenshots → `demo/redesign_20261025/pass2/`
- [ ] FIX_LOG_R18.md entry
