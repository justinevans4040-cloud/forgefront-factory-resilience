# Security model and acceptance requirements

Status: requirements and inspected boundary; no passing security certification. Synthetic local data and advisory acceptance only; operationalRelease is always false.

Explicit admin authentication provisions operator sessions. Loading HTML must not mint an authenticated seat. Protect scenario, investigation trace, ledger and export reads. Cookies require HttpOnly, SameSite, expiry and Secure under HTTPS. Mutations require session and CSRF. Restart invalidates sessions; unexpired encrypted envelopes require original named-identity reauthentication.

Bind loopback by default. Enforce exact Host/Origin allowlists, including port rules, without tunnel/demo bypass or trusted client proxy headers. Apply route-wide rate limits with 429 and Retry-After, body/schema/content-type limits, static allowlisting and CSP script-src 'self'. Render model/source text as text, never HTML. Browser code must not import node built-ins. Product runtime dependencies must remain zero.

Review/confirmation uses a sealed five-minute envelope binding authenticated actor/session, scenario digest and recomputed plan digest. Confirm deliberately with typed plan ID and CSRF. Persist single-use nonce consumption and serialize shock, confirm and revoke. Two concurrent identical confirms produce exactly one acceptance event. Replayed, altered, expired, cross-session and stale envelopes fail. Second shock invalidates prior decisions independently of UI state.

The ledger is hash-chained, tamper-evident with HMAC authentication and persisted head anchor. Verify disk at startup, before acceptance/export, periodically and on demand. Interrupted persistence uses authenticated write-ahead intent and verified forward-only recovery. Changed/truncated committed entries or mismatch fail closed; never reset corrupted history. Rollback detection requires an independently retained anchor. A privileged attacker controlling all local keys and anchors is outside the guarantee. New event/anchor/intent files use AES-256-GCM; historical plaintext backups and explicitly acknowledged exports remain plaintext. Production compliance is not claimed.

Provider/admin/consent/ledger secrets remain server-side outside source and static root. Restrict Windows NTFS ACLs on creation and verify effective access using disposable synthetic secrets. Never print real values, environment maps, headers, cookies or token-bearing commands. Ignore rules alone do not establish secret safety.

Execute adversarial.json cases on dedicated disposable state/keys/ports with a healthy positive control for each guard. A ledger-integrity failure masking a consent or request test is invalid coverage. Bad Host must reject before protected response; bad Origin must reject with an otherwise valid authenticated request; audit tampering must block approval/export without deleting evidence. Fixtures describe expected behavior rather than prove implementation.
