# Security policy — ForgeFront Factory Resilience

ForgeFront Systems operates the Meta Hackathon build as a Node.js web application on Render. The Britt recovery workflow uses Muse models through Baseten; Fireworks remains an optional backup route only.

## Scope

This policy covers the application under `hackathon/` (HTTP server, browser UI, encrypted workflow ledger, and public demo hosting). It does not cover third-party platforms (Render, Baseten, Meta) except where this service integrates with them.

## Security objectives

- Protect operator credentials, model API keys, and ledger encryption keys.
- Enforce authenticated, least-privilege access to recovery and evidence APIs.
- Preserve tamper-evident audit records for recovery decisions and model calls.
- Limit abuse through Host/Origin checks, CSRF, and rate limits (including **10 live model operations per visitor per hour** and **300 per UTC day** on public hosting).
- Fail closed when keys, ledger integrity, or consent gates are unavailable.

## Secrets and configuration

- Secrets are supplied only through the host environment (`MUSE_API_KEY`, `BASETEN_API_KEY`, `HACKATHON_LEDGER_KEY`, `HACKATHON_ADMIN_TOKEN`, optional `HACKATHON_OPERATORS_JSON`). Names appear in `.env.example`; values are never committed.
- Public hosting strips the Fireworks backup credential at launch; primary routes are Wonder and Baseten.
- Operators must use high-entropy ledger keys, admin tokens, and separate export passphrases. Store checkpoints independently from encrypted exports.

## Reporting a vulnerability

If you believe you have found a security issue in this repository or the public demo:

1. **Do not** open a public issue with exploit details or live credentials.
2. Email **justin@wakeforged.com** with a concise description, reproduction steps, and impact. If you do not receive an acknowledgment within five business days, follow up once.
3. Include whether the finding affects the public demo, persistent operator mode, or both.
4. Safe harbor: good-faith research that avoids privacy violations, service disruption, and data destruction will not be pursued as unauthorized access, provided you report promptly.

We will confirm receipt, investigate, and coordinate disclosure. We credit reporters when they agree to be named.

## Supported versions

Security fixes apply to the `submission` branch and the production Render service built from it. Older branches and local disposable state are not supported.

## Related documentation

- [Security model](docs/SECURITY_MODEL.md) — operator-facing control narrative
- [Control-to-test map](SECURITY_CONTROLS.md) — implementation and automated verification
- [SOC 2 readiness](docs/SOC2_READINESS.md) — Trust Services Criteria mapping and CPA audit gaps
