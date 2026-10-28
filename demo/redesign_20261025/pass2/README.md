# Pass 2 redesign evidence — 2026-10-25

## Direction shipped
**Consequence River / Ops Theater** — see `docs/superpowers/specs/redesign2_concepts.md`.

## Concept mockups (Image Gen)
Saved under Cursor project assets (not served by the app):
- `ff-r18-pass2-concept-a-river.jpg` (selected)
- `ff-r18-pass2-concept-b-daylight.jpg`
- `ff-r18-pass2-concept-c-spine.jpg`

## Screenshots
**BLOCKED this session** — Shell/Playwright rejected. When Shell works:

```powershell
New-Item -ItemType Directory -Force demo\redesign_20261025\pass2
# start server on 4173, then capture each #hash page into this folder
```

Expected filenames: `overview.png`, `evidence.png`, `impact.png`, `recovery.png`, `pm.png`, `kanban.png`, `program.png`, `arbitration.png`, `decision.png`, `mission.png`, `proveit.png`.

## Tests
Run `npm test` and save output to `npm_test.txt` here. Helper: `node tools/pass2-backup-and-verify.mjs`.

## Ledger note
If UI shows `DIVERGED_FROM_MEMORY` / tamper banner: **do not** modify ledger data or logic — report only (per Justin).
