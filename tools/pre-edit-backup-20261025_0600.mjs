#!/usr/bin/env node
/** Byte-faithful pre-edit backups (run when Shell is available). Does not modify sources. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tag = "20261025_0600";
const pairs = [
  ["index.html", `index.html.bak_${tag}`],
  [path.join("src", "styles.css"), path.join("src", `styles.css.bak_${tag}`)],
  [path.join("src", "app.mjs"), path.join("src", `app.mjs.bak_${tag}`)],
  [
    path.join("vendor", "command-center-v3", "ForgeFront_PM.html"),
    path.join("vendor", "command-center-v3", `ForgeFront_PM.html.bak_${tag}`)
  ]
];

for (const [srcRel, dstRel] of pairs) {
  const src = path.join(root, srcRel);
  const dst = path.join(root, dstRel);
  fs.copyFileSync(src, dst);
  const len = fs.statSync(dst).size;
  console.log(`${dstRel}\t${len} bytes`);
}
