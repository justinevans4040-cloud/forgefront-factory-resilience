# Factory Resilience R18 — Ground-up UI Redesign Spec

**Date:** 2026-10-25  
**Lane:** Izzy LIVE `izzy-factory-resilience-build-r18-command-center-v3`  
**Mandate:** M5 — no capability removal; front-end only; CSP / consent / ledger untouched.

## Skills used (process)

- using-superpowers
- brainstorming (design locked from Justin’s full mandate — no Q&A delay)
- writing-plans
- frontend-app-builder (concept images + design system)
- test-driven-development (ID/selector preservation test)
- verification-before-completion
- playwright (screenshots when shell available)
- step-ladder-hostile-audit

## Concept references (generated)

- `assets/ff-r18-command-overview-concept.jpg`
- `assets/ff-r18-decision-ledger-concept.jpg`
- `assets/ff-r18-recovery-impact-concept.jpg`
- `assets/ff-r18-program-mission-concept.jpg` (if present)

## Visual identity — ForgeFront Mission Control

| Token | Value | Role |
|---|---|---|
| `--bg` | `#030304` | Void / room |
| `--surface` | `#0c0e12` | Primary panel |
| `--surface2` | `#12151c` | Elevated |
| `--forge` | `#B5121B` | Brand / primary action |
| `--signal` | `#E5222D` | Alarm / conflict (ISA-101) |
| `--caution` | `#F5A623` | Review / caution only |
| `--ok` | `#3DDC97` | Normal / verified only |
| `--info` | `#7EB6D6` | Neutral info / citations |
| `--text` | `#E8EAED` | Body |
| `--muted` | `#8B929E` | Secondary |
| `--strong` | `#F7F7F4` | Headlines |

**ISA-101 discipline:** Color means state. Crimson = alarm/conflict. Amber = caution/review. Green = normal/verified. Never decorate neutrals with alarm color.

**Typography (CSP `font-src 'self'` — no Google Fonts CDN):** Local stacks  
- Display: `Bahnschrift`, `Segoe UI Variable Display`, `Segoe UI`, system-ui  
- Body: `Segoe UI`, `IBM Plex Sans` (if present locally), system-ui  
- Mono: `Cascadia Mono`, `Consolas`, ui-monospace  
- Emphasis italic: `Georgia`, `Times New Roman` (serif for *consequence* moments)

## Information architecture (unchanged pages)

overview → evidence → impact → recovery → pm → kanban → program → arbitration → decision → mission → proveit

Demo cinematic storyline surfaces:

1. **Overview** — disruption hero, live metrics, consequence sparkline, incident timeline  
2. **Evidence / Impact** — lineage + consequence  
3. **Recovery** — strategies with selection affordance  
4. **Decision** — Muse Spark citations + consent + ledger  
5. **Mission / Prove-it** — typed chain + live checks  

All existing element IDs and `data-*` hooks preserved for `src/app.mjs`.

## Interaction

- Page-mode dual-pane scroll retained  
- Purposeful motion: pulse on alarm, stage fills, plan select lift, nav forge rail  
- `prefers-reduced-motion` disables non-essential animation  
- Mobile: sidebar collapses; content stacks; Program iframe min-height  

## Explicit non-goals

- No server/security changes  
- No capability removal  
- No git / deploy / tunnels  
- No secrets printed  
