# The Meta Hackathon build — evidence index

Current local proof for the Meta Hackathon build. Public publication keeps the newest numbered run plus shared api-smoke, browser, investigation and build evidence. Earlier numbered runs and backups stay in the repository, outside the public set.

| Question | Current proof |
| --- | --- |
| Do offline suites pass? | [Product tests](run10/hackathon-tests.txt), [reference tests](run10/root-tests.txt) |
| Do the actual Meta routes answer? | [Provider pre-flight](run10/providers.json), [nonce smoke](api-smoke/summary.json) |
| Can all three routes perform a substantive investigation? | [Same-snapshot summary](investigation/summary.json), [packet](investigation/packet.json) |
| Does the guided live desktop story work? | [Desktop summary](run10/browser/summary.json), [desktop screenshot](run10/browser/desktop.png) |
| Does the guided mobile-width story work? | [Mobile summary](run10/browser-mobile/summary.json), [mobile screenshot](run10/browser-mobile/mobile.png) |
| What happens on a controlled slow timeout? | [Controlled summary](run10/browser-slow/summary.json), [stopped view](run10/browser-slow/stopped.png) |
| Can it be checked offline with a keyboard? | [Offline accessibility and keyboard summary](run10/browser-offline/summary.json) |
| Is the public copy self-contained and scrubbed? | [Judge checks](run10/judge-check.txt), [public tree](run10/public-tree.txt) |
| Are security checks and assets intact? | [Secret scan](run10/gitleaks.txt), [showcase integrity](run10/showcase-integrity.json) |

Fresh checks supersede earlier observations. Owner gates: [submission checklist](../docs/SUBMISSION_CHECKLIST.md).
