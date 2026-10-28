# SECURITY AUDIT — Stepladder R18 Command Center V3

**Auditor:** independent hostile stepladder (did not build this worktree)  
**Date:** 2026-10-20  
**Worktree:** `<LOCAL_PATH_REDACTED>`  
**Live probe target:** `http://127.0.0.1:4318/` (health `status=ready` at audit time)  
**Product edits:** none (this file only)

---

## Method (3 passes)

Hostile re-proof. Builder `FIX_LOG_R18.md` claims are evidence leads only — not accepted without command output.

| Pass | Focus | Tools |
|---|---|---|
| **1** | Preserve integrity, vendor token absence, static allowlist vs live HTTP | PowerShell `Get-FileHash`, filesystem search, `Invoke-WebRequest`, Node import of `http-utils.mjs` |
| **2** | Program API surface, session gate, consent/kanban → bridge cascade honesty | curl-equivalent PowerShell against `/api/session`, `/api/program/*`, consent/kanban code paths in `server.mjs` |
| **3** | UI residual risk (iframe/CSP/XSS), rollback honesty, dual-surface confusion | `index.html` Program section, response headers, vendored `ForgeFront_PM.html` script model |

**READY rule (hostile):** no Critical/High remain; Medium residuals must be **explicitly accepted** as residual risk. Tests / “health ready” alone do not qualify.

---

## Findings table

| Severity | ID | Finding | Evidence | Status |
|---|---|---|---|---|
| **Critical** | R18-CCV3-01 | Program tab iframe cannot load: every response including `ForgeFront_PM.html` sends `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`. Browser must refuse the embed. | **RE-AUDIT:** PM has **no** `X-Frame-Options`; CSP `frame-ancestors 'self'`. Main `/` still `X-Frame-Options: DENY` + `frame-ancestors 'none'`. | **CLOSED** |
| **Critical** | R18-CCV3-02 | Vendored PM is a single large **inline** `<script>`; server CSP is `script-src 'self'` with **no** `'unsafe-inline'`. Even if framing were fixed, PM JS would not execute under this CSP. | **RE-AUDIT:** PM CSP includes `script-src 'self' 'unsafe-inline'`. | **CLOSED** |
| **High** | R18-CCV3-03 | `/api/program/events` accepts `CONSENT_ACCEPTED` and `KANBAN_MOVE` with only session+CSRF — **bypasses** two-step consent / live approval gates and mutates bridge snapshot. | **RE-AUDIT:** session POST `CONSENT_ACCEPTED` / `KANBAN_MOVE` → **403** `FORBIDDEN_EVENT_TYPE`. No-session → **401**. Control `INCIDENT_DETECTED` → **200**. | **CLOSED** |
| **Medium** | R18-CCV3-04 | Program UI still does **not** deep-sync into CC V3 PM fields (RAID/calendar rows). Parent bridge summary updates; PM uses own `localStorage` / `/api/state` (`/api/state` → **403**). Copy now honestly says deep auto-write is not claimed. (Was High: dishonest cascade marketing; lowered after copy fix.) | Live `/api/state` **403**; Program copy admits bridge-first / no deep RAID write-back; FIX_LOG “Explicitly NOT done”. | **OPEN** (accepted residual) |
| **Medium** | R18-CCV3-05 | `POST /api/consent/revoke` does **not** call `programBridge.record`. Consent confirm and kanban move do. After revoke, bridge can still show `consentAccepted` / unlocked kanban. | **RE-AUDIT:** revoke path calls `programBridge.record({ type: "SECOND_SHOCK", ... })` when prior exists (`server.mjs` ~792). | **CLOSED** |
| **Medium** | R18-CCV3-06 | `INCIDENT_DETECTED` / `CERTIFICATE_CONFLICT` do not clear `consentAccepted` / `kanbanUnlocked`. Live probe left `consentAccepted=true` under `status=DISRUPTION`. | **RE-AUDIT:** live both event types return `consentAccepted=false`, `kanbanUnlocked=false`. | **CLOSED** |
| **Medium** | R18-CCV3-07 | Vendor allowlist is dishonest: `isAllowedStaticRel` returns **true** for `vendor/command-center-v3/*.json` (including `dce_v3_access.json` if present), but `safeStaticPath` then rejects non-`STATIC_EXT`. Blocking of tokens relies on a second hard filter, not an explicit deny. Unifying the two layers without a deny list would serve access JSON. | **RE-AUDIT:** vendor `.json` denied in `isAllowedStaticRel`; live GET access/state/`something.json` → **403**; `dce_v3_state.json` **absent** on disk; access **absent**. | **CLOSED** |
| **Low** | R18-CCV3-08 | Program iframe has **no** `sandbox` (or `allow` lockdown). Latent same-origin parent access if framing+CSP are loosened without isolation. Parent stores session tokens in JS heap (`state.operatorSession`). | **RE-AUDIT:** `sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"` present. Note: `allow-same-origin` still weakens isolation (latent); requirement was sandbox present. | **CLOSED** |
| **Low** | R18-CCV3-09 | `GET /api/program/bridge` is unauthenticated (any caller on loopback can read synthetic program state / recent events). | Live GET → 200 without session (re-confirmed). | **OPEN** (accepted residual) |
| **Info** | R18-CCV3-10 | Sealed R17 zip SHA256 matches required digest; PRESERVE copy matches; worktree delete would not destroy sealed R17 (`ROLLBACK.md`). | See Pass 1 / RE-AUDIT Pass B hashes. | **PASS** |
| **Info** | R18-CCV3-11 | `dce_v3_access.json` not present under `vendor/` (builder exclusion holds on disk). | Recursive search; `Test-Path` false (re-confirmed). | **PASS** |
| **Info** | R18-CCV3-12 | Consent-confirm and kanban-move **do** call `programBridge.record` on the real server paths (partial cascade honesty). | `server.mjs` lines ~738 and ~840. | **PASS** (narrow) |
| **Info** | R18-CCV3-13 | Bridge summary `innerHTML` uses `safe()` / `num()` escaping for snapshot fields (XSS via bridge text mitigated in parent summary). | `app.mjs` `refreshProgramBridge`. | **PASS** (narrow) |

---

## Pass 1 — Preserve, vendor, allowlist

### Seal hash (required)

```text
Get-FileHash -Algorithm SHA256 ...\izzy-factory-resilience-build-final-r17\factory-resilience-final.zip
→ 63F1F832986C120EF91B58E9C1390CE67A44E353E49757CBF91F473E45D10B99
```

**Match:** required digest. **PASS.**

### PRESERVE__R17_SEALED__20261020

Exists with `factory-resilience-final.zip`, `demo-assets.zip`, `r17-audit.zip`, `PRESERVE_MANIFEST.md`, `ROLLBACK.md`.

```text
PRESERVE\...\factory-resilience-final.zip SHA256
→ 63F1F832986C120EF91B58E9C1390CE67A44E353E49757CBF91F473E45D10B99
```

**Same hash as sealed R17. PASS.** Manifest demo/audit hashes also observed (`3C5647…`, `6D2BB2…`) — not re-audited beyond presence.

### Vendor access token file

- `dce_v3_access.json`: **absent** under vendor (PASS).
- Residual: `dce_v3_state.json`, `DCE_V3_sw.js`, `DCE_V3_server.js` **present** (dual-server / stale state risk; see R18-CCV3-07).

### Allowlist node proof

| Path | `isAllowedStaticRel` | `safeStaticPath` |
|---|---|---|
| `ForgeFront_PM.html` | true | true |
| `dce_v3_access.json` | **true** | **false** |
| `dce_v3_state.json` | true | false |
| `DCE_V3_192.png` | true | false |
| `../package.json` | false | false |
| `server.mjs` | false | false |

Traversal attempts live: `/vendor/command-center-v3/../package.json` and encoded `..` → **403**.

---

## Pass 2 — API / cascade

### Health / bridge / static PM bytes

| Check | Result |
|---|---|
| `GET /api/health` | 200, `status=ready`, `programIntegration=command-center-v3-r18`, build `r17+command-center-v3-r18` |
| `GET /api/program/bridge` | 200 |
| `GET /vendor/command-center-v3/ForgeFront_PM.html` | 200, ~216477 bytes (body served; framing/CSP still kill UI) |
| `GET .../dce_v3_access.json` | **403 Forbidden** |
| `POST /api/program/events` no session | **401** |
| `POST /api/program/events` with session `INCIDENT_DETECTED` | **200**, snapshot updated |
| `POST ... CONSENT_ACCEPTED` forged | **200**, bridge shows forged plan (**R18-CCV3-03**) |

### Does consent/kanban server path call `programBridge.record`?

| Path | Calls `programBridge.record`? |
|---|---|
| `POST /api/consent/confirm` | **YES** (`CONSENT_ACCEPTED`) |
| `POST /api/kanban/move` | **YES** (`KANBAN_MOVE`) |
| `POST /api/consent/revoke` | **NO** (**R18-CCV3-05**) |
| Client `notifyProgram` (inject/shock/clear/reset) | YES via `/api/program/events` (and can also post privileged types) |

**Honesty verdict:** server-side consent-confirm and kanban-move are wired; revoke and event-type privilege are not. Overall cascade claim **not** honest enough for READY.

---

## Pass 3 — UI residual / rollback / dual surface

### iframe / XSS

- Embed: unsandboxed same-origin iframe → PM URL.
- Response headers on PM: `X-Frame-Options: DENY` + `frame-ancestors 'none'` → embed dead (**R18-CCV3-01**).
- Inline script vs `script-src 'self'` → PM logic dead even top-level (**R18-CCV3-02**).
- Parent bridge summary escapes with `safe()` — good for summary XSS.
- No CSP `sandbox` on iframe; latent parent token theft if 01/02 are “fixed” carelessly (**R18-CCV3-08**).

### Rollback

`ROLLBACK.md`: delete/rename worktree only; do not delete `izzy-factory-resilience-build-final-r17` or `PRESERVE__R17_SEALED__20261020`. Preserve hash match proves sealed zip survives worktree disposal. **PASS** for rollback rung.

### Dual-server confusion

Vendor includes `DCE_V3_server.js` and SW assets while Resilience `server.mjs` serves a static subset. Operator could start the wrong process. Residual operational risk (supports High cascade finding).

---

## Pass loop note

Pass 2 discoveries (forgeable consent events, revoke gap, sticky consent flags) remained material after Pass 3. No clean “third pass found nothing new” was achieved. Per request: **do not READY**.

---

## VERDICT (initial audit — superseded by RE-AUDIT below)

# **NOT READY**

| Severity | OPEN count | PASS (info) |
|---|---|---|
| Critical | **2** | — |
| High | **2** | — |
| Medium | **3** | — |
| Low | **2** | — |
| Info | 0 open | **4** PASS |

**Blockers for any READY claim:** R18-CCV3-01, R18-CCV3-02, R18-CCV3-03, R18-CCV3-04 (minimum). Fixing tests or health green alone is insufficient.

**Preserve / token absence / rollback integrity:** PASS (do not confuse with product READY).

---

## RE-AUDIT — 2026-10-20 (independent; post-builder FIX_LOG)

**Auditor:** independent hostile stepladder (not the builder)  
**Live:** `http://127.0.0.1:4318/` health `status=ready`, `programIntegration=command-center-v3-r18`  
**Builder claims source:** `FIX_LOG_R18.md` “Post-audit builder fixes” — verified only with live HTTP / disk / hash evidence  
**Product code edits this pass:** none (this markdown only)

### Pass A — Headers + iframe sandbox

| Check | Result |
|---|---|
| PM `/vendor/command-center-v3/ForgeFront_PM.html` `X-Frame-Options` | **absent / empty** (not DENY) |
| PM CSP `frame-ancestors` | `'self'` |
| PM CSP `script-src` | `'self' 'unsafe-inline'` |
| Main `/` `X-Frame-Options` | **DENY** |
| Main `/` CSP `frame-ancestors` | `'none'` |
| `#programFrame` sandbox | **present:** `allow-scripts allow-same-origin allow-forms allow-downloads` |
| `/program` top-level | **200**, same PM-style CSP (`frame-ancestors 'self'`, `unsafe-inline`) |

**Pass A:** closes R18-CCV3-01, R18-CCV3-02, R18-CCV3-08 (sandbox present).

### Pass B — Events gate + vendor JSON + seal SHA

| Check | Result |
|---|---|
| `POST /api/program/events` `CONSENT_ACCEPTED` **no session** | **401** `SESSION_REQUIRED` |
| `POST ... CONSENT_ACCEPTED` **with** session+CSRF | **403** `FORBIDDEN_EVENT_TYPE` |
| `POST ... KANBAN_MOVE` with session | **403** `FORBIDDEN_EVENT_TYPE` |
| `POST ... INCIDENT_DETECTED` with session (control) | **200**; `consentAccepted=false` |
| `POST ... CERTIFICATE_CONFLICT` with session | **200**; `consentAccepted=false`, `kanbanUnlocked=false` |
| GET `.../dce_v3_access.json` | **403** |
| GET `.../dce_v3_state.json` | **403** |
| GET `.../something.json` | **403** |
| Disk `dce_v3_access.json` | **absent** |
| Disk `dce_v3_state.json` | **absent** |
| Sealed R17 zip SHA256 | `63F1F832986C120EF91B58E9C1390CE67A44E353E49757CBF91F473E45D10B99` |
| PRESERVE copy SHA256 | **identical** |

`http-utils.mjs`: vendor `.json` returns false from `isAllowedStaticRel` (explicit deny).  
Revoke path: `server.mjs` ~792 records `SECOND_SHOCK` on bridge when prior approval exists (**closes R18-CCV3-05**).

**Pass B:** closes R18-CCV3-03, R18-CCV3-05, R18-CCV3-06, R18-CCV3-07; seal **PASS**.

### Pass C — Deep-sync honesty + residuals

| Check | Result |
|---|---|
| Program UI deep-sync into CC V3 RAID/calendar fields? | **NO** — still OPEN |
| `/api/state` | **403** (PM cannot pull Resilience state API) |
| Program copy honesty | States bridge updates immediately; **deep auto-write not claimed** |
| `GET /api/program/bridge` unauthenticated | **200** (R18-CCV3-09 remains) |

**Pass C:** R18-CCV3-04 remains **OPEN** at **Medium** (accepted residual — capability gap with honest copy). R18-CCV3-09 remains **OPEN** at **Low** (accepted residual — loopback bridge read).

### Residual risk acceptance (explicit)

For READY under the stated rule (no Critical/High; Medium residuals explicitly accepted):

1. **R18-CCV3-04 (Medium)** — Accepted residual: parent bridge snapshot is the cascade surface; CC V3 iframe does not deep-sync RAID/calendar rows. Operator must treat PM workspace as separate until a future deep-write pass.
2. **R18-CCV3-09 (Low)** — Accepted residual: unauthenticated bridge GET on loopback-only bind.
3. Sandbox note (closed 08): `allow-same-origin` keeps latent parent access; not elevated to OPEN blocker.

---

## VERDICT (RE-AUDIT)

# **READY**

| Severity | OPEN | CLOSED this re-audit | Notes |
|---|---|---|---|
| Critical | **0** | 01, 02 | — |
| High | **0** | 03 | 04 downgraded to Medium residual |
| Medium | **1** (04 accepted) | 05, 06, 07 | — |
| Low | **1** (09 accepted) | 08 | — |
| Info | 0 open | — | seal / access absence still PASS |

**OPEN counts:** Critical 0 · High 0 · Medium 1 · Low 1  
**Path:** `docs/SECURITY_AUDIT_STEPLADDER_R18_CCV3.md`  
**Full path:** `<LOCAL_PATH_REDACTED>`
