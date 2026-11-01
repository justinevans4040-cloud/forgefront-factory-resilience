import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for (const file of ['hackathon/public/app.mjs','hackathon/scripts/primary-guide-smoke.mjs','hackathon/scripts/browser-smoke.mjs']) {
  const r = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8'});
  if (r.status !== 0) {
    console.error(file, r.stderr || r.stdout);
    process.exit(1);
  }
  console.log('syntax ok', file);
}
const h = readFileSync('hackathon/public/index.html', 'utf8');
console.log({
  detailsWorkspace: h.includes('details id="workspace-switcher"'),
  navWorkspace: h.includes('nav id="workspace-switcher"'),
  shockPreview: h.includes('shock-preview'),
  proofAction: (h.match(/proof-action/g) || []).length,
  fieldset: (h.match(/<fieldset/g) || []).length,
  closingDetails: h.includes('</details>'),
});
const a = readFileSync('hackathon/public/app.mjs', 'utf8');
console.log({
  dock: a.includes('dock-bay'),
  preview: a.includes('preview-offline'),
  shockChange: a.includes("shock-cell').addEventListener('change'"),
  openFalse: a.includes("workspace-switcher').open"),
});
const css = readFileSync('hackathon/public/style.css', 'utf8');
console.log({
  guidedHideLogo: css.includes('body[data-guided=true] .story-hero{display:none'),
  shockPreviewCss: css.includes('.shock-preview{'),
});
