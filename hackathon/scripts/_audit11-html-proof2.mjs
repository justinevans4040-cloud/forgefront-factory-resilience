import {readFileSync, writeFileSync} from 'node:fs';
const path = new URL('../public/index.html', import.meta.url);
let html = readFileSync(path, 'utf8');
if (html.includes('class="proof-action"')) {
  console.log('already patched');
  process.exit(0);
}
const before = html;
html = html.replace(
  '<p id="passphrase-feedback" role="status">Use a separate export passphrase of 16 to 160 characters.</p><button id="encrypted-export">Export encrypted evidence packet ↓</button>',
  '<p id="passphrase-feedback" role="status">Use a separate export passphrase of 16 to 160 characters.</p><fieldset class="proof-action"><legend>Seal encrypted packet</legend><button id="encrypted-export">Export encrypted evidence packet ↓</button></fieldset>'
);
html = html.replace(
  '<button id="verify" class="secondary">Verify ledger</button><button id="checkpoint" class="secondary">Export independent checkpoint</button>',
  '<fieldset class="proof-action"><legend>Verify ledger</legend><button id="verify" class="secondary">Verify ledger</button></fieldset><fieldset class="proof-action"><legend>Retain independent checkpoint</legend><button id="checkpoint" class="secondary">Export independent checkpoint</button></fieldset>'
);
if (html === before) throw new Error('proof patch failed');
writeFileSync(path, html);
console.log({proofAction: (html.match(/proof-action/g) || []).length, fieldset: (html.match(/<fieldset/g) || []).length});
