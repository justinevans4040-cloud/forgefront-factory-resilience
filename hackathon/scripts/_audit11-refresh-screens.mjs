import {existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
const root = new URL('../', import.meta.url);
const srcDir = new URL('../evidence/run13/primary-browser-offline/', import.meta.url);
const destDir = new URL('../evidence/run13/design-iteration-12/', import.meta.url);
mkdirSync(destDir, {recursive: true});
const files = [
  'step-1-desktop.png','step-2-desktop.png','consent-initial-desktop.png','step-4-desktop.png','step-5-desktop.png',
  'step-6-desktop.png','consent-revised-desktop.png','step-8-desktop.png','step-9-desktop.png','step-10-desktop.png'
];
for (const name of files) {
  const from = new URL(name, srcDir);
  if (!existsSync(from)) throw new Error('missing ' + name);
  copyFileSync(from, new URL(name, destDir));
}
const screens = [
  {step:1,path:'evidence/run13/design-iteration-12/step-1-desktop.png',layout:{title:'Step 1 of 9 · Inspect the discrepancy',viewport:'1366x768',state:'Guided mode hides duplicate story logo. Cinematic dock/QA/conveyor SVG binds real quantities. Header logo retained.'}},
  {step:2,path:'evidence/run13/design-iteration-12/step-2-desktop.png',layout:{title:'Step 2 of 9 · Investigate the offline scenario',viewport:'1366x768',state:'Primary action runs Sample investigation. Workspace nav always visible without Workspaces disclosure.'}},
  {step:3,path:'evidence/run13/design-iteration-12/consent-initial-desktop.png',layout:{title:'Step 3 of 9 · Make the human decision',viewport:'1366x768',state:'Exact-phrase acceptance pinned with internal scroll.'}},
  {step:4,path:'evidence/run13/design-iteration-12/step-4-desktop.png',layout:{title:'Step 4 of 9 · Britt turns the decision into work',viewport:'1366x768',state:'Britt proposal untracked until approval.'}},
  {step:5,path:'evidence/run13/design-iteration-12/step-5-desktop.png',layout:{title:'Step 5 of 9 · Disrupt the plan again',viewport:'1366x768',state:'Shock select previews OFFLINE red hatch before apply.'}},
  {step:6,path:'evidence/run13/design-iteration-12/step-6-desktop.png',layout:{title:'Step 6 of 9 · Reinvestigate changed capacity',viewport:'1366x768',state:'Reinvestigation after CELL-MILL-2 offline.'}},
  {step:7,path:'evidence/run13/design-iteration-12/consent-revised-desktop.png',layout:{title:'Step 7 of 9 · Review the revised recovery',viewport:'1366x768',state:'Revised consent pinned; constrained options marked.'}},
  {step:8,path:'evidence/run13/design-iteration-12/step-8-desktop.png',layout:{title:'Step 8 of 9 · Britt replans the recovery work',viewport:'1366x768',state:'Blocked prior tasks coexist with revised proposal.'}},
  {step:9,path:'evidence/run13/design-iteration-12/step-9-desktop.png',layout:{title:'Step 9 of 9 · Verify and retain evidence',viewport:'1366x768',state:'Proof actions separated into labelled fieldsets.'}},
  {step:10,path:'evidence/run13/design-iteration-12/step-10-desktop.png',layout:{title:'Recovery story complete',viewport:'1366x768',state:'Packet sealed; ledger blocks and checkpoint retained.'}}
];
writeFileSync(new URL('../design/screens.json', import.meta.url), JSON.stringify(screens, null, 2) + '\n');
console.log('refreshed screens for post-fix review');
