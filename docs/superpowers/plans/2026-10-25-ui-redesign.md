# Factory Resilience R18 UI Redesign — Implementation Plan

> **For agentic workers:** Front-end only. Preserve every ID/`data-*` hook used by `src/app.mjs`.

**Goal:** Ground-up award-level mission-control UI across every page/tab including Program embed.

**Architecture:** Replace `src/styles.css` with a token-first design system; restructure `index.html` presentation layers (keep IDs); add `src/ui-viz.mjs` for consequence sparkline/timeline from live state; restyle vendored `ForgeFront_PM.html` competition polish; backup as `*.bak_20261025_0600`.

**Tech Stack:** Vanilla HTML/CSS/ES modules, zero new runtime deps, CSP-compatible local assets only.

---

### Task 1: Backup + ID preservation test
- Backup: index.html, styles.css, app.mjs, ForgeFront_PM.html
- Add test asserting critical DOM IDs remain in index.html

### Task 2: Redesign shell + overview
- New styles.css design system
- Overview hero, metrics, sparkline/timeline mounts, scenario controls

### Task 3: Redesign remaining pages + dialog
- Evidence, Impact, Recovery, PM, Kanban, Program, Arbitration, Decision, Mission, Prove-it
- Consent dialog chrome

### Task 4: Program embed (ForgeFront_PM.html)
- Visual tokens + chrome only; no seed/logic removal

### Task 5: Wire viz from live state
- ui-viz.mjs imported by app.mjs; sparkline/timeline from impact + events

### Task 6: Verify
- npm test (229 / 227 pass / 2 skip)
- Screenshots under demo/redesign_20261025/
- FIX_LOG_R18.md entry
