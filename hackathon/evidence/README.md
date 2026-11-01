# The Meta Hackathon build — current evidence

Run thirteen follows the Meta-directed factory command center, Britt 4.0 and the recovery project board. Public delivery selects this newest numbered run.

| Question | Evidence |
| --- | --- |
| How did Meta direct the design? | [Design direction](../design/design-direction.json), [latest Wonder review](../design/iteration-14.json), [first review](../design/iteration-1.json) |
| Do primary guided actions complete? | [Offline primary-button proof](run13/primary-browser-offline/summary.json), [live Wonder/Baseten proof](run13/primary-browser/summary.json) |
| Which providers answered? | [Primary pre-flight](run13/providers.json) |
| Can every step be inspected at three sizes? | [Screenshot manifest](run13/primary-browser-offline/screens.json), [live captures](run13/primary-browser/screens.json) |
| Does the keyboard workflow work? | [Keyboard summary](run13/browser-offline/summary.json) |
| Can the recovery be inspected? | [Offline packet](run13/browser-offline/packet.json), [independent checkpoint](run13/browser-offline/checkpoint.json) |

Sample is explicitly offline. Primary live proof uses Wonder and Baseten. The optional backup receives no request. [Contribution inventory](../HACKATHON_CONTRIBUTIONS.md) · [Control mapping](../SECURITY_CONTROLS.md).

| Verification | Result artifact |
| --- | --- |
| Product and root suites | [Product tests](run13/hackathon-tests.txt), [root tests](run13/root-tests.txt) |
| Public delivery | [Isolated public tree](run13/public-tree.txt) |
| Accessibility | [Desktop command](run13/accessibility.txt), [mobile keyboard](run13/browser-offline-mobile/summary.json) |
| Root mission chain | [Node browser proof](run13/root-browser.txt) |
| Secret scan | [History scan](run13/gitleaks.txt) |
| Regression proof | [Original mocked-route stall](run13/primary-baseline-mocked/failure.json), [mocked-route completion](run13/primary-browser-mocked/summary.json) |
