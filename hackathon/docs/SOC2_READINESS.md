# SOC 2 readiness — Trust Services Criteria

This document maps ForgeFront Factory Resilience (Node on Render, Muse Spark Open via Baseten, supported Muse Wonder via the Meta Model API, Fireworks standby only) to the AICPA Trust Services Criteria (Security, Availability, Confidentiality, Processing Integrity, Privacy). It lists **evidence already in the codebase** and **gaps a formal CPA SOC 2 examination would still require**.

For control implementation detail and test names, see [SECURITY_CONTROLS.md](../SECURITY_CONTROLS.md) and [SECURITY_MODEL.md](SECURITY_MODEL.md).

---

**This is an engineering control inventory, not a SOC 2 report, certification or assurance opinion.** Passing application tests does not establish organizational or operational compliance. Current execution results are in the [evidence index](../evidence/README.md).

## Executive summary

| Criterion | Readiness (engineering) | Formal audit status |
| --- | --- | --- |
| Security (CC) | Strong in-app controls; headers and quotas hardened | Needs org policies, access reviews, vendor SOC reports |
| Availability (A) | Health checks, fail-closed ledger, Render disk | Needs SLAs, incident runbooks, DR tests |
| Confidentiality (C) | Encryption at rest, redaction, export gates | Needs classification policy, key custody procedures |
| Processing integrity (PI) | Deterministic engine, consent binding, schema validation | Needs change management evidence outside repo |
| Privacy (P) | Minimal PII; visitor hashing | Needs privacy notice, retention schedule, DSR process |

---

## CC — Security

### CC6.1 Logical and physical access

| Control | Evidence | Gap for CPA audit |
| --- | --- | --- |
| API authentication | Bearer tokens (timing-safe) on `POST /api/meta/session`; demo entry server-gated | Enterprise SSO/MFA not integrated |
| Session management | Random session + CSRF; HttpOnly/SameSite/Secure cookies; 10-minute TTL | In-memory sessions; no centralized session store |
| Role-based access | Admin / operator / auditor in `meta-handler.mjs`; auditor read-only | Periodic access recertification not documented |
| Host / Origin allowlist | `request.mjs`; public hostnames from Render env | Misconfiguration risk; needs deployment review checklist |

**Tests:** `tests/integration/security.test.mjs`, `tests/integration/operators.test.mjs`, `tests/integration/meta.test.mjs`

### CC6.6 System boundaries

| Control | Evidence | Gap |
| --- | --- | --- |
| Static allowlist routes | `server.mjs` asset map; 404 on unknown API | — |
| CSP and clickjacking | `response-headers.mjs`: CSP, `X-Frame-Options`, COOP/CORP | Same-origin compromise still possible if assets tampered |
| HTTPS on public edge | HSTS when `X-Forwarded-Proto` from trusted Render proxy | Certificate management is Render’s control; document reliance |

**Tests:** `tests/unit/security-headers.test.mjs`, `tests/integration/ui.test.mjs`

### CC6.7 Transmission and disposal

| Control | Evidence | Gap |
| --- | --- | --- |
| TLS to clients | Render terminates TLS; Secure cookies when HTTPS detected | Need Render SOC 2 / DPA on file |
| Secret redaction | `redact.mjs` on exports and model output | Operator screenshots outside app scope |
| No secrets in repo | the CI gitleaks history and working-tree scans; `.env.example` names only | Developer workstation custody |

**Tests:** `tests/unit/smoke.test.mjs`, `tests/unit/audit-hardening.test.mjs`

### CC7.2 Monitoring and rate limits

| Control | Evidence | Gap |
| --- | --- | --- |
| API rate limits | 240/min (local) or 30/min (public) per identity; 120/min authenticated meta/workflow; 12/min login | Shared NAT shares budget by design |
| **Public model caps (required ON)** | `public-budget.mjs`: **10/visitor/hour**, **300/day UTC**; persisted encrypted counters | Daily cap falls back to Sample, not hard stop |
| Ledger tamper detection | Periodic `workflow.verify()`; HTTP 409 when failed | Alerting to operators not wired |

**Tests:** `tests/unit/run23-public-budget.test.mjs`, `tests/integration/run23-public.test.mjs`, `tests/unit/run5-rate.test.mjs`

### CC8.1 Change management (partial)

| Control | Evidence | Gap |
| --- | --- | --- |
| Automated regression | `npm test` unit/integration suites | Formal change approval records |
| Dependency surface | **Zero npm runtime dependencies** (`package.json`) | OS/Node patch cadence; `npm audit` N/A without lockfile |

---

## A — Availability

| Control | Evidence | Gap |
| --- | --- | --- |
| Health endpoints | `GET /health`, `/healthz` return `{ ok: true }` | Uptime monitoring / paging not in repo |
| Render deployment | `render.yaml`: starter plan, disk at `HACKATHON_STATE_DIR` | RTO/RPO targets; multi-region |
| Fail closed on corruption | Ledger verify blocks API when tampered | Runbook for restore from checkpoint |
| Model provider outages | Explicit Sample route; no silent substitution on missing keys | Baseten/Meta SLA documentation |

**Tests:** `tests/integration/run23-public-launch.test.mjs`, workflow verify tests

---

## C — Confidentiality

| Control | Evidence | Gap |
| --- | --- | --- |
| Encryption at rest | AES-256-GCM for events, anchors, quotas (`state-codec.mjs`) | Key rotation procedure |
| Encrypted export | scrypt + AES-GCM export envelope | Passphrase custody policy |
| Visitor isolation (public) | Per-session workflow under hashed visitor directory | Disk backup encryption is operator/Render scope |
| Private directory ACL | `private-directory.mjs` mode `0700` | Shared host multi-tenant N/A on Render single tenant |

**Tests:** `tests/unit/storage.test.mjs`, `tests/unit/run6-export.test.mjs`, `tests/unit/private-directory.test.mjs`

---

## PI — Processing integrity

| Control | Evidence | Gap |
| --- | --- | --- |
| Deterministic scenario engine | `engine.mjs` / fixtures; separate from model output | — |
| Human consent gate | Typed `APPROVE <optionId>`; nonce; snapshot binding | — |
| The Britt task schema | Allowlisted fields, owners, deadlines | — |
| Model output labeling | `UNVALIDATED_MODEL_OUTPUT`; investigation validation separate | Provider identity self-reported |
| Input validation | JSON type/size; workflow field allowlists; prompt 1–4000 on `/api/meta/respond` | Not a universal JSON Schema layer |
| Audit trail | Hash-chained HMAC ledger; model_call events | Independent witness of checkpoint prefix |

**Tests:** `tests/unit/workflow.test.mjs`, `tests/unit/investigation.test.mjs`, `tests/integration/workflow-schema.test.mjs`

---

## P — Privacy

| Control | Evidence | Gap |
| --- | --- | --- |
| Data minimization | Synthetic factory scenario; no end-customer PII in fixtures | Public demo privacy notice |
| Visitor identity | SHA-256 of trusted client IP; no raw IP in quota files | GDPR/CCPA legal basis documentation |
| Retention | Session 10 minutes; quota visitor map evicted after 1 hour; ledger retained on disk until operator reset/admin action | Written retention/disposal schedule |
| Right to erasure | Visitor dirs under `visitors/<hash>`; no automated erasure API | Process for deletion requests |

**Tests:** `tests/unit/run23-public-budget.test.mjs` (hashed identities)

---

## Fixes applied in this readiness pass

| Finding | Risk | Remediation |
| --- | --- | --- |
| Missing defense-in-depth headers | Low | Centralized `response-headers.mjs`: `X-Frame-Options`, `Permissions-Policy`, COOP, CORP, HSTS when HTTPS |
| No published vulnerability channel | Low | [SECURITY.md](../SECURITY.md) |
| No CPA-oriented control matrix | N/A (documentation) | This document |

Public API usage caps **10 per visitor per hour** and **300 per day** remain enabled; tests in `run23-public-budget.test.mjs` assert defaults.

---

## Remaining work for a formal SOC 2 Type II audit

Organizational and operational items typically **outside** application code:

1. **Policies:** Information security policy, acceptable use, encryption/key management, incident response, vendor management, privacy notice.
2. **People:** Background checks (if required), security awareness training, named control owners.
3. **Operations:** On-call rotation, incident drills, backup/restore tests for Render disk, log aggregation and retention (Render logs + app ledger).
4. **Vendors:** Obtain and review SOC 2 reports (or equivalent) for Render, Baseten, and Meta API usage; subprocessors list.
5. **Access:** Quarterly access reviews for Render dashboard, GitHub, and operator tokens; MFA on all admin consoles.
6. **Monitoring:** External uptime checks on `/healthz`; alerts on ledger verify failures and sustained 429/503 rates.
7. **Privacy program:** Data inventory, retention/deletion SOP, DSR handling if personal data is ever collected beyond hashed IPs.

---

## Evidence index (automated)

| Area | Command / artifact |
| --- | --- |
| Full unit suite | `npm run test:unit --prefix hackathon` |
| Security integration | `npm run test:integration --prefix hackathon` (includes `security.test.mjs`) |
| Public budget caps | `node --test hackathon/tests/unit/run23-public-budget.test.mjs` |
| Security headers | `node --test hackathon/tests/unit/security-headers.test.mjs` |
| Secret scan | `gitleaks detect --source . --redact` and a working-tree scan |
| Control map | [SECURITY_CONTROLS.md](../SECURITY_CONTROLS.md) |

---

## Dependency vulnerabilities

The application declares **no runtime npm dependencies**. Development and smoke tooling use Node built-ins and optional local browsers. Run `npm audit` after introducing a lockfile; until then, the remaining supply-chain surface includes the Node.js runtime and host image (Render `NODE_VERSION` 24).
