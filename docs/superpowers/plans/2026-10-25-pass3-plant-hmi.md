# Pass 3 Plant HMI Implementation Plan

> **For agentic workers:** Implement task-by-task. Front-end only.

**Goal:** Ground-up R18 UI for Muse Spark demo: ISA-101 plant view, NASA Open MCT time conductor, F1 strategy gapper, Palantir-style editable AI action, Crew Dragon two-key consent + dense ledger.

**Architecture:** Keep all DOM ids and consent/ledger API wiring. Replace Pass-2 theater IA (stage ribbon + hero river + stat tiles) with plant schematic + bottom time conductor + compact secondary page index. New viz helpers live in `src/ui-viz.mjs` (already allowlisted). Hash format `#<page>/<beat>`.

**Pass 3b palette (2026-10-25):** Neutral dark gray (no beige) — page `#2B2E31`, panels `#34383C`, raised `#3D4146`, borders `#4A4F55`, schematic `#8A9098`; text `#E6E8EA` / `#A9AFB5` / label mono `#8C939A`; alarm `#D9534F`; tamper amber `#E0A030`. Fold band-row metrics into plant rail; remove duplicate `page-jump` (page index covers nav).

**Tech Stack:** Vanilla HTML/CSS/ESM; inline SVG; zero new runtime deps; CSP `script-src 'self'`.

---

### Task 1: Backups
- Copy edited files to `*.bak_20261025_0707` (Shell if available; else Write copies / note BLOCKED).

### Task 2: Fail layout tests for Pass 3
- Replace Pass-2 assertions with Pass-3 / 3b (plant-hmi, time-conductor, neutral dark gray, no stage-nav ribbon as primary, no river-hero, no band-row / page-jump).

### Task 3: `index.html` shell
- Plant overview, time conductor, secondary index, strategy gapper mounts, AI action card chrome, ARM/COMMIT labels on existing consent buttons.

### Task 4: `styles.css` rewrite
- Flat neutral dark-gray ISA-101; alarm red for disruption; amber for tamper; no glow/neon/gradients/glass/purple/stat-tile heroes.

### Task 5: `ui-viz.mjs`
- Plant schematic, strategy gapper + sparklines, dense ledger, time-conductor marks; keep `consequenceSeries` API for compatibility.

### Task 6: `app.mjs`
- Wire viz; hash beat sync; ARM/COMMIT copy; proposed-action card; scrub updates all views.

### Task 7: `ForgeFront_PM.html`
- Match Pass 3b dark-gray tokens (visual only).

### Task 8: Allowlist
- Add any NEW static paths only; do not weaken security logic.

### Task 9: Verify
- `npm test` + browser smoke when Shell available; FIX_LOG_R18.md entry.
