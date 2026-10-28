/**
 * Pass-2 backup + verify helper (run when Shell is available):
 *   node tools/pass2-backup-and-verify.mjs
 */
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stamp = "20261025_0625";
const files = [
  "index.html",
  "src/styles.css",
  "src/app.mjs",
  "src/ui-viz.mjs",
  "server.mjs",
  "vendor/command-center-v3/ForgeFront_PM.html"
];

for (const rel of files) {
  const src = join(root, rel);
  const bak = join(root, `${rel}.bak_${stamp}`);
  if (!existsSync(bak)) {
    copyFileSync(src, bak);
    console.log("backed up", rel);
  } else {
    console.log("bak exists", bak);
  }
}

mkdirSync(join(root, "demo/redesign_20261025/pass2"), { recursive: true });
const r = spawnSync("npm", ["test"], { cwd: root, encoding: "utf8", shell: true, timeout: 300_000 });
writeFileSync(join(root, "demo/redesign_20261025/pass2/npm_test.txt"), (r.stdout || "") + (r.stderr || ""));
console.log("npm test status", r.status);
process.exit(r.status ?? 1);
