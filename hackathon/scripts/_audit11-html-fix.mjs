import {readFileSync, writeFileSync} from 'node:fs';
const path = new URL('../public/index.html', import.meta.url);
let html = readFileSync(path, 'utf8');

if (!html.includes('id="shock-preview"')) {
  if (!html.includes('id="shock-cell"')) throw new Error('shock-cell missing');
  html = html.replace(
    /<label for="shock-cell">[\s\S]*?<\/label>\s*<select id="shock-cell">/,
    '<label for="shock-cell">Machine to take offline</label><p id="shock-preview" class="shock-preview" role="status">Selecting a machine previews the offline state on the factory line.</p><select id="shock-cell">'
  );
}

if (!html.includes('class="proof-action"')) {
  // Wrap verify / passphrase / checkpoint into separate fieldsets without inventing new behavior.
  if (html.includes('<button id="verify">')) {
    html = html.replace(
      /<button id="verify">Verify ledger<\/button>/,
      '<fieldset class="proof-action"><legend>Verify ledger</legend><button id="verify">Verify ledger</button></fieldset>'
    );
  }
  if (html.includes('id="export-passphrase"') && html.includes('id="encrypted-export"')) {
    html = html.replace(
      /<label>Export passphrase[\s\S]*?<button id="encrypted-export">Export encrypted packet<\/button>/,
      '<fieldset class="proof-action"><legend>Seal encrypted packet</legend><label>Export passphrase <small id="passphrase-feedback"></small><input id="export-passphrase" type="password" autocomplete="new-password"></label><button id="encrypted-export">Export encrypted packet</button></fieldset>'
    );
  }
  if (html.includes('<button id="checkpoint">')) {
    html = html.replace(
      /<button id="checkpoint">Export independent checkpoint<\/button>/,
      '<fieldset class="proof-action"><legend>Retain independent checkpoint</legend><button id="checkpoint">Export independent checkpoint</button></fieldset>'
    );
  }
}

// Remove stray details if any remain around workspace (already converted).
html = html.replace(/<\/details>(?=<div class="rail-signal">)/, '');

writeFileSync(path, html);
console.log({
  shockPreview: html.includes('id="shock-preview"'),
  proofAction: (html.match(/proof-action/g) || []).length,
  fieldset: (html.match(/<fieldset/g) || []).length,
  detailsLeft: (html.match(/<\/?details/g) || []).length,
  shockSnippet: html.slice(html.indexOf('shock-cell') - 120, html.indexOf('shock-cell') + 80),
});
