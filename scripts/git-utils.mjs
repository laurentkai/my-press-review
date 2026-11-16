import { execFileSync } from "node:child_process";

export function cleanGitEnvironment(input = process.env) {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key]) => !key.startsWith("GIT_") && key !== "RELEASE_GITHUB_TOKEN",
    ),
  );
}

export function gitRunner(root, { index, token } = {}) {
  const env = {
    ...cleanGitEnvironment(),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  if (index) env.GIT_INDEX_FILE = index;
  if (token) {
    env.GIT_CONFIG_COUNT = "1";
    env.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
    env.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
  }
  return (args, options = {}) =>
    execFileSync("git", args, {
      cwd: root,
      env,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    }).trim();
}

export function assertCurrentMain(root, sourceSha) {
  const git = gitRunner(root);
  if (
    !/^[a-f0-9]{40}$/.test(sourceSha) ||
    git(["rev-parse", "HEAD"]) !== sourceSha
  )
    throw new Error("Source SHA does not match HEAD.");
  const remote = git([
    "ls-remote",
    "--exit-code",
    "--heads",
    "origin",
    "refs/heads/Main",
  ]).split(/\s/)[0];
  if (remote !== sourceSha)
    throw new Error(
      "This run is obsolete: only the current remote Main may be deployed.",
    );
}
