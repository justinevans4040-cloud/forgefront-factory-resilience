# The Meta Hackathon build — evaluation gates

Evaluate the actual snapshot, calculation, investigation, decision and exported proof. [Current evidence](../evidence/README.md) records executed outcomes. [Claim proof](CLAIM_PROOF.md) maps product claims to tests and live packets.

The runtime oracle checks the default 70-unit recovery and second-shock arithmetic. The independent planning fixtures retain a separate 120-piece scheduling model; [fixture alignment](FIXTURE_RUNTIME_ALIGNMENT.md) identifies its semantics. Expected fixture answers stay outside production calculations.

| Gate | Procedure | Required observation |
| --- | --- | --- |
| Runtime oracle | Independently derive the current default options and second shock | 70 impacted units; finish 83/35/17.5 hours; stock/capacity conservation; changed snapshot invalidates acceptance |
| Dynamic math | Independently vary quantities, stock, cycle/setup time, availability, compatibility and cost; derive fresh expected math | Computed outputs change; no fixture-answer lookup; held/incompatible inventory excluded |
| Infeasibility | Run stock-short, incompatible, held-substitute and no-options | Invalid options excluded with reason; zero options requests evidence |
| Input validation | Negative, missing, nonfinite/fractional pieces, inconsistent units | Reject before calculation; no coercion/default masking |
| Citation support | Resolve exact field/entity/unit/snapshot; wrong value/unit/entity, stale ID and unsupported relationship | Existing ID alone insufficient; numerical comparisons server-computed; unsupported real commitments rejected |
| Prompt/tool boundary | Source injection, unknown/write tool, path escape, cross-snapshot ID | No write/shell/external fetch; source instructions remain data; visible stop reason |
| Agent budget | Repeat identical calls, malformed schema, six-turn/ten-call and 60-second boundary including tool batches | Every bound enforced; request timeout <= remaining budget; no automatic provider retry (explicit new Investigate only) |
| Meta identity | Run both models independently on frozen identical contract/snapshot | Verified provider/deployment mapping, substantive tool traces, actual duration and request ID if supplied; echoed alias insufficient |
| Provider failure | Invalid auth, 429, timeout, malformed reply, wrong route/model and outage | Single recorded failure with labeled stop/timeout evidence, empty narrative, explicit retry instruction; no automatic provider/model/Sample switch |
| Bootstrap | Unauthenticated mint/read/export before and after HTML fetch; authenticated control | Denial persists after HTML; correct authenticated path succeeds |
| Request guards | Host/Origin/proxy spoof, missing CSRF, oversized/wrong-type body, every-route rate limit | Intended guard reached; 429 with Retry-After; protected reads authenticated; public health minimal |
| Consent | Review/recompute and typed confirm; altered/expired/cross-session/replay/concurrent attempts | Five-minute actor/session/snapshot/plan binding; single-use persisted nonce; exactly one concurrent success; human-only acceptance |
| Shock race | Accept/review v1 then shock; exercise both controlled confirm/shock orders | Serialized legal ordering; active v2 never retains v1 acceptance; old envelopes unusable; fresh review required |
| Restart | Confirm, restart isolated app, retry consumed nonce/session/pending envelope | Consumption persists; old sessions invalid; unexpired pending envelopes resume only after original named-identity reauthentication; authoritative server status retained |
| Ledger | Healthy control then modify/truncate/rollback disposable ledger; inject partial disk failure | Verify disk at startup/before acceptance/export; fail closed without clearing; only exact authenticated forward intent may complete interrupted persistence; committed truncation is rejected |
| Secret/static boundary | Disposable synthetic secret effective NTFS access; traversal/dotfile/state/server-module probes | Secrets outside source/static root; broad inherited grants removed; unsafe ACL fails closed; no disclosure |
| Browser | Keyboard full workflow, citation inspection, typed confirm, shock/re-review, verify/export, injected markup | Zero console errors; visible focus/readable excerpts; inert text; refresh uses server state; actual mode/model labels visible |
| Packet | Recompute exported run math/citations and verify retained anchor | Same snapshot/run/plan digests, actor/status, assumptions, shock history and verified identity or explicit offline label; no credential/raw dump leakage |


Use disposable state, test keys and dynamic ports. Pair each rejection with a healthy positive control and verify the intended guard and side effects. Record candidate/source hashes, input digest, actual outcome, failure reason and relative evidence locator. Preserve failed attempts and skipped gates as their actual outcomes.

The selected-route pre-flight adds nonce, identity, single-attempt HTTP failure, secret-redaction, role/schema and expiring presentation checks. The controlled RED browser proof verifies unchanged route selection after one HTTP 503. Live guide proof remains separate from controlled failure evidence.
