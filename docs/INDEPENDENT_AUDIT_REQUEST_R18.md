# Independent hostile stepladder — R18 Command Center V3 Program tab

**Builder may not grade this.** Separate auditor only. No product edits unless Justin orders fixes.

## Scope under audit
`<LOCAL_PATH_REDACTED>`

## Preserve proof (must verify)
- Sealed R17 zip SHA256 still `63F1F832986C120EF91B58E9C1390CE67A44E353E49757CBF91F473E45D10B99`
- Folder `PRESERVE__R17_SEALED__20261020` intact
- `dce_v3_access.json` not present under vendor/

## Live experiment server (if running)
`http://127.0.0.1:4318/` — Program tab `#program`

## Stepladder rungs (loop until a clean pass finds nothing new)
1. Server/API — health, program bridge, consent/kanban still fail-closed
2. Static allowlist — vendor path only; no traversal; access.json blocked
3. Cascade honesty — inject/consent/kanban actually change bridge snapshot
4. UI — Program tab loads ForgeFront_PM.html; Resilience still works
5. Rollback — deleting worktree would not destroy sealed R17
6. Residual risk — iframe isolation, XSS from vendored HTML, dual-server confusion

## Output
Write `docs/SECURITY_AUDIT_STEPLADDER_R18_CCV3.md` with OPEN findings (Critical/High/Medium/Low/Info). Verdict READY only if three full passes find no new material issues. Do not accept builder FIX_LOG claims without re-proof.
