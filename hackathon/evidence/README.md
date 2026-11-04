# Current verification evidence

This index describes the current eight-screen interface and server workflow. Earlier guided-interface captures and design scores remain historical records; they are not counted as a fresh verification of this candidate.

| Verification | Result | Retained evidence |
| --- | --- | --- |
| Full unit/integration suite | 264 passed, 0 failed, 3 explicitly historical skips | [Test output](run49/tests.txt), [summary](run49/verification.json) |
| Current browser workflow | Real source inspection, nonce authorization, separate task approval, outage invalidation, encrypted export and checkpoint | [Desktop/mobile proof](run49/browser-desktop.json) |
| Responsive presentation | All eight screens checked at desktop and emulated mobile widths; zero console errors | Desktop/mobile proof |
| Keyboard path | 44 keyboard actions through authorization, task approval and export | [Keyboard proof](run49/browser-keyboard.json) |
| Public hosting request guards | Complete Sample recovery path: 26 successful API responses, zero 429 responses; limits unchanged | [Public-mode proof](run49/browser-public.json) |
| Media integrity | Latest V14, 2:55.817, 33,132,466 bytes; public download matches SHA-256 | [Video metadata](run49/video.json), [video QA](../docs/VIDEO_QA.md) |
| Secret scanning | Working tree and 370-commit history: no leaks found | Verification summary |

The browser checks use explicitly selected **Sample** with zero provider requests. They prove workflow behavior and request-budget compliance, not live AI execution or physical-phone behavior. Current README images are 1920×1080 captures from this working flow, with the Sample label visible.

The video records a real Spark Open investigation on Baseten. Muse Wonder is an implemented, account-dependent route; Fireworks is standby and excluded from normal public traffic. Earlier [same-snapshot investigation observations](investigation/summary.json) are retained with their original scope. Model identity, source validation, failures and provider availability must be read from actual call records.

Forty-six obsolete UI test files are explicitly classified as historical; thirteen applicable backend/provider/design regressions extracted from mixed files run in the current suite. [Historical test manifest](../tests/historical/manifest.json) explains the retired contracts. These files and the three historical skips are not presented as passing current tests.

The engine checks stock and compatible shared capacity. It now supplies job portions matching its recovery totals; the default split remains 26 hours / $4,570. After the lost mill, every recovery view uses the changed digest and 40 online hours against 50 needed. The full-shop reference graph has a separate declared contract. [Calculation boundaries](../docs/FIXTURE_RUNTIME_ALIGNMENT.md) make those distinctions explicit.

Judge, dependency/link and isolated public-tree checks run on this prepared source. The [source manifest](../docs/SOURCE_MANIFEST.json) can be regenerated and verified with `node hackathon/scripts/source-manifest.mjs --write` and `node hackathon/scripts/source-manifest.mjs`. Text hashes normalize line endings; binary hashes preserve exact bytes.

[Judge walkthrough](../docs/JUDGES_GUIDE.md) · [Run guide](../RUN_GUIDE.md) · [Security controls](../SECURITY_CONTROLS.md) · [Submission checklist](../docs/SUBMISSION_CHECKLIST.md)
