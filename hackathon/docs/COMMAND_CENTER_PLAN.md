# The Meta Hackathon build — command center plan

Goal: make the recovery story immediate, focused and backed by actual workflow state.

Architecture: keep the authenticated workflow and deterministic engine intact. A small browser module owns stage navigation, focus transitions and computed story summaries. The guide remains evidence-gated. Each stage has its own scroll area within a fixed branded shell; a persistent rail permits revisiting evidence and proof.

Constraints: zero runtime dependencies; strict CSP; Meta-only AI; explicit Sample; no automatic retry; no live backup-provider calls during verification; no original image changes; no commits or publication.

- [x] Add failing tests for computed incident/results, stage mapping, source-safe progress and focus/scroll/reduced-motion behavior.
- [x] Implement stage module and branded shell; preserve all existing control IDs and API guards.
- [x] Connect each completed action to a focused, highlighted result and a state-derived explanation. Add an explicit offline guide without counting Sample as live-model proof.
- [x] Refresh professional report labels and public operating documents, keeping human review and source-validation semantics.
- [x] Exercise full keyboard, live primary routes and responsive views. Inspect captured desktop/mobile images.
- [x] Run both suites, judge/public-tree/accessibility checks, secret scans and image integrity checks. Record failures honestly, stop owned processes and mirror the report with verified hashes.

Review focus: changed quantities must alter story values; rejected runs cannot advance the guide; results must stay reachable by keyboard; narrow screens must retain stage navigation; provider failures must remain visible with deliberate retry.
