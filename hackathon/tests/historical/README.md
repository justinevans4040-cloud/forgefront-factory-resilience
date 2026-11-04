# Historical UI contracts

The original test files remain unchanged in tests/unit, with byte-for-byte copies here. The manifest lists tests of removed recovery-room modules, old SVG geometry and fixed build stamps. scripts/test.mjs excludes only those named historical files from the current test run. They are retained as history, not presented as passing checks.

Current UI coverage is in current-ui.test.mjs, integration/ui.test.mjs and browser-smoke.mjs. Still-applicable backend/provider contracts from mixed files are preserved in current-ui-retained.test.mjs. Historical tests depend on source removed before this migration and can be studied against that earlier revision; running them on the current revision is expected to fail.

The superseded primary-guide-smoke and visual-audit-gate scripts are preserved under scripts/. Their active entry points now run the current eight-screen browser regression. Its recorded checks cover real Sample API flow, authorization cancellation and confirmation, task approval, outage invalidation, source record inspection, encrypted export, signed checkpoints, keyboard access, named controls, landmarks and desktop/mobile overflow. They do not claim a comprehensive WCAG audit or old design-score certification. Live browser and mock-live npm aliases were retired; provider checks remain separate and require explicit authorization before execution.
