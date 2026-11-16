import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertCurrentMain, gitRunner } from "./git-utils.mjs";
import { verifyRelease } from "./verify-release.mjs";

const root = process.cwd();
const release = join(root, ".release");
const metadata = await verifyRelease(release);
assertCurrentMain(root, metadata.sourceSha);
const temporary = await mkdtemp(join(tmpdir(), "press-review-index-"));
try {
  const git = gitRunner(root, {
    index: join(temporary, "index"),
    token: process.env.RELEASE_GITHUB_TOKEN,
  });
  git(["read-tree", "--empty"]);
  // Force ignores only for the already verified, deployment-only snapshot.
  git(["--work-tree", release, "add", "--force", "--all", "--", "."]);
  const actual = git(["ls-files", "-z"]).split("\0").filter(Boolean).sort();
  const expected = [...Object.keys(metadata.files), "release.json"].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("Git index differs from release manifest.");
  const tree = git(["write-tree"]);
  let parent;
  try {
    git([
      "ls-remote",
      "--exit-code",
      "--heads",
      "origin",
      "refs/heads/Production",
    ]);
    git(["fetch", "--no-tags", "origin", "refs/heads/Production"]);
    parent = git(["rev-parse", "FETCH_HEAD"]);
  } catch (error) {
    if (error.status !== 2) throw error;
  }
  // Validate again just before promotion; there are no migration/deploy steps here.
  assertCurrentMain(root, metadata.sourceSha);
  const commit = git(
    [
      "-c",
      "user.name=github-actions[bot]",
      "-c",
      "user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "commit-tree",
      tree,
      ...(parent ? ["-p", parent] : []),
    ],
    { input: `Deployed ${metadata.sourceSha}\n` },
  );
  git(["push", "origin", `${commit}:refs/heads/Production`]);
  console.log(
    `Production now contains deployed release ${metadata.sourceSha}.`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
