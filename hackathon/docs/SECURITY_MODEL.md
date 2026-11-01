# The Meta Hackathon build — protect the recovery decision

Explicit sign-in creates an expiring HttpOnly/SameSite session. CSRF, exact Host/Origin checks and persistent per-client quotas protect every API request. Named admin, operator and auditor seats receive server-enforced permissions. Static assets use an allowlist and CSP script-src 'self'; model/source strings render through textContent.

Review seals the deciding identity, session, run, snapshot, recomputed plan, nonce and five-minute deadline. Typed confirmation consumes the nonce once. Replays, altered/expired/cross-session/stale consent fail. A second shock invalidates prior acceptance and requires a fresh investigation and decision.

AES-256-GCM encrypts new events, anchors, write-ahead intent and quotas. A hash-chained, HMAC-anchored ledger is verified at startup, on workflow operations, periodically and on demand. Interrupted writes complete only through authenticated forward recovery. Corruption and committed truncation block progress and preserve the failed state for inspection.

The primary packet export uses a separate passphrase with pinned scrypt and AES-GCM. Advanced plaintext downloads require explicit acknowledgement. Retain checkpoints independently to verify a trusted chain prefix. Keep stable env keys, passphrases, historical plaintext and decoded exports under private custody.

Provider checks require operator/admin permission, session, CSRF, schema and quota. One selected allowlisted route receives one bounded nonce/identity request. Each outcome enters the ledger. Health is visible, expires and never changes selection automatically.

[Control-to-test map](../SECURITY_CONTROLS.md) · [API contract](API_CONTRACT.md) · [Current verification](../evidence/README.md).
