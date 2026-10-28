# FIX_LOG_R18 — Command Center V3 Program tab (experimental)

**Date:** 2026-10-20  
**Builder:** this Lenovo Cursor thread (not self-auditor)  
**Worktree only:** `Desktop\Izzy_Factory_Resilience_Build\izzy-factory-resilience-build-r18-command-center-v3`  
**Sealed R17:** untouched (`izzy-factory-resilience-build-final-r17` + `PRESERVE__R17_SEALED__20261020`)

## Intent
Add **Command Center V3 · Project + Communications OS** as a Program tab inside Factory Resilience so Resilience decisions cascade into program/logistics status — not a separate product.

## Preserve / rollback
- SHA256 sealed zips verified against Izzy_Brain `19_RESUME_STATE.md`
- Preserve folder + `ROLLBACK.md` written before edits
- If disliked: delete/rename worktree only; sealed R17 remains

## What changed (worktree)
- Vendored Ichabod LIVE solar-command assets into `vendor/command-center-v3/` (**excluded** `dce_v3_access.json`)
- Primary embed: `ForgeFront_PM.html` (LIVE_SPLIT `/pm`)
- Static allowlist extended only for `vendor/command-center-v3/*`
- `src/program-bridge.mjs` + `/api/program/bridge` + `/api/program/events`
- Server hooks: `CONSENT_ACCEPTED`, `KANBAN_MOVE`
- Client hooks: inject / second shock / clear / reset → program events
- Nav + `#program` panel with bridge summary + iframe
- Build round remains `r17` (sealed lineage). Additive flag: `programIntegration=command-center-v3-r18`

## Explicitly NOT done this pass
- Full ForgeFront emblem / color redesign
- Deep write-back into every CC V3 RAID/calendar field (bridge snapshot first; PM UI still the V3 product surface)
- Live customer communications providers
- Self-graded READY claim

## Independent audit required
Hostile stepladder must be run by a **separate** agent that does not edit product code and does not accept builder PASS claims.

## Post-audit builder fixes (after independent NOT READY)
- R18-CCV3-01/02: vendor static headers allow same-origin frame-ancestors + unsafe-inline for Program HTML only; main app stays DENY.
- R18-CCV3-03: client /api/program/events no longer accepts CONSENT_ACCEPTED/KANBAN_MOVE (403).
- R18-CCV3-05: consent revoke records program reopen.
- R18-CCV3-06: conflict clears consent/kanban flags.
- R18-CCV3-07: vendor .json denied; dce_v3_state.json removed from vendor.
- R18-CCV3-04/08: honest copy + sandbox on iframe + /program top-level link.
- Re-test: 227 pass / 2 skip.


## Post-audit builder fixes (after independent NOT READY)
- R18-CCV3-01/02: vendor static headers allow same-origin `frame-ancestors 'self'` + `unsafe-inline` for Program HTML only; main app stays DENY.
- R18-CCV3-03: client `/api/program/events` no longer accepts CONSENT_ACCEPTED/KANBAN_MOVE (403).
- R18-CCV3-05: consent revoke records program reopen.
- R18-CCV3-06: conflict clears consent/kanban flags.
- R18-CCV3-07: vendor `.json` denied; `dce_v3_state.json` removed from vendor.
- R18-CCV3-04/08: honest copy + sandbox on iframe + `/program` top-level link.
- Re-test: 227 pass / 2 skip.
- Independent re-audit: see docs/SECURITY_AUDIT_STEPLADDER_R18_CCV3.md

## Layout fix 2026-10-21
- Program iframe topbar crush: eyebrow was wrapping one glyph per line; Comms floated.
- Added embed-safe CSS in vendored ForgeFront_PM.html + parent iframe min-width.
- Overrode mobile `display:contents` topbar for <=600px iframe widths.


## Layout fix 2026-10-21 (embed hard override)
- Root cause: forgefront-mobile-release display:contents crushed eyebrow / floated Comms; prior CSS lost cascade.
- Fix: html.embedded (iframe detect), hide inner sidebar, flex topbar AFTER mobile-release.


## Brand skin 2026-10-21
- Visual-only ForgeFront vein from forgefront-systems.vercel.app (#050505 / forge #B5121B / signal #E5222D).
- Emblem: forgefront-factory-resilience assets/brand/forgefront-winged-emblem-C.png vendored + wired in shell + CC V3.
- No button/function changes.


## Competition polish 2026-10-21
- Atmosphere: fixed crimson radials, film grain, vignette.
- Type: Instrument Serif italic on hero emphasis; Syne metric numerals.
- Depth: panel sheen, hover lift, active nav forge rail, emblem bloom, sticky topbar edge.
- CC V3 embed matched; progress bars remapped to forge gradient.
- Visual only.


## Plan selection + affordance law 2026-10-21
- Option 01 glow was hardwired `best` = cheapest rank, not selection.
- Cards now select on click/keyboard; recommended badge stays on cheapest; selected ring + primary CTA follow choice.
- Global hover/active/focus for buttons, nav, chips, plan cards, kanban, Program embed controls.


## Page-mode nav 2026-10-21
- Replaced forever-scroll + IntersectionObserver with one-page-per-sidebar-tab hash router.
- Each page: clear H1 matching the tab, page lead, content, ForgeFront Systems / Factory Resilience footer.
- Breadcrumb updates to current page; document title updates.


## Dual scroll panes 2026-10-21
- Locked document scroll; sidebar nav and workspace are independent overflow panes with overscroll-behavior:contain.

## Layout scroll/void fix 2026-10-21
- Nested scrollbars + bottom black voids: document locked; sidebar one rail scroll; active page is the workspace scroll (not document + workspace + side-nav).
- Section grids `align-items:start` so short Decision left column no longer stretches into empty black slab.
- Program iframe fills leftover height (no fixed 78vh); wrap overflow hidden; embedded PM locks html/body/#app and scrolls `.content` only.
- Page footer uses `margin-top:auto` so short pages pin footer to bottom without mid-viewport gap.


## Private seed purge 2026-10-21
- Vendored Program UI had full personal org registry (manuscripts, WAKE private, agents). Replaced with 6 synthetic aerospace factory demo projects.
- Seed version 10 + bootstrap wipes prior localStorage portfolio on upgrade.
- Did not touch sealed R17 or Ichabod LIVE PM.


## Meta AI build timeline Program portfolio 2026-10-21
- Authored docs/META_AI_BUILD_TIMELINE_PROGRAM.md (phases P00-P12, R18, tools, audits, private-IP ban, Meta integration).
- Authored vendor/command-center-v3/demo-portfolio-seed.js v11: Meta umbrella + R18 + security + Muse + synthetic demos; tasks for every phase; RAID + approvals + owner actions.
- Wired ForgeFront_PM.html to load seed script; bootstrap clears projects/tasks/actions/raid/approvals and loads v11 when seed version bumps.
- Security-aware while building: seed contains Oct 21 hostile-audit as open Issue + Pending approval; prove-it re-run as open task; no private registry titles.
- Sealed R17 / Ichabod LIVE PM untouched.

- Decision Ask block moved full-width under the two-column grid to end left/right height mismatch voids.


## Saved in Izzy assigned LIVE folder 2026-10-21
- Confirmed all Oct 21 work lives only under `izzy-factory-resilience-build-r18-command-center-v3` (no .git in worktree � disk files are the save).
- Added `LIVE_PRODUCT.md` (LIVE vs sealed R17 / rounds / preserve).
- Layout evidence copied to `docs/evidence/layout-2026-10-21/` (decision-page.png, program-page.png).
- Sealed R17 + PRESERVE zip + older rounds not modified.

## Desktop shortcut 2026-10-21
- Desktop: `ForgeFront Factory Resilience.lnk` ? `http://127.0.0.1:4318/` via Chrome.
- Icon: winged emblem ICO from `vendor/command-center-v3/brand/forgefront-winged-emblem-C.png` (Fs back-to-back).

## Program UI encoding + emblem 2026-10-22
- Root cause (verified): `/program` serves `ForgeFront_PM.html` while the browser URL stays `/program`, so relative `./brand/...` resolved to `/brand/...` (403). Mojibake `â€¢` / garbled nav `.ico` were corrupted UTF-8 icon bytes in the HTML.
- Fix: absolute emblem `/vendor/command-center-v3/brand/forgefront-winged-emblem-C.png`; strip mojibake icons; ASCII ` · ` separators; empty `.ico` hidden via CSS. Tool: `tools/fix-pm-mojibake.mjs`.
- Synced to Ichabod `factory-resilience-r18-public-demo`. Proven on Cloudflare: program HTML `mojibakeBullet:false`, `brandAbs:true`; emblem HTTP 200.

## Ground-up UI redesign 2026-10-25 (competition / demo film)

**Mandate:** Full visual + interaction redesign (every page/tab + Program embed); M5 no capability cut; front-end only; no security/CSP/consent/ledger/server weakening; no git/deploy/tunnels/secrets.

### Skills used (logged)
- `using-superpowers` (skill discovery / priority)
- `brainstorming` (design locked from Justin’s complete brief — no Q&A delay per hard instructions)
- `writing-plans` → `docs/superpowers/plans/2026-10-25-ui-redesign.md`
- `frontend-app-builder` + Image Gen concepts (`ff-r18-*-concept.jpg` under Cursor assets)
- `test-driven-development` → `tests/ui-redesign-20261025.test.mjs`
- `verification-before-completion` (Shell blocked — see BLOCKED)
- `playwright` skill loaded; screenshots **BLOCKED** (no Shell)
- `step-ladder-hostile-audit` (self-check against M5 / CSP / ID preservation)

### Files changed
- `index.html` — mission-control shell, numbered nav, demo storyline rail, consequence sparkline + incident timeline mounts; removed Google Fonts CDN (CSP `font-src 'self'`)
- `src/styles.css` — ground-up token system (ForgeFront forge/signal, ISA-101 color=state), page-mode dual pane, responsive horizontal nav ≤900px, viz/plan/dialog chrome, motion + reduced-motion
- `src/ui-viz.mjs` — **new** live sparkline/timeline/story rail from engine impact + session events
- `src/app.mjs` — import + `renderOverviewViz()` in `render()`
- `vendor/command-center-v3/ForgeFront_PM.html` — CSP-safe local font stacks, deepened competition polish (visual only)
- `tests/ui-redesign-20261025.test.mjs` — **new** ID preservation + token + series tests
- Specs: `docs/superpowers/specs/2026-10-25-ui-redesign-design.md`, plan under `docs/superpowers/plans/`
- Evidence notes: `demo/redesign_20261025/README.md`, `BACKUP_NOTE_20261025_0600.md`

### Capabilities preserved (M5)
All prior IDs/controls/pages remain: inject/correct/shock/reset, evidence PDF path, impact table, recovery plans + ranges, PM, Kanban, Program iframe + bridge, arbitration, decision/consent dialog, Ask ladder, mission, prove-it. No server/security edits.

### Test result
**BLOCKED — not verified in this session.** Every Shell invocation (parent + subagents) returned `Rejected` with no stdout, so `npm test` and browser smoke could not be executed here. Expected after Shell restores: prior suite green **plus** 4 new redesign tests; baseline was 229 (227 pass / 2 skip) before this change.

### Screenshots
**BLOCKED** — no before/after captures under `demo/redesign_20261025/` (Shell/Playwright unavailable). Concept mockups exist in Cursor assets (see demo README).

### Backups
**BLOCKED** for byte-identical `*.bak_20261025_0600` via Copy-Item. Helper: `demo/redesign_20261025/_run_backup_copy.ps1` and `tools/pre-edit-backup-20261025_0600.mjs`. Rollback authority remains sealed R17 per `LIVE_PRODUCT.md`.

## Pass 2 bold redesign 2026-10-25 (~06:25) — Consequence River / Ops Theater

**Mandate:** Justin rejected Pass 1 as incremental (same black/red + left sidebar IA). Pass 2 = new IA + palette; M5 IDs kept; front-end + R18 labels; no CSP/consent/ledger logic weaken; no git/deploy.

### Skills used (logged)
- `using-superpowers` (skill discovery)
- `brainstorming` → 3 directions in `docs/superpowers/specs/redesign2_concepts.md` (no Q&A park — Justin’s brief was complete)
- `writing-plans` → `docs/superpowers/plans/2026-10-25-redesign2-pass2.md`
- `frontend-app-builder` + Image Gen (`ff-r18-pass2-concept-{a-river,b-daylight,c-spine}.jpg`)
- `test-driven-development` → `tests/ui-redesign2-20261025.test.mjs` (+ Pass-1 test file updated for Pass-2 tokens)
- `verification-before-completion` — Shell **BLOCKED** (see below)
- `playwright` skill loaded; screenshots **BLOCKED**
- Mobbin / WebSearch: **BLOCKED** (rejected / no connector) — concepts grounded in domain refs + Image Gen
- `step-ladder-hostile-audit` checklist against M5 / allowlist / forbidden palette

### Direction selected
**A — Consequence River / Ops Theater** (navy-steel + copper + cyan; horizontal stage ribbon; hero consequence river). Why: clearest break from Pass 1; filmable consequence; Program keeps width.

### Files changed
- `index.html` — removed left sidebar; command mast + stage-nav + theater overview; mounts `planCompare`, `impactConstellation`, `ledgerChain`; BUILD R18
- `src/styles.css` — full rewrite (tokens `--bg #0A1628`, `--copper`, `--cyan`; no `#050505`/`#E5222D` chrome)
- `src/ui-viz.mjs` — river colors + `renderPlanCompare` / `renderImpactConstellation` / `renderLedgerChain`
- `src/app.mjs` — wire new viz; stage-nav router; R18 build tag display
- `server.mjs` — `BUILD_ROUND = "r18"` + tag string (label only; security untouched)
- `vendor/command-center-v3/ForgeFront_PM.html` — Pass-2 palette (visual only)
- `tests/ui-redesign-20261025.test.mjs` — updated for Pass-2 IA/tokens + new IDs
- `tests/ui-redesign2-20261025.test.mjs` — **new** Pass-2 assertions
- Health round assertions in round8–17 / server tests → `r18` / `round18`
- Specs: `docs/superpowers/specs/redesign2_concepts.md`, plan, `demo/redesign_20261025/pass2/README.md`, `BACKUP_NOTE_20261025_0625.md`
- Helper: `tools/pass2-backup-and-verify.mjs`

### Allowlist
No **new** static asset paths. Existing `src/ui-viz.mjs` already allowlisted. Security allowlist code otherwise untouched.

### Capabilities preserved (M5)
All prior IDs/controls/pages remain reachable via horizontal stage nav (same `data-page` / hash router). Program iframe + ForgeFront_PM still served.

### Ledger tamper banner
If UI shows `DIVERGED_FROM_MEMORY`: **reported only** — ledger data/logic not modified.

### Test / screenshot / backup result
**BLOCKED — Shell User Rejected this session** (parent + subagent). `npm test`, browser smoke, Playwright screenshots, and `*.bak_20261025_0625` Copy-Item could not run. Expected when Shell restores: prior suite green + Pass-2 tests; screenshots under `demo/redesign_20261025/pass2/`.

## Pass 3 ground-up redesign 2026-10-25 (~07:07) — Calm Gray Plant HMI

**Mandate:** Justin rejected Pass 1 and Pass 2 as generic AI-slop wrappers. Pass 3 replaces Pass-2 IA (title + button row + hero area chart + stat tiles + timeline / stage ribbon) with five research-backed moves: ISA-101 plant view, NASA Open MCT time conductor, F1 strategy gapper, Palantir-style editable AI action, Crew Dragon two-key consent + dense ledger. Front-end only; M5 DOM ids kept; no CSP/consent/ledger/server logic weaken; no git/deploy/tunnels/secrets.

### Skills used (logged)
- `using-superpowers` (skill discovery / priority)
- `brainstorming` (design locked from Justin’s complete Pass-3 brief — no Q&A park per hard instructions)
- `writing-plans` → `docs/superpowers/plans/2026-10-25-pass3-plant-hmi.md`
- `frontend-app-builder` (loaded; Image Gen skipped — user forbade glow/neon/gradients and gave exact ISA-101 moves; GenerateImage also requires explicit user image ask)
- `test-driven-development` → updated `tests/ui-redesign-20261025.test.mjs`, `tests/ui-redesign2-20261025.test.mjs`, new `tests/ui-redesign3-20261025.test.mjs`
- `verification-before-completion` — Shell **BLOCKED** (see below)
- `playwright` skill loaded; screenshots **BLOCKED** (no Shell)
- `step-ladder-hostile-audit` self-check: M5 ids, allowlist, ARM/COMMIT wired to existing consent handlers, no security code edits beyond not touching server

### Direction
**Calm Gray Plant HMI** — warm flat gray (`#C8C4BC`), alarm red `#B42318` only for disruption/tamper; shape+text for impacted orders; bottom time conductor with URL hash `#page/beat`; strategy gapper vs do-nothing; staged Muse Spark action card with citation chips; ARM then COMMIT.

### Files changed
- `index.html` — plant-hmi shell, page-index (compact secondary), plant schematic + band values, strategy gapper mounts, action card params, time conductor footer, ARM/COMMIT labels on existing consent button ids
- `src/styles.css` — full Pass-3 rewrite (no Pass-2 navy/copper/cyan chrome; no glow/gradients/glass)
- `src/ui-viz.mjs` — plant schematic, time conductor, F1 gapper, order sparklines, dense ledger; keep `consequenceSeries`
- `src/app.mjs` — wire viz + hash beat scrubber + citation chips + action plan select; consent copy ARM/COMMIT only
- `vendor/command-center-v3/ForgeFront_PM.html` — calm-gray tokens (visual only)
- Tests: pass1/pass2 layout assertions updated for Pass 3; `tests/ui-redesign3-20261025.test.mjs` added
- Spec/plan: `docs/superpowers/plans/2026-10-25-pass3-plant-hmi.md`
- Backup note: `BACKUP_NOTE_20261025_0707.md`

### Allowlist
No **new** static asset paths. Existing `src/ui-viz.mjs` already allowlisted. Security allowlist / consent / ledger / CSP code otherwise untouched.

### Capabilities preserved (M5)
All prior IDs/controls/pages remain reachable via compact page index + hash `#page/beat`. Consent still `issueToken` → `/api/consent/review`, `confirmApproval` → `/api/consent/confirm`. Program iframe + ForgeFront_PM still served.

### Test / screenshot / backup result
**BLOCKED — Shell User Rejected this session** (parent + subagents). Could not run `npm test`, browser smoke, Playwright, or create `*.bak_20261025_0707` via Copy-Item. See `BACKUP_NOTE_20261025_0707.md`. Expected when Shell restores: prior suite green + Pass-3 tests.

## Pass 3b palette fix 2026-10-25 (~07:21) — Neutral dark gray HMI

**Mandate:** Justin rejected Pass-3 warm beige/light gray (`#C8C4BC` family) as too bright. Pass 3b darkens to a desaturated neutral gray scheme (no warm tint), folds the band-row metrics into the plant rail, removes the duplicate schematic `page-jump` row (page index already covers nav), and fixes R7-SL-11 unescaped `href` in cite chips via `safe(href)` (markup fix, not test change).

### Skills / tooling
- Phase gate: step-ladder hostile audit skill path unavailable this session (`<LOCAL_PATH_REDACTED>` missing); continued with AGENTS.md + build-standards + verify-before-stating.
- No security/server/consent/ledger logic edits; no new static paths; no git; no deletes.

### Palette (WCAG AA–oriented on dark)
| Token | Value |
|---|---|
| page bg | `#2B2E31` |
| panels | `#34383C` |
| raised | `#3D4146` |
| hairline | `#4A4F55` |
| schematic lines | `#8A9098` |
| primary text | `#E6E8EA` |
| secondary | `#A9AFB5` |
| labels (uppercase small mono) | `#8C939A` |
| alarm (disruption) | `#D9534F` |
| tamper (amber only) | `#E0A030` |
| UI font | Inter / system-ui (CSP `font-src 'self'` — no CDN) |
| mono | IDs, hashes, ledger only |

ISA-101: normal state gray-on-gray; alarm red + shape/text for impacted items; tamper uses amber. No glow, gradients, neon, purple.

### Files changed
- `index.html` — theme-color `#2B2E31`; band-row removed; metrics folded into `.plant-metrics` in plant rail; `page-jump` removed
- `src/styles.css` — Pass 3b tokens; `color-scheme:dark`; plant-metrics; tamper banner/ledger-status.bad → amber; labels mono `#8C939A`
- `src/ui-viz.mjs` — COL tokens dark-neutral; ledger integrity stroke uses amber
- `src/app.mjs` — cite chip `href="${safe(href)}"`; alarm class on `.plant-metric`
- `vendor/command-center-v3/ForgeFront_PM.html` — matching dark tokens (visual only)
- Tests: `tests/ui-redesign-20261025.test.mjs`, `ui-redesign2-20261025.test.mjs`, `ui-redesign3-20261025.test.mjs` assert `#2B2E31` / `#D9534F` / `#E0A030` and forbid beige + band-row/page-jump
- Plan: `docs/superpowers/plans/2026-10-25-pass3-plant-hmi.md` Pass 3b note

### Explicitly untouched
Security allowlist, session/CSRF, consent envelope, ledger HMAC/verify, server routes, Muse Spark operationalRelease path.

### Verify
**BLOCKED — Shell User Rejected** this Pass-3b turn (could not run `npm test` or browser smoke). Static hostile audit from file reads: palette tokens present in `styles.css` / `ui-viz.mjs` / `ForgeFront_PM.html` / `index.html` theme-color; no `#C8C4BC`/`#B42318` left in product markup/CSS/viz; `band-row`/`page-jump` absent from `index.html`; cite chip uses `safe(href)`; M5 metric ids still present inside `.plant-metrics`. Re-run `npm test` + smoke when Shell works.

