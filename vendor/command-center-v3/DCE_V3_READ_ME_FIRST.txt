DCE COMMAND CENTER V3

QUICK PREVIEW
- Open V3.html directly.
- Everything project-management related works in local mode.
- Comms records, meeting rooms, exports, stakeholder setup and mobile layouts are visible immediately.

FULL PHONE + PC / REALTIME MODE
- On Windows, double-click START_DCE_V3.bat.
- Your PC opens http://localhost:8787.
- Other reachable devices can use this PC/server address on port 8787.
- Real-time updates use the V3 server; local browser tabs also sync through BroadcastChannel.
- For install-to-home-screen/desktop PWA behavior, serve over HTTPS (or localhost on the same machine).

COMMUNICATION PROVIDERS
- Email adapter: Resend environment variables.
- SMS + click-to-call adapter: Twilio environment variables.
- Video/audio/screen share: embedded Jitsi meeting rooms.
- Provider secrets are intentionally NOT stored in the HTML file.
- See DCE_V3_SERVER_CONFIG_EXAMPLE.txt.

STAKEHOLDERS
- Stakeholder Hub creates read-only access links when V3 runs through its server.
- Links are project-scoped. For public internet deployment, add company SSO/identity before putting confidential project data online.

EXPORTS
- Presentation-ready 16:9 HTML
- Print/PDF presentation output
- Word-compatible weekly status .doc
- Intranet HTML bulletin
- Schedule / RAID / Actions / Budget CSV
- ICS calendar
- Full JSON workspace backup

PROJECT MANAGEMENT / IMPLEMENTATION HANDOFF
- Read README_PROJECT_MANAGEMENT_SYSTEM.md before integrating or extending V3.
- The communications layer is already part of the product architecture. It is intentionally not bound to one customer's accounts.
- Email, SMS, calling, meetings, identity and stakeholder communications must be connected per customer to that customer's approved providers and embedded into their operating environment.
- Do not remove communications features just because provider credentials are absent in the clean package. Configure or replace the adapters during customer implementation.


SOLAR SALES V1 — HOSTILE AUDIT HARDENING
- Live Call now enforces valid state transitions instead of accepting out-of-order events.
- Bill receipt remains available after a bill request.
- Do Not Contact is persisted separately and blocks new calls, including duplicate phone/email/address matches.
- Caller setup requires rep name, rep ID, approved company/vendor identity, and explicit approval confirmation.
- Nearby-work wording is used only when the lead record marks that local work reference verified.
- Appointment type (Phone / Zoom / In-person / Other) is explicit so the scheduled format cannot silently differ from what the homeowner is told.
- Jeff-specific payment-structure and household/succession concerns are first-class objection branches.

SERVER SECURITY
- Default bind is now 127.0.0.1.
- For phone/Tailscale/LAN use, set DCE_HOST=0.0.0.0 AND DCE_API_TOKEN=<long random token>.
- The browser asks for the API token once per session; it is kept in sessionStorage, not shared workspace state.
- Non-loopback startup without a token fails closed unless DCE_ALLOW_UNAUTHENTICATED=1 is deliberately set.
- State/access JSON and server configuration files are not statically served.
- Inbound webhook is disabled unless DCE_WEBHOOK_SECRET is configured.

VERCEL
- vercel.json provides a static/local-only preview deployment from this folder.
- Full realtime shared-state/server operation is NOT represented as Vercel-ready because the included Node server uses file-backed persistence and a long-lived SSE process. Use the local/Tailscale server for full V3 behavior until persistence/realtime are moved to Vercel-compatible managed services.
