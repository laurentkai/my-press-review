import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// A separate Git index creates a deployment-only tree without checking out
// another branch or modifying the developer's worktree/index.
const root = process.cwd();
const release = resolve(root, ".release");
const metadata = JSON.parse(
  await readFile(join(release, "release.json"), "utf8"),
);
if (!/^[a-f0-9]{40}$/.test(metadata.sourceSha))
  throw new Error("Invalid release source SHA.");
const git = (args, options = {}) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", ...options }).trim();
if (git(["rev-parse", "HEAD"]) !== metadata.sourceSha)
  throw new Error("The release must correspond to the current source commit.");
const temporary = await mkdtemp(join(tmpdir(), "press-review-index-"));
try {
  const env = { ...process.env, GIT_INDEX_FILE: join(temporary, "index") };
  git(["--work-tree", release, "add", "--all", "--", "."], { env });
  const tree = git(["write-tree"], { env });
  let parent;
  try {
    git(
      [
        "ls-remote",
        "--exit-code",
        "--heads",
        "origin",
        "refs/heads/Production",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    git(["fetch", "--no-tags", "origin", "refs/heads/Production"]);
    parent = git(["rev-parse", "FETCH_HEAD"]);
  } catch (error) {
    // ls-remote exits 2 only when the branch is absent; network/auth errors stop.
    if (error.status !== 2) throw error;
  }
  const commit = git(["commit-tree", tree, ...(parent ? ["-p", parent] : [])], {
    input: `Deploy ${metadata.sourceSha}\n`,
  });
  git(["push", "origin", `${commit}:refs/heads/Production`]);
  console.log(`Production now contains release ${metadata.sourceSha}.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
