# ForgeFront by Wake Industries — Project Management System

## Purpose
ForgeFront Command V3 is a professional, multi-project operating workspace for exhibition, experiential, fabrication, logistics, installation, live-event and stakeholder management. It is designed to become the working command layer between project managers, production teams, clients, vendors, field crews and leadership — on phone and PC — without forcing users to jump between unrelated applications for daily project control.

## What V3 already contains
V3 includes the working project-management interface and data model for:
- portfolio / command-room visibility
- project workspaces and lifecycle control
- schedule and WBS management
- design and client approvals
- fabrication / production tracking
- logistics and freight coordination
- budget / commercial visibility
- RAID and change control
- actions and decisions
- on-site command workflows
- shared calendar and milestone views
- KPI and executive reporting
- stakeholder access concepts and project-scoped portals
- exports for presentations, intranet / office communications, CSV, ICS calendar and full workspace backup
- mobile / desktop responsive operation and PWA packaging
- realtime state synchronization when run through the included V3 server

## Communications — implementation status
The communications layer is **already built into the V3 architecture**. It is not intended to be hard-coded to one company, phone number, email account or conferencing tenant.

V3 includes integration points / adapters for:
- in-app email
- SMS / text messaging
- click-to-call / phone workflows
- video / audio / screen-sharing meeting rooms
- project conversation history
- stakeholder access links
- inbound communication webhook handling
- realtime multi-device project updates

### Important deployment rule
Communications are **customer-specific integrations**. The product should be delivered with the communications framework in place, then connected to each customer's own systems during implementation.

For each customer, deployment must bind V3 to the customer's approved:
- email domain / sending provider or Microsoft 365 / Google Workspace environment
- business phone / SMS provider and numbers
- identity / SSO and user directory
- video-meeting policy or preferred conferencing tenant
- internal file / document platform
- intranet / office communications environment
- security, retention and audit requirements

The included server currently provides a concrete provider implementation for Resend email and Twilio SMS/calling, plus embedded Jitsi meeting rooms. Those are **reference adapters, not a requirement that every customer use those vendors**. In a production implementation they can be replaced or extended with Microsoft Graph / Outlook / Teams, Google Workspace, Zoom, another telephony provider, or the customer's existing communications stack.

### What "embedded in the customer's system" means
The V3 application is the project-management workspace. During customer onboarding, its integration layer is configured so the customer can communicate from inside that workspace while messages, calls, meetings, identity, files and records remain tied to the customer's approved accounts and infrastructure.

The intent is:
1. User opens the project once in ForgeFront.
2. User can send project email or text, initiate a call, start/join a meeting, view project communications and publish stakeholder updates without leaving the workspace.
3. V3 routes those actions through the customer's configured providers and credentials.
4. The project record retains the relevant activity / status / references for operational continuity and auditability.

Provider secrets must never be stored in the standalone HTML file. They belong in the protected server / integration environment for that customer.

## Realtime phone + PC operation
- Standalone HTML supports local project operation and local browser persistence.
- Browser tabs can synchronize locally through BroadcastChannel where supported.
- The included V3 server enables shared realtime state across devices that can reach the server.
- Production phone / PC deployment should use HTTPS and authenticated user access.
- Public or external stakeholder access should use company identity, role-based permissions, project scoping and audit logging before confidential data is exposed.

## Stakeholder model
V3 is intended to support different access levels rather than giving everyone the same workspace.
Typical roles include:
- Project Manager / Administrator — full project control
- Executive / Leadership — portfolio, risk, financial and KPI visibility
- Client — approved project status, decisions, deliverables and controlled communications
- Design / Production / Logistics — workstream-specific execution access
- Vendor / Supplier — limited tasks, dates, documents and confirmations
- Field / Installation Crew — mobile-first on-site tasks, issues, contacts and run-of-show information

Every production deployment should define which data and actions each role can see or change.

## Export and office communication layer
V3 includes export pathways intended to turn live project data into established business communication formats, including:
- executive 16:9 presentation output
- print / PDF presentation output
- weekly project status reports
- intranet / SharePoint-style project bulletins
- schedule, RAID, actions and budget CSV exports
- ICS calendar output for Outlook / Google Calendar compatible import
- full JSON workspace backup

For a specific customer, branded templates should be mapped during onboarding so the same controlled project data can populate their preferred board deck, weekly report, client update and internal intranet format.

## Customer implementation checklist
Before calling a deployment production-ready, complete these items for that customer:
- [ ] Hosting environment selected and HTTPS enabled
- [ ] User authentication / SSO connected
- [ ] Role and project permissions configured
- [ ] Email integration connected and tested
- [ ] SMS / phone integration connected and tested if required
- [ ] Video-meeting integration selected and tested
- [ ] File / document storage connected
- [ ] Calendar integration connected
- [ ] Stakeholder portal security configured
- [ ] Customer branding and report templates mapped
- [ ] Data retention / audit requirements defined
- [ ] Backups and restore tested
- [ ] Realtime phone + PC sync tested on the customer's network
- [ ] Security review completed before external access is enabled

## Current reference provider configuration
The included reference server supports:
- Resend: `DCE_RESEND_API_KEY`, `DCE_EMAIL_FROM`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `DCE_CALLER_NUMBER`
- optional webhook protection: `DCE_WEBHOOK_SECRET`
- optional server port: `DCE_PORT`

See `DCE_V3_SERVER_CONFIG_EXAMPLE.txt` for the configuration skeleton.

## Handoff note for another developer / AI thread
Treat V3 as an **integration-ready project-management product**, not as a static HTML mockup and not as a spreadsheet conversion.

The communication features are intentionally separated from customer credentials. Do not remove them because they are not active in a clean package. Instead, preserve the communications UI and server integration layer and connect it to the target customer's approved systems during implementation.

When extending V3, maintain these principles:
- one project source of truth
- mobile and desktop parity
- no fake success states
- clear connected / disconnected integration status
- customer-specific credentials remain server-side
- communications happen inside the project workspace
- stakeholder access is scoped and permission-controlled
- exports derive from controlled project data
- realtime updates must be verifiable across authorized devices

---

## Solar Sales V1 — Live Call Engine

DCE now includes a `SALES` navigation group with:

- **Live Call** — deterministic next-best-action guidance during a solar qualification/appointment-setting call.
- **Lead Queue** — solar lead, qualification, roof, bill, appointment, verification, and call-stage tracking.

### Source hierarchy

1. Nancy and Jeff example calls supplied during onboarding are the primary behavioral source for call pacing, branching, and next-objective logic.
2. The employer training manual and August onboarding script are secondary references for branches not yet represented in recorded calls.
3. Contract/program facts are separate from sales behavior. Claims such as savings percentages, funding structure, utility affiliation, roof warranty, transfer terms, payment structure, and quoted rate increases remain marked **VERIFY** until tied to current approved documents.

### V1 operation

V1 is deliberately deterministic. The rep selects the branch that just occurred in the conversation; the engine returns one short objective, one short recommended line, required fields, and the next available actions. It does not listen to the microphone, transcribe calls, auto-dial, or auto-send messages.

Solar lead and call records live inside the normal DCE state object and therefore use the same local persistence, BroadcastChannel tab/device behavior, server state endpoint, and SSE synchronization already provided by Command Center V3.

### Files

- `solar_call_engine.js` — pure call-state/branch/guidance engine; browser + CommonJS compatible.
- `solar_call_engine.test.js` — Node built-in test suite.
- `V3.html` / `DCE_Command_Center_V3.html` — Solar Sales screens and DCE integration.
- `DCE_V3_sw.js` — caches the solar engine for installed/offline use.

Run tests from this directory:

```bash
node --test solar_call_engine.test.js
```
