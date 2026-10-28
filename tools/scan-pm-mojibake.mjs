#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pm = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'vendor', 'command-center-v3', 'ForgeFront_PM.html');
const t = fs.readFileSync(pm, 'utf8');
const re = /[^\x00-\x7F]{1,12}/g;
const counts = new Map();
let m;
while ((m = re.exec(t))) {
  const s = m[0];
  counts.set(s, (counts.get(s) || 0) + 1);
}
const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
for (const [s, n] of rows) {
  const hex = Buffer.from(s, 'utf8').toString('hex');
  console.log(`${n}\t${JSON.stringify(s)}\thex=${hex}`);
}
