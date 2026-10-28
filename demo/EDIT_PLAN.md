# Demo edit plan — script line → clip timestamps

Target runtime: **~127s** (2:07; under 3:00). Clips are VP9 WebM, 1920×1080, with OS mouse + orange cursor overlay (CDP injection). Recorded against **round17** build (audit-only raw prose API + export audit button).

| Scene | File | Duration (ffprobe) | Frames | Script section | Suggested in-clip cues |
|-------|------|--------------------|--------|----------------|----------------------|
| 1 | `01-intro-trust.webm` | 11.6s | 178 | Scene 1 | 0:00 banner + ledger chip visible · 0:04 pan header · 0:08 hold on Sample mode pill |
| 2 | `02-cert-conflict.webm` | 17.6s | 313 | Scene 2 | 0:00 click Inject · 0:03 impact numbers animate · 0:10 hold on consequence map |
| 3 | `03-plans-metrics.webm` | 23.0s | 493 | Scene 3 | 0:00 plans grid · 0:08 scroll to PM metrics · 0:15 Little’s Law table · 0:20 WSJF list |
| 4 | `04-meta-brief.webm` | 26.2s | 531 | Scene 4 | 0:00 Generate brief · 0:06 **DECISION** + **template advisory** · 0:14 raw audit panel (collapsed) · 0:18 adversarial → PARTIAL + dropped advisory count |
| 5 | `05-consent-kanban.webm` | 28.7s | 584 | Scene 5 | 0:00 Review plan · 0:06 issue token · 0:12 type phrase · 0:18 Kanban board · 0:24 card move |
| 6 | `06-prove-it.webm` | 20.1s | 393 | Scene 6 | 0:00 Prove it click · 0:05 results list · 0:12 highlight 5/5 pass · 0:17 ledger still verified |

**Assembly:** Concatenate in order 1→6 with 0.3s crossfade optional. Narration recorded separately from this teleprompter; align VO start of each scene to row “0:00” for that clip.

**Recording method:** `xvfb-run … node --experimental-websocket tools/demo-record-cdp.mjs` (Playwright npm install **BLOCKED** — network ECONNRESET to registry.npmjs.org).
