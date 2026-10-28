import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execSync } from "node:child_process";

const PROJECT_NAME = "forgefront-factory-resilience";

/** Walk up from startDir to find this package's git root (not a parent monorepo). */
export function findProjectGitRoot(startDir) {
  let dir = resolve(startDir);
  for (;;) {
    const pkg = join(dir, "package.json");
    const git = join(dir, ".git");
    if (existsSync(pkg) && existsSync(git)) {
      try {
        const name = JSON.parse(readFileSync(pkg, "utf8")).name;
        if (name === PROJECT_NAME) return dir;
      } catch {}
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function gitArchiveListsCiWorkflow(projectRoot) {
  const list = execSync("git archive --format=tar HEAD | tar -t", { cwd: projectRoot, encoding: "utf8" });
  return /\.github\/workflows\/ci\.yml/.test(list);
}
