#!/usr/bin/env node
/**
 * Strip mojibake glyphs from ForgeFront_PM.html; keep middle-dot separators.
 * Evidence: /program Approvals "Security â€¢ …" + garbled sidebar .ico chars.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pm = path.join(root, 'vendor', 'command-center-v3', 'ForgeFront_PM.html');
let t = fs.readFileSync(pm, 'utf8');
const before = t;

// Nav / shortcut / activity: replace icon slot with empty string (keep labels).
// Pattern: ['id','GARBLED','Label'] -> ['id','','Label']
t = t.replace(/\['([a-z0-9-]+)','[^']*','([^']+)'\]/g, "['$1','','$2']");

// Shortcut buttons like: >âœ‰ Comms Hub<  -> >Comms Hub<
t = t.replace(/(data-v3jump="[^"]+">)[^A-Za-z0-9+]+/g, '$1');

// Activity bullets: use plain letters
t = t.replace(
  /\$\{x\.kind==='email'\?'[^']*':x\.kind==='sms'\?'[^']*':x\.kind==='call'\?'[^']*':x\.kind==='meeting'\?'[^']*':'[^']*'\}/g,
  "${x.kind==='email'?'E':x.kind==='sms'?'S':x.kind==='call'?'C':x.kind==='meeting'?'M':'·'}"
);

// Em-dash / left-arrow / hamburger
t = t.replace(/\u2014/g, '-');
t = t.replace(/\u2190/g, '<-');
t = t.replace(/>☰</g, '>Menu<');

// Drop any remaining sequences that start with Latin-1 debris of UTF-8 (â / Ã / Â + junk)
t = t.replace(/[âÃÂ][\u0080-\uFFFF]{0,5}/g, '');

// Normalize brand paths to absolute (survives /program URL rewrite)
t = t.replace(
  /(?:\.\/brand\/|\/vendor\/command-center-v3\/brand\/)forgefront-winged-emblem-C\.png/g,
  '/vendor/command-center-v3/brand/forgefront-winged-emblem-C.png'
);

fs.writeFileSync(pm, t, 'utf8');

const remaining = [...t.matchAll(/[^\x00-\x7F]+/g)].map((m) => m[0]);
const counts = new Map();
for (const s of remaining) counts.set(s, (counts.get(s) || 0) + 1);
console.log(JSON.stringify({
  changed: before !== t,
  beforeLen: before.length,
  afterLen: t.length,
  remainingNonAscii: [...counts.entries()].map(([s, n]) => ({ s, n, hex: Buffer.from(s, 'utf8').toString('hex') })),
  brandHref: (t.match(/href="[^"]*emblem[^"]*"/) || [])[0],
  brandSrc: (t.match(/src="[^"]*emblem[^"]*"/) || [])[0],
  navSample: t.split('\n').find((l) => l.includes("['COMMAND'")),
}, null, 2));
