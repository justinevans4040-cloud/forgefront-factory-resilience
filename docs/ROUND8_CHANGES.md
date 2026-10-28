# Round 8 — claim-drift audit closure + capability upgrades

Base: round 7 (`6b65a6b`). All 27 items from the round 7 claim-drift audit are closed. Rule applied:
**make the claim true with real capability**; reword only what cannot exist yet (live Muse Spark key).

## The 27 audit items

| # | Item | Resolution | How | Test |
|---|------|-----------|-----|------|
| H1 | Consent circular (accepted fake plans, "teleport") | **Made true** | Two-step `/api/consent/review` → `/api/consent/confirm`; server recomputes plan via `buildPmContextFromState` at both steps and compares plan hash + scenario hash; HMAC token bound to session; operator bound to session; unknown plan → 404; token TTL 120 s, single use (jti consumed); approvals carry an HMAC-sealed envelope with TTL ≤ 15 min and a persisted single-use nonce; single-step `/accept` → 410 | `round8` H1 ×4, `security-stepladder` R4, `round2`, `pm-api` |
| H2 | Ledger tamper detection weak, boot-only | **Made true** | HMAC-keyed entries (`LEDGER_HMAC_KEY` or local 0600 key file), HMAC head anchor (catches truncation), `/api/audit/verify` re-reads the file from disk, periodic verify every 30 s, in-memory head comparison, consent fails closed (423), UI chip + "Verify ledger now"; wording "hash-chained, tamper-evident", limits documented | `round8` H2 ×4 |
| H3 | Muse Spark branding on canned text | **Labeled + live path built** | "Sample mode (no live Muse Spark key)" on pill, button, loading text, sidebar, brief header, event log, ledger detail, export; model id `fixture-template`; live path = OpenAI-compatible tool-calling loop, switches on with `MODEL_API_KEY` | `round8` H3, live-path mock test, smoke |
| H4 | Kanban "due nullh" | **Fixed** | Reads `projectDurationHours`, integer due hours, throws if CPM missing; "1 late job" pluralization | `round8` H4, `pm-api`, smoke |
| H5 | PDF upload fails on normal PDFs | **Made true** | Dependency-free parser: FlateDecode (node:zlib), object streams, Type0/Identity-H + ToUnicode CMaps, TJ/Tj/'/", line structure; bundled Chrome-printed sample PDFs + "Load sample PDF" button | `round8` H5 ×3, smoke |
| H6 | Claim meter stale / checker weak / client registry | **Made true** | Meter re-renders immediately; whole-token numeric equality, spelled-out numbers, entity + commitment checks; registry rebuilt server-side; "Run adversarial brief" proves blocking (6/8 sentences blocked with reasons) | `round8` H6 ×3, smoke |
| M1 | Badge stuck on ACCEPTED after second shock | **Fixed** | Invalidation flag computed before reset → incident REOPENED (stays until re-accept); server revoke + `CONSENT_INVALIDATED`; server also rejects stale scenario hash (409) | `round8` M1 ×2, `intake-graph-incident`, smoke |
| M2 | Little's Law promised, not rendered | **Made true** | Per-cell table: λ, W, baseline W, L, queue wait, utilization, `|L − λW|` | smoke |
| M3 | Little's Law circular | **Made true** | L measured by event sweep over arrival/departure timeline; λ and W measured separately; arrivals = material release hours | `round8` M3, `scenario-realism` |
| M4 | Old brief stays after scenario change | **Fixed** | Any scenario change clears the brief, marks it stale, resets meter to "—" | smoke |
| M5 | CPM Δ mostly 0h, CPI unlabeled | **Made true + labeled** | Added impacted-job finish Δ (varies per plan), "CPM finish Δ (shop)" tooltip, "CPI (synthetic)" on cards and table | `round8` M5 |
| M6 | "Meta" wording in fixture mode / export | **Fixed** | Mode-aware event log + export `metaBrief.modeLabel` | `round8` H3 |
| M7 | SEC doc statuses inaccurate | **Fixed** | SEC-02/04/15/16 reopened → re-fixed with PoCs; SEC-25–30 added; residual limits section | doc |
| M8 | Rate limits missing on some routes | **Made true** | `session`, `read`, `ledger-verify` profiles; every API route limited; session map capped at 500 | `round8` M8 |
| M9 | Smoke skips on Windows, never clicks brief | **Fixed** | CHROME_PATH, Windows Chrome/Edge, macOS, PATH scan; full demo click-through (14 steps) incl. brief, adversarial, consent, Kanban, ledger, shock, re-approve, export; fails on uncaught exceptions | `round8` M9, smoke |
| L1 | Build tag says r4 | **Fixed** | `r8` + commit from `BUILD_INFO.json`; shown in top bar and health; SERVER_START detail | `round8` L1 |
| L2 | Stale test counts | **Fixed** | README, SEC doc, IZZY report updated | doc |
| L3 | Demo port 4173 vs 4310 | **Fixed** | Script documents `PORT=4310` | guard test |
| L4 | "Drag a card" | **Fixed** | "Click → in progress" | guard test |
| L5 | "Expand PM panel" | **Fixed** | "Scroll to Project metrics" | guard test |
| L6 | Ledger actor "operator" | **Fixed** | Session-bound operator name on KANBAN_MOVE, META_BRIEF, PDF_INTAKE, consent entries | `round8` L6 |
| L7 | Fixture model id looks like Meta | **Fixed** | `fixture-template` | `round8` H3 |
| L8 | `OCR_FAIL_UNREADABLE` | **Fixed** | `TEXT_LAYER_UNREADABLE` + honest message; `ENCRYPTED_PDF`, `NOT_A_PDF` | `round8` L8 |
| L9 | Reallocate card with 0 units reads oddly | **Fixed** | State-driven note ("Substitute lot on hold — 0 qualified units…") | browser walkthrough |
| L10 | "Late orders" counted whole shop | **Fixed** | "Late jobs (shop-wide)" + tooltip | browser walkthrough |
| L11 | "CLOSED" overstated | **Fixed** | "CLOSED · CHECKED FIELDS MATCH" + tooltip | smoke |
| L12 | Weak consent secret fallback | **Made true** | Hard-coded fallback removed; random 256-bit per-process secret; production requires configured secret | `round8` L12 |

## Round 8+ capabilities (from Justin's Athere Mesh v4/v4.1 and Britt Enterprise designs)

| # | Capability | What is real | Where | Tests / smoke |
|---|-----------|-------------|-------|---------------|
| a | **Consent envelope** | Approval sealed with HMAC over planId + server-recomputed **plan-parameter hash** (cost, fee, stock, late jobs, every job allocation and release hour, all assumptions) + scenario hash + session digest + operator + nonce + idempotency key; TTL clamped to **≤ 15 min**; nonce appended to `consent-nonces.jsonl` **before** the grant and re-seeded from the ledger at boot, so replays fail after restarts too. Every Kanban request re-verifies the envelope. | `src/consent-gate.mjs`, `src/security/nonce-store.mjs`, `server.mjs` | `(a)` ×4; smoke "consent envelope shown" |
| b | **Deterministic-first resolution ladder** | `/api/ask`: rung 1 = 12 deterministic engine resolvers (cost, schedule, CPI/SPI, WSJF, cell flow, impact, certificate fields, action refusal); rung 2 = cache of *verified* Muse answers keyed by scenario hash + normalized question; rung 3 = Muse Spark (live tool loop, or Sample-mode planner over the same tools) for narrative synthesis. Every answer carries provenance (ENGINE / CACHE / MUSE SPARK) and the ladder trace; the ledger records **why the engine was not enough** (`NEEDS_NARRATIVE_SYNTHESIS` / `NO_RESOLVER_MATCH`). | `src/resolution-ladder.mjs`, `server.mjs`, Ask box in the AI panel | `(b)` ×3; smoke "ask ladder" |
| c | **Prove it judge panel** | `/api/prove-it` runs five real checks against the running server with probe sessions: expired approval → 403 `CONSENT_EXPIRED` + `TOKEN_EXPIRED` + `APPROVAL_EXPIRED`; replay → `TOKEN_REPLAY` + nonce found by a fresh store on disk; tampered ledger **copies** → `HASH_MISMATCH` / `MAC_INVALID` / `TRUNCATED` while the live ledger still verifies; hostile intake → threats flagged, 0 approvals / boards / consent entries; engine run in a child process with fetch/net/tls/http/dns/udp disabled reproduces the server's output digest. | `src/prove-it.mjs`, `tools/network-off.mjs`, `tools/engine-offline-check.mjs` | `(c)` ×4; smoke "Prove it 5/5" |
| d | **Conflict arbitration** | JS port of Britt Enterprise `ConflictResolver` (8 weighted factors, `resolveMargin` 0.08, `minimumWinnerScore` 0.55 → MERGED / RESOLVED / ESCALATED / UNRESOLVED_CONFLICT). Applied to (1) shocks competing for one Haas cell — e.g. EC-400 outage backlog vs the material hold — with factors from release hours, material status, priority, slack and simulated two-job sequence lateness, escalating to the human operator when two critical jobs collide; (2) every brief sentence vs engine evidence. | `src/arbitration.mjs`, `/api/arbitration`, brief response, Arbitration panel | `(d)` ×4 (incl. the 4 Python test cases); smoke "AI-vs-engine arbitration", "EC-400 contention" |
| e | **Mission chain** | Every ledger entry has a typed `forgefront.event.v1` envelope (event_id, trace_id, kind, parent_event_id, idempotency_key) inside the hashed body. Missions run intent → plan → approval → effect → outcome (SUPERSEDED / EXPIRED / REVOKED / RECOVERY_EXECUTED / INCIDENT_CLOSED after a server re-check). Approvals and Kanban moves take `Idempotency-Key`: retries replay the original result, reuse with a different body → 422. `/api/mission` verifies order, parent links and key uniqueness. | `src/mission.mjs`, `src/security/idempotency.mjs`, `server.mjs`, Mission panel | `(e)` ×5; smoke "mission chain", "INCIDENT_CLOSED" |

Limits stated plainly: shock contention covers the outage cell (the scenario's only cell-level disruption) — other cells show "no contention" until two shocks touch them; the answer cache and idempotency store are in memory (the ledger is the durable record); arbitration never changes the schedule — it informs the human decision.

## Capabilities added beyond the audit

1. **Server-grounded Muse Spark tool calling** — five read-only engine tools (`get_incident_summary`, `list_recovery_plans`, `get_plan_metrics`, `get_wsjf_priorities`, `get_cell_flow`), multi-step loop (≤4 rounds, ≤6 calls/round, 30 s timeout), configurable `MODEL_API_BASE`/`MODEL_NAME`, SSRF-guarded; also works with local Llama via Ollama.
2. **Reasoning/tool trace** shown in the UI, stored in the ledger detail and the export.
3. **Evidence chips** inline on every brief sentence; registry size/hash and scenario hash in the footer.
4. **Adversarial red-team button** with per-sentence block reasons.
5. **Scenario fingerprint** (`src/scenario-hash.mjs`) shared by browser and server; Kanban requests carry `X-Scenario-Hash`.
6. **Consent UX**: session-bound operator, 2-minute countdown, auto-reissue after the operator is known, denial reasons.
7. **Ledger status chip** with on-demand verify and auto re-check.
8. **Bundled sample PDFs** and Chrome/Skia-compatible text extraction.
9. **Measured flow metrics** per cell (queue wait, utilization, peak WIP).
10. **Rules files** `.cursor/rules/build-standards.mdc` and `AGENTS.md`.
11. **Consent envelope** with plan-parameter hash, ≤15-min TTL, persisted single-use nonce (a).
12. **Ask ForgeFront** deterministic-first ladder with ENGINE / CACHE / MUSE SPARK provenance and logged escalation reasons (b).
13. **Prove it** live judge panel, 5 real checks including a network-off engine run (c).
14. **Conflict arbitration** (Britt port) for shock contention and AI-vs-engine claims (d).
15. **Mission chain** typed events + idempotent approvals and Kanban moves (e).
16. **Injection reporting on `/api/intake`** with ledgered quarantine and zero actions.
