import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = fileURLToPath(new URL("../src/", import.meta.url));

const FORBIDDEN = [
  /from\s+["']node:/,
  /import\s*\(\s*["']node:/,
  /\brequire\s*\(/,
  /\bprocess\.env\b/,
  /\bBuffer\.from\b/,
  /\bBuffer\.alloc\b/
];

async function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [];
  if (/\.mjs$/i.test(base) || /\.js$/i.test(base)) candidates.push(base);
  else candidates.push(`${base}.mjs`, `${base}.js`, join(base, "index.mjs"));
  for (const c of candidates) {
    try {
      await readFile(c);
      return c;
    } catch {}
  }
  return null;
}

async function walkBrowserGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const src = await readFile(entry, "utf8");
  for (const re of FORBIDDEN) {
    assert.equal(re.test(src), false, `Forbidden pattern ${re} in ${entry}`);
  }
  const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1]);
  for (const spec of imports) {
    const next = await resolveImport(entry, spec);
    if (next) await walkBrowserGraph(next, seen);
  }
  return seen;
}

test("src/app.mjs import graph has no node:* or Node-only globals", async () => {
  const entry = join(root, "app.mjs");
  const files = await walkBrowserGraph(entry);
  assert.ok(files.size >= 8);
  const names = [...files].map(f => f.replace(root, ""));
  assert.ok(names.some(n => n.includes("intake.mjs")));
  assert.ok(names.some(n => n.includes("sha256.mjs")));
});
