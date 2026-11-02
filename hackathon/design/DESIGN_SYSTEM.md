# Forgefront Factory Resilience — Design System

References studied before this rewrite: Linear (calm dark workspace, hairline borders, one accent), Vercel dashboard (sparse chrome, clear hierarchy), Datadog service map (failing path lit / rest dimmed, click-to-isolate), Grafana / Stripe ops dashboards (tabular metrics, restrained status color), Palantir / Tesla factory UI concepts and manufacturing command-center shots (3-second state read, andon palette).

This system exists because scaling every label and glow made the product look jumble-heavy. Calm beats loud.

## Brand

- Black floor `#050705`
- Panel `#0B100B` · raised `#121A12`
- Hairline border `rgba(197,204,212,.22)`
- Brushed silver `#C5CCD4` (headings, machine bodies, secondary)
- Emerald accent `#A8F04A` — **one accent per viewport**
- Official logo: black / emerald / silver only; never recolored

Stopped / offline states use silver hatch + `×` + plain `OFFLINE` text. Never red chrome in product UI.

## Type scale (system sans)

| Token | Size / line | Use |
| --- | --- | --- |
| `micro` | 12 / 16 | Uppercase labels only |
| `body` | 16 / 24 | All readable copy (minimum) |
| `title` | 18 / 24 | Panel titles |
| `stage` | 22 / 28 | Stage headline |
| `metric` | 26 / 32 tabular | Key numbers |
| `display` | 32 / 36 | Rare hero moments |

No label under 12px. Header step tabs ≥16px and span the header.

## Spacing (8px grid)

`4 · 8 · 16 · 24 · 32 · 48`. Panel padding 16. Node text inset ≥12 from every box edge. Stage bands reserve gutters so connectors never cross glyphs.

## Layout

1. Slim header (logo left · equal-width step tabs · Lock recovery room)
2. Main: factory scene ≥70% of stage · reserved callout / station / job / option bands · compact side inspector
3. 56px action bar: Back · status · one primary

One plain headline sentence states the problem. Side rail shows a few plain-English cards; raw IDs only in accordion/popover. No unexplained scrollbars. No empty visible boxes.

## Components

- **Cards / panels:** hairline border, soft lift, no stacked neon frames
- **Primary button:** emerald fill, dark text, one per viewport
- **Authorize wall:** modal `Authorize this decision` after one-click Approve
- **Evidence cards:** plain English (“Certificate says 120 / Receiving counted 80”)
- **Factory nodes:** three status lines max, text inset, bevels inside the rect
- **Connectors:** orthogonal routes in band gutters only; failing path emerald; everything else dimmed (~0.4 opacity)
- **Glow:** single restrained emerald on the active failure/recovery path; never overlapping bloom stacks

## Motion

- 160–220ms ease-out for selection / panels
- One 240ms route trace on real state change, then static
- Living material flow only on the active conveyor
- Shock: hatch sweep + station goes dark; ripple downstream
- `prefers-reduced-motion`: remove transitions and flow; hatch + `×` + OFFLINE still carry meaning
- Target 60fps; cascade uses LOD/batching, never fewer machines

## Screen quality bar

Judge every screen as a senior product designer would. Fail if:

- text touches borders or connectors
- glows bleed into each other
- boxes-on-a-grid with no story
- clipped text, empty chips, or bare “Britt” (must be **The Britt**)

## What you will see

Incident → Investigate → Decide → Shock → Project board (The Britt) → Proof, plus full-shop cascade. Every control opens a designed, purposeful screen.
