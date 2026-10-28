# Pass 3 — Calm Gray Plant HMI (2026-10-25)

Ground-up replacement of Pass 2 Consequence River / Ops Theater.

## Five moves
1. ISA-101 plant schematic (gray normal; alarm red + diamond/HOLD on disruption)
2. Bottom time conductor; hash `#page/beat` (beats: disruption, analysis, options, consent, ledger)
3. F1 strategy gapper + 40-order sparklines (engine schedules)
4. Muse Spark as editable staged action + citation chips (no chat bubble)
5. ARM → COMMIT on existing HMAC consent; dense monospace ledger

## Deep-link examples
- `#overview/disruption`
- `#recovery/options`
- `#decision/consent`
- `#decision/ledger`

## Verify (when Shell available)
```bash
npm test
node --experimental-websocket tools/browser-smoke.mjs
```
