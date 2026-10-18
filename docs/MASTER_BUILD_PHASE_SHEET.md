# MASTER BUILD PHASE SHEET
## ForgeFront Factory Resilience | Meta Global AI Developer Hackathon 2026

**Document ID:** FFR-MBPS-001  
**Version:** 1.0 | **Established:** 2026-10-17 | **Status:** ACTIVE PLAN, NOT A CLAIM OF COMPLETION  
**Authority:** This is the authoritative execution sheet. [Existing short roadmap](BUILD_ROADMAP.md) is retained for history; [verified foundation evidence](BUILD_VERIFICATION_2026-10-17.md) governs what is already proven.  
**Project owner / final authority:** Justin Evans, ForgeFront Systems / Wake Industries.  
**Repository:** [justinevans4040-cloud/forgefront-factory-resilience](https://github.com/justinevans4040-cloud/forgefront-factory-resilience) (private).  
**Product name:** ForgeFront Factory Resilience is a **working title**, not approved branding.  
**Change-control rule:** Plan changes, release decisions, external submissions, integrations and protected-IP disclosure require owner authorization. This sheet does **not** authorize changes to any original project or infrastructure.

> **MISSION:** A single manufacturing evidence conflict must cause an understandable, verifiable chain of consequences: identify the disputed fact, find the affected work, calculate competing recovery options, respond to changing conditions, and create a human-owned decision record. The demo must show actual working behavior, not fabricated telemetry, claims or video effects.

---

## 1. THE SIX QUESTIONS

| Question | Answer |
|---|---|
| **WHAT** | A manufacturing disruption-investigation and constrained recovery-planning application, initially for a representative aerospace material-certification incident. |
| **WHY** | One disputed material record can threaten many production orders. Investigation is fragmented across certificates, orders, inventory, scheduling and approvals. We make the consequences and defensible choices visible in one place. |
| **WHEN** | Foundation: **Oct 17ΓÇô25, 2026**. Competition implementation: **Oct 26ΓÇôNov 4, 2026**. Submission cutoff: **Nov 4, 9:00 PM ET / 6:00 PM PT**; internal target: **Nov 4, noon PT** to preserve contingency. Follow-on work starts after the event. |
| **WHERE** | Authoritative source and proof: **this private GitHub repository**. Development and verification: approved isolated workspace and controlled local browser tests. Final judge access: a separate, approved reviewer-safe deployment. No production system is assumed connected. |
| **WHO** | **Owner / product director:** Justin, choosing scope, granting approvals, providing participation/credential access and authorizing publication. **Implementation:** the authorized build operator/assistant in this new repository. **Verification:** independent tests and a documented audit pass, not a fictitious assigned employee. **Meta:** third-party API/model and event organizer, not a member of our team. |
| **HOW** | Deterministic document checks + evidence provenance + production relationship graph + constrained scheduling + Meta-powered explanation/reasoning + human confirmation + testable incident replay. Build vertical slices, attach proof to each phase and close gates in order. |

### Working outcome, in one sentence

**From ΓÇ£Heat number does not matchΓÇ¥ to ΓÇ£These seven jobs are exposed, here are the facts, these are the feasible recovery paths, this is what changes if another constraint fails, and this is the operator's documented decision.ΓÇ¥**

The judging moment must include a **second surprise change**. A static dashboard is not the differentiator. The product must revise its conclusions while preserving evidence and the human approval boundary.

---

## 2. EVENT AUTHORITY AND TIMING

Source of competition facts: [Meta's official hackathon page](https://dev.meta.ai/events/global-hackathon). As of **October 17, 2026**:

| Event | Official published time | Owner action |
|---|---|---|
| Applications open | Oct 13, 9:00 AM ET | Registration is not yet verified in this repository. |
| Application cutoff | Oct 25, 11:59 PM ET **or earlier at the 20,000-applicant cap** | Owner completes application, retains receipt. |
| Approval notification by | Oct 26, 9:00 AM ET | Owner checks acceptance. Selection must not be assumed. |
| Hackathon starts | Oct 26 | Start event-era change ledger after accepted rules are reviewed. |
| Project submission | Nov 4, 9:00 PM ET | Owner authorizes final entry and submits. |
| Judging | Nov 4ΓÇô8 | Preserve reproducible release and responder contacts. |
| Finals / winners | Nov 9 | Record verified outcome; no assumed result. |

**Two participant tracks** are published: *Indie developer* and *Startup*. Theme alignment: **Push the Frontier** (manufacturing/physical systems), with **Build for Your World** (domain expertise) as supporting context. **Track selection is OPEN** until eligibility and entry structure are confirmed. Meta says official rules will be published before the event. Actual rules, licensing, existing-IP permissions, external dataset disclosure, team rules, required Meta technology and exact submission fields must be logged verbatim from the final official source before an event-era submission is deemed eligible.

**Important version boundary:** Pre-Oct-26 code, prior ForgeFront IP and new Oct-26ΓÇôNov-4 contributions require a truthful provenance record. A working integration path is not evidence of an authenticated external API call.

---

## 3. ACTUAL STARTING POINT (EVIDENCE SNAPSHOT)

| Capability | Status on Oct 17 | Evidence | What is *not* yet proven |
|---|---|---|---|
| 40-order/4-cell synthetic production world | **VERIFIED FOUNDATION** | [scenario data](../src/scenario.mjs), [13/13 test record](BUILD_VERIFICATION_2026-10-17.md) | Actual customer manufacturing data |
| Certificate field parsing and heat discrepancy | **VERIFIED FOUNDATION** | [engine](../src/engine.mjs), test suite | Arbitrary supplier PDF/layout/image interpretation |
| 7 traced impacted jobs, 178 units | **VERIFIED FOUNDATION** | [tests](../tests/engine.test.mjs) | Multi-document, multi-level assembly dependency tracing |
| Four scenario recovery strategies | **VERIFIED FOUNDATION** | [engine](../src/engine.mjs), tests | Independently validated real supplier lead times, true global optimization |
| Operator plan acknowledgement and report | **VERIFIED FOUNDATION** | [app](../src/app.mjs), browser audit | Multi-user identity, durable cross-session approval, material release |
| Responsive desktop/mobile interface | **BROWSER-VERIFIED** | [desktop evidence](evidence/factory-resilience-desktop.png), [mobile evidence](evidence/factory-resilience-mobile.png) | Physical Samsung S24 acceptance |
| Meta Muse Spark 1.3 API route | **IMPLEMENTED, UNAUTHENTICATED** | [server](../server.mjs), missing-key behavior tested | A credentialed, successful inference with captured evidence |
| End-to-end competition build | **NOT COMPLETE** | This phase sheet | Production deployment, accepted submission, live Meta proof |

**Audit snapshot:** 13 automated tests passed, syntax checks passed, desktop browser and 390px mobile browser interaction gates passed. Source tree is canonical in GitHub. The temporary Lenovo development runtime used for verification was stopped and removed; do not represent the app as presently hosted publicly.

### Evidence doctrine

Status labels in issues and documents have fixed meanings:

- **NOT STARTED**: no qualifying deliverable.
- **IN PROGRESS**: code/work exists but acceptance gate is open.
- **BLOCKED**: missing external input or prerequisite; state who must resolve it.
- **VERIFIED**: intended behavior passed tests with retained results and source revision.
- **CLOSED**: verified deliverables are committed, reviewed, and owner sign-off is recorded where required.

Do not mark something complete because code, a diagram, an API route, or a screenshot merely exists.

---

## 4. PHASE COMMAND BOARD

| Phase | Dates | Mission | Responsible party | Current gate |
|---|---|---|---|---|
| **P00** | Oct 17 | Isolated foundation and baseline proof | Build operator; verification | **VERIFIED** |
| **P01** | Oct 17ΓÇô25 | Entry, rules, track, IP and access authority | **Owner** + build operator documentation | **BLOCKED: acceptance/rules unconfirmed** |
| **P02** | Oct 17ΓÇô25 | Freeze the synthetic factory truth and adversarial benchmark | Build operator; verification | **IN PROGRESS** |
| **P03** | Oct 26ΓÇô27 | Multi-document ingestion and contradiction detection | Build operator | NOT STARTED |
| **P04** | Oct 27ΓÇô28 | Real Meta inference, grounding and measured usefulness | Build operator; **owner credentials** | **BLOCKED: authenticated access** |
| **P05** | Oct 28ΓÇô29 | Cross-document dependency graph and impact propagation | Build operator | NOT STARTED |
| **P06** | Oct 29ΓÇô30 | Resource-constrained recovery and counterfactual comparison | Build operator | NOT STARTED |
| **P07** | Oct 30ΓÇô31 | Evidence-driven incident workflow and interruption recovery | Build operator | NOT STARTED |
| **P08** | Oct 31ΓÇôNov 1 | Operator-facing decision cockpit and reports | Build operator + owner UX review | NOT STARTED; foundation exists |
| **P09** | Nov 1ΓÇô2 | Hostile validation and physical-device rehearsal | Verification + owner S24 test | NOT STARTED |
| **P10** | Nov 2ΓÇô3 | Judge demonstration, artifacts and release candidate | Build operator; owner reviews | NOT STARTED |
| **P11** | Nov 4 | Final release gate and submission | **Owner** | NOT STARTED |
| **P12** | Nov 5ΓÇô9 | Preserve evidence, judging/finals and outcome | Owner + build operator | FUTURE |
| **R1ΓÇôR3** | After event; schedule requires approval | Pilot ΓåÆ integrations ΓåÆ industrial product | Owner-directed future team | FUTURE / OUT OF COMPETITION SCOPE |

**Clock:** Dates are dates of **planned work**, not automatic scheduled jobs or claims of completed work. The precise owner-side registration and submission deadlines above are actual event dates. Any approved change to timing requires updating this table, the relevant phase issue and the change log.

---

## 5. EXECUTION SHEETS: WHAT, WHY, WHO, WHERE, WHEN, HOW, GATE

### P00 ΓÇö Isolated foundation and reproducible proof
- **When:** October 17. **Who:** Build operator and independent verification. **Where:** Private repo, checked on Windows/Chrome.
- **What:** Standalone 40-order/4-cell simulation, material certificate check, job impact, four recovery candidates, acknowledgement, export, responsive dashboard.
- **Why:** Create a functioning control case before adding unreliable third-party model and document interpretation variables.
- **How:** Immutable synthetic scenario in `src/scenario.mjs`; deterministic interpretation and schedules in `src/engine.mjs`; UI and tests in `src/app.mjs`, `tests/`; independent Chrome audit script.
- **Deliverables:** Committed source, 13 green tests, browser audit script, real desktop/mobile screenshots, signed-off foundation verification file.
- **Exit gate:** All baseline checks reproduce from a clean clone. **VERIFIED 2026-10-17.**
- **Next dependency:** P02 freezes truth; P01 resolves event entry. **Do not reopen P00** for discretionary polish.

### P01 ΓÇö Competition entry, rights and dependency clearance
- **When:** Oct 17ΓÇô25, with owner application submitted **before Meta's earlier-of cutoff**.
- **Who:** **Owner** applies and chooses track; build operator records factual status and performs read-only rules analysis.
- **Where:** Meta official application/event page, then `docs/competition/` for redacted confirmation, no credentials or identity documents in git.
- **What:** Confirm accepted entry, participant track, team scope, allowed pre-existing IP, allowable model access, attribution, public/private code obligations, ownership, prize eligibility, and final deliverable format.
- **Why:** An impressive but ineligible or improperly disclosed build is not a viable competition entry.
- **How:** Review the official rules when released. Record source URL, retrieval date, section/rule reference, owner decision, and resulting build restrictions. Only store safe redacted receipts.
- **Deliverables:** `docs/competition/ENTRY_AND_RULES_REGISTER.md`, competition track decision and source-proven rule summary, accepted application confirmation if received.
- **Exit gate:** Owner explicitly confirms entry and track; all required rules accepted and impact assessed. **Current blocker: neither accepted entry nor final official rules is demonstrated.**
- **Fallback:** Development may continue as independent IP; do not claim a valid hackathon submission until the gate closes.

### P02 ΓÇö Source-of-truth contract and adversarial factory benchmark
- **When:** Oct 17ΓÇô25.
- **Who:** Build operator designs; independent test lane verifies; owner confirms domain realism.
- **Where:** `fixtures/`, `schemas/`, `tests/`, `docs/evidence/` in this repo only.
- **What:** Define canonical order/lot/heat/grade/routing/BOM/machine/quantity/status/approval records; represent known, conflicted, missing, stale and assumed facts; freeze normal and adversarial sample packets.
- **Why:** Meta explanation and downstream scheduling are meaningful only if they are compared against facts with unambiguous source identity.
- **How:** Build a small synthetic aerospace micro-factory with a 40-order base, seven-job material conflict, alternate material, machine outage, missing source, contradictory PO, capacity squeeze, wrong unit and amended certificate. Write expected outcomes before training or tuning behavior.
- **Deliverables:** Scenario manifest with provenance, normalized field schema, dependency map format, golden expected-results matrix, versioned assumptions.
- **Exit gate:** ΓëÑ12 adversarial cases replay identically; baseline **40 orders, 7 affected jobs, 178 units** remains reproducible; all invented example figures are labeled synthetic; all conflict outcomes have evidence IDs.
- **Fallback:** Retain single-document mode and explicitly record incomplete multi-document readiness. **Never invent missing fixture evidence.**

### P03 ΓÇö Multi-document evidence intake
- **When:** Oct 26ΓÇô27.
- **Who:** Build operator. **Where:** Isolated intake service and data package.
- **What:** Accept and normalize material certificate, purchase order, receiving/inventory record, production routing, job sheet and simple customer delivery record.
- **Why:** A factory investigation cannot be grounded in one cert; the valuable decision depends on agreement or contradiction between *different* records.
- **How:** Build per-document parsers with file identity, extraction method, page/line/cell reference, timestamp, confidence category and raw-source hash. Use deterministic parsing for structured fields. For visual inputs, invoke permitted Meta multimodal processing only once its actual capability and terms are verified. Route unreadable/ambiguous records to review rather than ΓÇ£verified.ΓÇ¥
- **Deliverables:** Evidence inbox, normalized document packets, contradiction drawer, reusable sample document bundle, intake tests.
- **Exit gate:** Complete scenario packet yields the exact baseline facts; deliberately conflicting PO/heat/grade evidence is shown side by side with correct citations; unreadable documents remain UNKNOWN; no original source is overwritten.
- **Fallback:** Text-based sample documents and parsed PDFs as supported, not imaginary OCR or visual understanding.
- **Dependency:** P02 truth contract.

### P04 ΓÇö Real Meta intelligence with grounded measurements
- **When:** Oct 27ΓÇô28, as soon as approved Meta credentials are available.
- **Who:** Build operator runs tests; **owner** provides/authorizes credentials; verification reviews outputs.
- **Where:** Server-side Meta Model API adapter; redacted evals under `docs/evidence/meta/`.
- **What:** Use Muse Spark 1.3 for evidence-limited incident explanation, contradiction reasoning and proposed questions for unresolved facts. Consider SAM 3.1 or Muse Image **only** if there is a decisive, tested visual-document advantage, not for decoration.
- **Why:** This is a Meta AI hackathon. The judges must see authentic Meta intelligence materially improve the investigation, not just an unused model endpoint.
- **How:** Send controlled evidence JSON and explicit missing-data labels; require references to known document IDs; independently verify every model factual statement; benchmark against the deterministic baseline. Handle model timeout and empty/invalid output without corrupting factory state. Keep API keys server-side and excluded from Git.
- **Deliverables:** Successful authenticated inference evidence (redacted model/request metadata), comparative scorecard of grounded explanations, working fallback, visible model attribution in UI.
- **Exit gate:** ΓëÑ20 benchmark prompts, zero invented operational approvals or material-release assertions in accepted results; every cited source ID resolves; repeatable live inference with documented latency and errors. If an answer fails, label it, never quietly pass.
- **Fallback:** Keep the working deterministic experience; label Meta **NOT VERIFIED** and treat hackathon readiness as blocked until actual inference works.
- **Dependency:** P01 credentials/rules + P03 evidence packet.

### P05 ΓÇö Material-to-customer consequence graph
- **When:** Oct 28ΓÇô29.
- **Who:** Build operator, independent test lane. **Where:** `src/`, scenario graph fixtures and UI dependency view.
- **What:** Trace certificate ΓåÆ heat/lot ΓåÆ inventory allocations ΓåÆ jobs ΓåÆ assemblies/deliveries ΓåÆ work centers.
- **Why:** Distinctive value comes from showing *what one discrepancy threatens beyond the original document*.
- **How:** Typed relationships with IDs and source pointers; propagate a HOLD/REVIEW state without discarding unaffected work; track downstream constraints, competing evidence and the difference between proven impact and possible impact.
- **Deliverables:** Expandable cause/consequence view, list of precisely affected jobs and customer commitments, explain-why panel and snapshot export.
- **Exit gate:** Exactly seven affected production jobs in baseline; unaffected jobs stay unaffected; injected second bad lot changes only supported descendants; no orphaned graph edges; each impact can be traced to a document or explicit scenario assumption.
- **Dependency:** P02 + P03.

### P06 ΓÇö Recovery planner, tradeoffs and second shock
- **When:** Oct 29ΓÇô30.
- **Who:** Build operator, audit lane; owner reviews acceptable risk/priority policy.
- **Where:** Calculation engine and recoveries UI.
- **What:** Compare hold/reconcile, expedited qualified supply, approved-stock reallocation, and hybrid response. Recompute on machine downtime, shrinking inventory, lead-time change or priority change.
- **Why:** Detecting trouble is not enough. The winning moment is helping a manufacturer choose a feasible next move and seeing the plan evolve under new constraints.
- **How:** Source-bound inventory, exact quantities and grades, one job at a time per constrained machine, deadline windows, cost assumptions, rejected infeasible paths, Pareto-style cost vs delay vs unresolved jobs. Keep proposal Γëá procurement, scheduling simulation Γëá material release.
- **Deliverables:** Four evidence-based candidate plans, comparative ΓÇ£before/after shockΓÇ¥ table, reason for rejected options, traceable assumed costs, independent numerical tests.
- **Exit gate:** Zero over-allocation and zero double-scheduled capacity in benchmark; changing one input forces recalculation and invalidates stale acceptance; outcomes reconcile to independent expected results.
- **Dependency:** P05 graph, P02 policies and P04 explanation as optional enhancement.

### P07 ΓÇö Coordinated incident mission and recovery state
- **When:** Oct 30ΓÇô31.
- **Who:** Build operator; owner approves any authority expansion.
- **Where:** This repo's isolated incident state engine. **No changes** to Titan, Athere Mesh, PRAXIS or original agents.
- **What:** Track a single incident from DETECTED ΓåÆ TRIAGED ΓåÆ AFFECTED WORK MAPPED ΓåÆ OPTIONS PRODUCED ΓåÆ REVIEWED ΓåÆ ACCEPTED FOR SCENARIO ΓåÆ CLOSED, with BLOCKED and REOPENED states.
- **Why:** A set of disconnected analyses is not an intelligent workflow. The incident must preserve its history as facts change.
- **How:** Append-only event entries, deterministic transitions, versioned evidence, explicit operator actions, safe resume/replay after page restart. Integrate external original IP later by additive adapter only after authority review.
- **Deliverables:** Incident timeline, persistent local scenario history, state/approval transition tests, fault-recovery demo.
- **Exit gate:** An interrupted demo resumes with the correct latest fact revision; no stale plan remains accepted after source or constraint changes; every transition has a cause and actor.
- **Dependency:** P03/P05/P06.

### P08 ΓÇö Operator cockpit and inspection-grade explanations
- **When:** Oct 31ΓÇôNov 1.
- **Who:** Build operator; owner leads operator usability acceptance.
- **Where:** Responsive web UI and operator report output.
- **What:** One-glance incident severity, visible source discrepancy, affected network, recovery options, assumptions, projected consequences, operator approval and printable/downloadable evidence bundle.
- **Why:** Industrial buyers and hackathon judges need to understand the result without an engineer narrating every screen.
- **How:** Clear hierarchy from source ΓåÆ cause ΓåÆ consequence ΓåÆ options ΓåÆ action. Progressive drill-down, evidence citations one interaction away, terminology written for manufacturing operators, large touch targets, readable export, keyboard/mobile testing.
- **Deliverables:** Desktop and S24-ready views, complete report, cold-start walkthrough and documented approval control.
- **Exit gate:** New reviewer can identify what went wrong, affected jobs, evidence, cheapest *feasible* choice, and what is awaiting human approval in under 90 seconds, measured in rehearsal; no false VERIFIED or released status.
- **Dependency:** P05/P06/P07. Current foundation UI is not equivalent to this finished phase.

### P09 ΓÇö Hostile audit and device demonstration
- **When:** Nov 1ΓÇô2.
- **Who:** Independent verifier + owner for actual S24.
- **Where:** Clean cloned repo, Windows Chrome, Galaxy S24, synthetic benchmark suite.
- **What:** Try to break parsing, trace, planning, mission state, model reasoning and responsive interaction.
- **Why:** The product's differentiator is accountable decisions. One confident false claim can erase its credibility.
- **How:** Red-team corrupt heat and PO, duplicate lot, missing certificate page, 0 substitute units, cancelled supply, simultaneous machine outage, changed deadlines, Meta timeout, unknown model output, page refresh and rejected operator review.
- **Deliverables:** ΓëÑ20 documented adversarial scenarios, reproducible test commands and dated browser/device evidence, performance observations, resolved-issue log.
- **Exit gate:** **Zero** undetected material release, unsupported ΓÇ£VERIFIEDΓÇ¥, overallocated material, machine overlap or silently lost incident history. All critical/high findings fixed and independently retested. Physical S24 verification required for ΓÇ£S24 tested.ΓÇ¥
- **Dependency:** P03ΓÇôP08.
- **Contingency:** Freeze new features; spend remaining days on correctness and reproducibility.

### P10 ΓÇö Judge experience and competition release candidate
- **When:** Nov 2ΓÇô3.
- **Who:** Build operator creates package; owner reviews and approves public-safe contents.
- **Where:** Private release tag, evidence folder, separate authorized judge-demo environment.
- **What:** A 2-minute narrative, hands-on 3ΓÇô5 minute demo, clean-start test instructions, architecture diagram, original-vs-new provenance statement, Meta usage proof and independent quantitative evaluation.
- **Why:** A complex product must deliver a memorable, immediately legible live result, not a tour through internal infrastructure.
- **How:** Storyboard:
  1. Forty orders appear healthy.
  2. A supplier certificate is submitted with one wrong heat number.
  3. Seven jobs and four cells illuminate with line-level source proof.
  4. Four recovery options appear with cost/delay/stock implications.
  5. A second disruption removes the preferred substitute or disables a cell.
  6. The application recalculates, explains changed tradeoffs and flags prior approval stale.
  7. Operator records a new decision and exports the verifiable incident packet.
- **Deliverables:** Live app link (once deployed), 2-minute video, screenshots, test report, README/Judge Start Here, SHA/version identifier and release candidate.
- **Exit gate:** Clean-device reviewer can launch and reproduce. The live model call, if claimed, is real and source-checked. No secret, private IP, simulated result passed as field evidence, or invented performance claim is published.
- **Dependency:** P09 signed off + P01 actual rules.

### P11 ΓÇö Submission, freeze and chain of custody
- **When:** November 4. **Official deadline 9:00 PM ET / 6:00 PM PT. Internal objective noon PT.**
- **Who:** **Owner explicitly authorizes and submits.** Build operator verifies artifact completeness and captures redacted confirmation afterward.
- **Where:** Official Meta hackathon submission destination (verify from accepted participant instructions); GitHub private evidence pack.
- **What:** Final deploy + test, complete project fields, required credits, category/track, proof of Meta usage, video, demo access and accepted entry.
- **Why:** Only a submitted, accessible and rules-compliant build competes.
- **How:** Run release checklist, inspect live reviewer path from a fresh browser, run final tests, record release SHA and artifact hashes, owner reviews visibility and sends form, preserve timestamp and receipt.
- **Deliverables:** Final release snapshot, complete submission checklist, verified Meta receipt and no-changes release record.
- **Exit gate:** Official submission receipt is preserved; no claim of submission without it.
- **Fallback:** Preserve source and artifacts if registration or submission is blocked. Never invent acceptance or completion.

### P12 ΓÇö Post-submission stewardship and published result
- **When:** Nov 5ΓÇô9 and when the organizer posts results.
- **Who:** Owner; build operator for evidence preservation and any approved response.
- **Where:** Private release archive and official Meta event page.
- **What:** Keep demo available as required, answer organizer inquiries, document judged outcome, preserve pre/post release lineages and assemble commercialization backlog.
- **Why:** A verifiable, recoverable product survives past the judging event and remains reusable even if no prize is awarded.
- **How:** Protect submission SHA, capture changes only on post-event branch, record feedback and actual result once published.
- **Deliverables:** Final immutable submission record; verified outcome and pilot action list.
- **Exit gate:** Submission artifact remains reproducible, result recorded from official source.
- **Scope:** Future. No work implied until that date and explicit tasking.

---

## 6. POST-HACKATHON PRODUCT LANE (NOT IN THE NOV 4 BUILD PROMISE)

| Stage | Objective | Begins when | Proof to advance |
|---|---|---|---|
| **R1 ΓÇö Shop pilot** | Replace sample assumptions with authorized, anonymized real document structures and run a read-only trial with an aerospace/fabrication shop. | After event + owner chooses partner | Actual customer-approved pilot scope and measured accuracy. |
| **R2 ΓÇö System connections** | Add permissioned supplier, ERP/MRP, QMS, work-center and quality-system adapters. Integrations to existing ForgeFront systems require separate review. | R1 acceptance + owner approval | Reconciliation and audit trail across at least one end-to-end connected workflow. |
| **R3 ΓÇö Product release** | Harden identity/roles, secure storage, deployment packaging, recovery, billing/commercial support and multi-facility operations. | Proven pilots + owner authorization | Independent operational/security acceptance and commercial release checklist. |

These are aspirations with **no fixed delivery dates**. Do not charge the competition schedule for them.

---

## 7. CRITICAL DEPENDENCY CHAIN

```text
P00 VERIFIED FOUNDATION
   Γö£ΓöÇΓöÇ P01 ENTRY + RULES + API ACCESS (owner-dependent)
   ΓööΓöÇΓöÇ P02 FROZEN DOCUMENT / TRUTH CONTRACT
           Γåô
          P03 MULTI-SOURCE INTAKE ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ
           Γåô                            Γö£ΓöÇΓåÆ P04 AUTHENTIC META REASONING
          P05 CONSEQUENCE GRAPH         Γöé
           Γåô                            Γöé
          P06 RECOVERY & SECOND SHOCK ΓåÉΓöÇΓöÿ (model enhances, math remains deterministic)
           Γåô
          P07 STATEFUL INCIDENT MISSION
           Γåô
          P08 OPERATOR COCKPIT
           Γåô
          P09 HOSTILE VALIDATION
           Γåô
          P10 JUDGE RELEASE
           Γåô
          P11 OWNER SUBMISSION ΓåÆ P12 ARCHIVE / RESULTS
```

**No hidden overlap:** A later phase may be prototyped while an earlier phase is being reviewed, but may not be labeled closed until its prerequisite evidence is verified. **No unapproved code changes** to WAKE Engine, Omega, WAKE Industrial Core, CertFlow, Athere Mesh, Titan, The Britt, PRAXIS, ODIN or any other source project. New adapters belong in this project's isolated repository until specifically authorized.

---

## 8. DELIVERY PRIORITIES: MUST / STRETCH / DEFERRED

### MUST work before demo release
- Multiple real *synthetic* source documents; at least one decisive contradiction across documents.
- Source-visible graph showing exactly which seven jobs are affected and why.
- Four independently calculated, constrained recovery options.
- Genuine Meta model inference with retained redacted proof, not an API-shaped placeholder.
- Operator decision and invalidation on evidence/assumption change.
- Second live disruption that changes a plan and visibly changes the recommendation.
- Reproducible release, hosted demo, full tests, actual S24/mobile verification, judge video, owner submission.

### STRETCH only after all MUST gates are green
- Visual certificate reading through Meta multimodal pathway.
- Rich factory floor timeline animation, narrated walkthrough or comparative dual-scenario view.
- Additional supplier/assembly tiers and a wider family of quantified risk views.

### DEFERRED outside the competition
- Connecting actual aerospace or defense production records.
- Controlling physical machinery, automatic QMS approvals or supplier purchasing.
- Distributed agent deployment, general-purpose autonomous factory control and external integrations.
- Full SOC2/AS9100 audit preparation and multi-tenant SaaS commercialization.

---

## 9. QUANTIFIED VERIFICATION SCORECARD

| Metric | Foundation observed | Competition exit target | Evidence |
|---|---|---|---|
| Scenario load | 40 orders / 4 machine cells | Same benchmark plus deliberate second-shock fixture | Frozen scenario IDs, tests |
| Disputed lot tracing | 7 jobs, 178 units | 100% correct on all frozen trace cases | Graph expected-vs-actual ledger |
| Recovery alternatives | 4 candidate plans | 4 numerically explained, constraints respected | Independent schedule/stock assertions |
| Deterministic engine tests | 13/13 passed | All foundation plus ΓëÑ20 adversarial benchmark cases passed | Test output and commit hashes |
| Unsupported ΓÇ£verifiedΓÇ¥ outcomes | Not measured outside foundation | **0** in recorded accepted test cases | Source/policy audit |
| Unauthorized material release | None in synthetic foundation | **0** across test suite | Operator authority checks |
| Stock/capacity constraint violations | None in foundation tests | **0** across adversarial suite | Constraint assertions |
| Meta model authenticity | API path only; no successful authenticated call proven | Authenticated model response + logged model identity, timings, grounded source audit | Redacted evaluation report |
| Desktop/mobile | Chrome rendering + 390px viewport checked | Fresh desktop + **physical Samsung S24** acceptance | Screenshots and test date |
| End-to-end demo | Not independently measured as final contest path | Three consecutive cold-start successful runs, with second disruption | Demo ledger and video |

The scorecard is measured, not aspirational marketing. **Anything not evidenced remains open.**

---

## 10. ISSUE AND RELEASE DISCIPLINE

Each phase has a corresponding GitHub Issue, linked in the [Phase Issue Index](PHASE_ISSUE_INDEX.md). Each issue must contain:

- Exact owner and next action; no imaginary assigned team.
- Current status, planned dates and named dependency.
- What is being delivered and why it matters.
- Where source/tests/evidence must live.
- How behavior will be implemented and measured.
- A finite, testable checklist and **required evidence paths**.
- Exit decision: PASS / FAIL / BLOCKED, test date, source commit SHA and approval if needed.

### Phase close-out protocol

1. Verify actual file or runtime source and baseline conditions.
2. Run the phase acceptance tests and record failures, not just successes.
3. Resolve any failures and rerun the affected/critical regressions.
4. Save redacted logs, screenshots or reports with source SHA.
5. Update the issue and this sheet's status/scorecard.
6. Close the phase issue only when its exit gate and dependencies are met.
7. Never rewrite or delete a previous evidence record to conceal a failed attempt.

### Release hold conditions

A release is **HOLD** if any of these remain true: no accepted participant entry where required; no authentic Meta integration where claimed; critical benchmark failures; any physical material ΓÇ£approvedΓÇ¥ without authorization; nondeterministic demo; secrets or protected source exposed; missing judge access; or missing owner final approval.

---

## 11. CURRENT DECISION AND BLOCKER REGISTER

| ID | Decision / missing prerequisite | Decision owner | Current state | Resolution proof |
|---|---|---|---|---|
| D-01 | Final competition track | Justin | OPEN | Written track selection based on actual accepted eligibility |
| D-02 | Accepted Meta entry | Justin | NOT VERIFIED | Safe record of Meta approval notification |
| D-03 | Final published official rules | Justin + reviewer | WAITING ON OFFICIAL PUBLICATION | Link, effective date, rule review and acceptance |
| D-04 | Meta Model API authentication | Justin authorizes; build operator verifies | NO AUTHENTICATED RESPONSE PROVEN | Successful redacted test result |
| D-05 | Public demonstration host | Justin | NOT SELECTED | Approval for host/access/visibility |
| D-06 | Synthetic benchmark domain assumptions | Justin + verifier | BASELINE EXISTING, EXPANSION OPEN | Approved frozen truth manifest |
| D-07 | User's actual S24 acceptance | Justin | NOT RUN | Dated real-device gate |
| D-08 | Final product name | Justin | WORKING TITLE | Explicit naming decision |
| D-09 | Submission/release consent | Justin | NOT GIVEN | Recorded final approval |
| D-10 | Source IP transfer/reuse permissions | Justin | NO TRANSFER AUTHORIZED | Additive source-by-source written integration approval |

**Owner inputs requested only when their dependent phase is ready.** This master sheet is an execution plan, not automatic permission to run future tasks, deploy, disclose proprietary work, or submit anything.

---

## 12. DAILY CHECKPOINT TEMPLATE

Copy into the relevant GitHub phase issue on each active workday:

```text
DATE / TIME ZONE:
PHASE / ISSUE:
LATEST COMMIT:
TODAY'S OBJECTIVE:
WORK ACTUALLY COMPLETED:
TESTS RUN / RESULT:
EVIDENCE PATH(S):
WHAT CHANGED VS PREVIOUS STATE:
BLOCKER / OWNER REQUIRED:
NEXT SINGLE HIGHEST-PRIORITY ACTION:
RELEASE GATE: OPEN | PASS | HOLD
```

**Definition of competition complete:** The operator can demonstrate a complete, real, evidence-backed source-to-consequence-to-recovery-to-decision loop with authenticated Meta intelligence and an independently tested second shock, the reviewer can access it, and the owner has a real official submission receipt.

*Master Build Phase Sheet v1.0 ΓÇó established Oct 17, 2026 ΓÇó ForgeFront Systems / Wake Industries*
