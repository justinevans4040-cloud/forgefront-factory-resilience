# The Meta Hackathon build — evidence index

Follow the complete recovery at desktop and mobile widths, then inspect the tests behind each product claim. The public set contains the newest numbered run plus shared route/investigation/build proof.

| Question | Current proof |
| --- | --- |
| Do the suites pass? | [Product tests](run11/hackathon-tests.txt), [root regression tests](run11/root-tests.txt) |
| Which Meta routes answered? | [Start pre-flight](run11/providers-start.json), [latest pre-flight](run11/providers.json) |
| Does the live desktop guide work? | [Summary](run11/browser/summary.json), [completed room](run11/browser/desktop.png), [packet](run11/browser/packet.json) |
| Does the live mobile-width guide work? | [Summary](run11/browser-mobile/summary.json), [completed room](run11/browser-mobile/mobile.png), [acceptance](run11/browser-mobile/accepted.png), [second shock](run11/browser-mobile/second-shock.png), [retained rejected attempt](run11/browser-mobile/failed-packet.json) |
| What did the optional Fireworks attempts record? | [Earlier successful guide](run11/browser-fireworks/summary.json), [earlier packet](run11/browser-fireworks/packet.json), [latest rejected envelope](run11/browser-fireworks/failed-packet.json), [latest outcome](run11/browser-fireworks/failure.json), [earlier route-check stop](run11/fireworks-preflight-stopped.txt), [earlier investigation stop](run11/fireworks-investigation-stopped.txt) |
| Does route failure stay visible? | [Controlled HTTP 503 summary](run11/browser-red/summary.json), [RED route view](run11/browser-red/red.png) |
| Does a slow call stop cleanly? | [Controlled timeout summary](run11/browser-slow/summary.json), [stopped view](run11/browser-slow/stopped.png) |
| Can the full workflow run with a keyboard offline? | [Keyboard summary](run11/browser-offline/summary.json), [recovery open](run11/browser-offline/recovery-open.png), [accessibility command](run11/accessibility.txt) |
| Is the public copy self-contained and scrubbed? | [Judge checks](run11/judge-check.txt), [isolated public tree](run11/public-tree.txt) |
| Are secrets and images protected? | [Secret scan](run11/gitleaks.txt), [showcase integrity](run11/showcase-integrity.json) |
| Which tests prove the pitch? | [Claim proof map](../docs/CLAIM_PROOF.md), [failing-first tests](run11/tdd-red.txt), [passing regression tests](run11/tdd-green.txt) |

Each packet retains its actual model calls, source claims, decision history and checkpoint. Controlled tests are labeled separately. [Owner completion checklist](../docs/SUBMISSION_CHECKLIST.md).
