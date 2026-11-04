# Current verification evidence

This index describes the current eight-screen interface and server workflow. Earlier guided-interface captures and design scores remain historical records; they are not counted as a fresh verification of this candidate.

| Verification | Result | Retained evidence |
| --- | --- | --- |
| Full unit/integration suite | 265 passed, 0 failed, 3 explicitly historical skips | [Latest GitHub CI](https://github.com/justinevans4040-cloud/forgefront-factory-resilience/actions/runs/41802114076), [prior local output](run50/tests.txt), [prior summary](run50/verification.json) |
| Current browser workflow | Real source inspection, nonce authorization, separate task approval, outage invalidation, encrypted export and checkpoint | [Desktop/mobile proof](run50/browser-desktop.json) |
| Responsive presentation | All eight screens checked at desktop and emulated mobile widths; zero console errors | Desktop/mobile proof |
| Keyboard path | 44 keyboard actions through authorization, task approval and export | [Keyboard proof](run50/browser-keyboard.json) |
| Public hosting request guards | Complete Sample recovery path: 26 successful API responses, zero 429 responses; limits unchanged | [Public-mode proof](run50/browser-public.json) |
| Media integrity | Latest V14, 2:55.817, 33,132,466 bytes; public download matches SHA-256 | [Video metadata](run50/video.json), [video QA](../docs/VIDEO_QA.md) |
| Secret scanning | Working tree and 370-commit history: no leaks found | Verification summary |
| Live Render deployment | Commit `1040363` on Node 24.22.2; health and prepared source match; live Spark investigation passed | [Deployment and model proof](run50/live-deployment.json) |

The browser checks use explicitly selected **Sample** with zero provider requests. They prove workflow behavior and request-budget compliance, not live AI execution or physical-phone behavior. Current README images are 1920×1080 captures from this working flow, with the Sample label visible.

The video records a real Spark Open investigation on Baseten. Muse Wonder is implemented for provisioned Meta accounts; Fireworks remains an isolated standby route. Earlier [same-snapshot investigation observations](investigation/summary.json) retain their original scope. Call records preserve the responding model identity, source validation, route status and provider outcome.

The fresh deployed check confirmed a real Baseten-hosted Muse Spark Open investigation, the 100-versus-3 source comparison, the 26h / $4,570 recovery and the separate human authorization wall. Task-draft validation was exercised when the Muse Wonder route and its bounded Spark continuation returned `INVALID_TASK_DRAFT`; the server protected the workflow by stopping task creation. The Sample route then completed task approval, the 50h-versus-40h disruption, retained checkpoint and full-shop reference view.

Forty-six obsolete UI test files are explicitly classified as historical; thirteen applicable backend/provider/design regressions extracted from mixed files run in the current suite. [Historical test manifest](../tests/historical/manifest.json) explains the retired contracts. These files and the three historical skips are not presented as passing current tests.

The engine checks stock and compatible shared capacity. It now supplies job portions matching its recovery totals; the default split remains 26 hours / $4,570. After the lost mill, every recovery view uses the changed digest and 40 online hours against 50 needed. The full-shop reference graph has a separate declared contract. [Calculation boundaries](../docs/FIXTURE_RUNTIME_ALIGNMENT.md) make those distinctions explicit.

Judge, dependency/link and isolated public-tree checks run on this prepared source. The [source manifest](../docs/SOURCE_MANIFEST.json) can be regenerated and verified with `node hackathon/scripts/source-manifest.mjs --write` and `node hackathon/scripts/source-manifest.mjs`. Text hashes normalize line endings; binary hashes preserve exact bytes.

[Judge walkthrough](../docs/JUDGES_GUIDE.md) · [Run guide](../RUN_GUIDE.md) · [Security controls](../SECURITY_CONTROLS.md) · [Submission checklist](../docs/SUBMISSION_CHECKLIST.md)
