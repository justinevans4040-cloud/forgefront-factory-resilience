# The Meta Hackathon build — current evidence

Run twelve follows the focused recovery room from incident to verified proof. Public delivery selects this newest numbered run and shared model/tool evidence.

| Question | Evidence |
| --- | --- |
| Do the suites pass? | [Product suite](run12/hackathon-tests.txt), [root suite](run12/root-tests.txt) |
| Which primary routes answered? | [Provider pre-flight](run12/providers.json) |
| Does the offline keyboard workflow work? | [Accessibility command](run12/accessibility.txt), [keyboard summary](run12/browser-offline/summary.json), [mobile keyboard summary](run12/browser-offline-mobile/summary.json), [opening room](run12/browser-offline/recovery-open.png), [desktop](run12/browser-offline/desktop.png), [mobile](run12/browser-offline/mobile.png) |
| Does the live guide complete? | [Desktop summary](run12/browser/summary.json), [desktop](run12/browser/desktop.png), [mobile-width summary](run12/browser-mobile/summary.json), [mobile](run12/browser-mobile/mobile.png) |
| Does invalid output fail closed? | [Retained desktop rejection](run12/browser/failed-packet.json), [retained mobile rejection](run12/browser-mobile/failed-packet.json), [reasoning-budget regression](run12/tdd-reasoning-red.txt) |
| Can the recovery be inspected? | [Live packet](run12/browser/packet.json), [checkpoint](run12/browser/checkpoint.json), [readable report](run12/browser/report.md) |
| Does the public set stand alone? | [Judge check](run12/judge-check.txt), [isolated public tree](run12/public-tree.txt) |
| Are assets and secrets protected? | [Secret scan](run12/gitleaks.txt), [working tree scan](run12/gitleaks-working-tree.txt), [showcase integrity](run12/showcase-integrity.json) |
| Did independent audit ten re-verify? | [Product suite](run12/hackathon-tests-audit10.txt), [judge check](run12/judge-check-audit10.txt), [public tree](run12/public-tree-audit10.txt), [history scan](run12/gitleaks-audit10.txt) |
| Was behavior tested first? | [Initial red](run12/tdd-red.txt), [guide/report red](run12/tdd-flow-red.txt), [provider policy red](run12/tdd-provider-red.txt), [narration red](run12/tdd-narration-red.txt), [restart red](run12/tdd-restart-red.txt), [smoke defaults red](run12/tdd-smoke-red.txt), [green](run12/tdd-green.txt) |

Model-call records preserve requested and returned identities, exact source validation and elapsed inference. Sample runs are explicitly offline. The backup route receives no live request in this verification. [Contribution inventory](../HACKATHON_CONTRIBUTIONS.md) · [Owner checklist](../docs/SUBMISSION_CHECKLIST.md).
