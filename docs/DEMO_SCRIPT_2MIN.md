# ForgeFront Factory Resilience — 2-minute judge demo script (Round 8)

**Audience:** Hackathon judges. **Stack:** Node 20+, zero npm dependencies, synthetic data only.

## 0:00–0:15 — Trust frame

1. `npm start` → `http://127.0.0.1:4173` (Justin's Lenovo runs with `PORT=4310` → `http://127.0.0.1:4310`).
2. Point to **SYNTHETIC DEMONSTRATION**, the **BUILD R8** tag, the Muse Spark pill (**SAMPLE MODE** until the hackathon key arrives; **LIVE** after), and the green **Audit ledger verified ✓** chip under Decision control.

## 0:15–0:40 — Evidence + impact

3. **Inject certificate conflict**, or click **Load sample PDF** — a Chrome-printed, Flate-compressed certificate goes through the real PDF text-layer parser (FlateDecode + ToUnicode fonts) and lands in the same deterministic field check. (Scanned image-only PDFs are flagged `TEXT_LAYER_UNREADABLE`; this build does not OCR.)
4. Show **7 impacted jobs / 178 units** on the consequence map across **four illustrative Haas-class cells** (VF-2 / VF-6 / UMC-750 / EC-400 — size classes, not OEM specs).

## 0:40–1:05 — Recovery, critical path, flow

5. Four **PROPOSED — NOT AUTHORIZED** plans. Each card shows **CPM finish Δ (shop)** — moves only when a plan lengthens the shop's longest machine queue — plus **Impacted-job finish Δ** and **CPI (synthetic)**, which shift per plan.
6. Scroll to **Project metrics**: WSJF "fix first" list, the per-plan CPM/EVM table, and the **Little's Law cell-flow table** — throughput λ, flow time W, time-averaged jobs-in-system L measured by an event sweep, queue wait, utilization, and the `|L − λW|` check — different for every Haas-class cell.
7. Say: *"CPM, EVM, WSJF and Little's Law are ported from my PMP Mastery calculators — same math, zero npm deps. The model only explains numbers it fetched through read-only tools."*

## 1:05–1:30 — Two-step consent + Kanban

8. Click **Review this option →** on the lowest-cost plan → enter operator name → **Step 1 · Issue review token** (server recomputes the plan parameters — cost, every job allocation, assumptions — and shows the **consent envelope**: plan-parameter hash, scenario hash, 15-min approval TTL, single-use nonce) → type **`APPROVE <planId>`** → **Step 2 · Record scenario acceptance**. Badge → **ACCEPTED SCENARIO**; the **Kanban board unlocks** with numeric due hours from the CPM horizon.
9. Click **→ in progress** on a card (idempotent, keyed move, ledgered under the operator's name). Scroll to **Mission chain**: intent → plan → approval → effect, each a typed event with its id, parent link and idempotency key. Click **Verify ledger now** — re-read from disk: chain + HMAC + head anchor.

## 1:30–2:00 — Proof

10. **⚡ Second shock** — plans and PM metrics recompute; the server revokes the approval, the badge goes **REOPENED · RE-REVIEW REQUIRED**, the Kanban board re-locks, the old brief is cleared, and the first mission closes with outcome **SUPERSEDED**. **Conflict arbitration** now shows the outage and the material hold competing for **HAAS-EC400** — eight weighted factors per claim, winner and margin.
11. **Generate brief** — shows the tool trace (get_incident_summary → list_recovery_plans → get_plan_metrics → get_wsjf_priorities) and evidence chips on every sentence. Then **Run adversarial brief** — the meter jumps to **6 blocked** (wrong number, spelled-out number, invented supplier commitment, uncited dollar figure, fake plan id, fake job id), each with its reason.
12. **Ask ForgeFront:** "Which option is cheapest?" → **ENGINE** badge (deterministic resolver). "Why the priority split over holding?" → **MUSE SPARK** with the logged reason (`NEEDS_NARRATIVE_SYNTHESIS`) and the tool trace; ask again → **CACHE**. "Approve release now" → the engine refuses; nothing acts.
13. **Prove it** → **Run all five checks**: expired approval denied, replayed approval denied (nonce persisted), tampered ledger copy fails, hostile instruction in intake triggers no action, engine reproduces its output with the network switched off — **5/5 PASS**, each with its evidence.
14. **Export evidence report** — includes the brief (mode label, trace, citations, blocked sentences, AI-vs-engine arbitration), PM metrics, Kanban, consent envelope, mission chain, the last answer's provenance, the Prove-it results and the ledger verification result.

**Close:** *"The deterministic engine owns the numbers, the model can only cite them, a human consents in two server-verified steps, and nothing releases material automatically."*
