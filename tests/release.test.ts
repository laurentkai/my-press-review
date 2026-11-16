// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deploymentConfiguration,
  exportRelease,
} from "../scripts/export-release.mjs";

import { configureDeployment } from "../scripts/configure-deployment.mjs";
import { verifyRelease } from "../scripts/verify-release.mjs";
import { cleanGitEnvironment } from "../scripts/git-utils.mjs";
const testGitEnv = {
  ...cleanGitEnvironment(),
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

const env = {
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_D1_DATABASE_ID: "12345678-1234-1234-1234-123456789abc",
};
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "press-release-test-"));
  roots.push(root);
  for (const path of [
    "dist/client/assets",
    "dist/my_press_review",
    "migrations",
    "node_modules/wrangler",
  ])
    await mkdir(join(root, path), { recursive: true });
  for (const [path, content] of Object.entries({
    "dist/client/index.html": '<html lang="fr"></html>',
    "dist/client/_headers": "/*\n X-Frame-Options: DENY",
    "dist/client/assets/main-test.js": 'console.log("demo")',
    "dist/my_press_review/.dev.vars": "TEST_ACCESS_CODE=fixture-not-exported",
    "dist/my_press_review/index.js":
      'export default { fetch: () => new Response("ok") }',
    "dist/my_press_review/wrangler.json": JSON.stringify({
      name: "my-press-review",
      compatibility_date: "2026-11-16",
      assets: {
        binding: "ASSETS",
        not_found_handling: "single-page-application",
        run_worker_first: ["/api", "/api/*"],
      },
      d1_databases: [{ binding: "DB" }],
      triggers: { crons: ["*/15 * * * *"] },
    }),
    "migrations/0001_initial.sql": "CREATE TABLE demo (id TEXT);",
    "node_modules/wrangler/package.json": '{"version":"4.162.0"}',
    "AGENTS.md": "Must not ship",
    ".env": "Must not ship",
  }))
    await writeFile(join(root, path), content);
  return root;
}
describe("deployment-only export", () => {
  it("rejects absent credentials and the local placeholder database", () => {
    expect(() => deploymentConfiguration({})).toThrow("ACCOUNT_ID");
    expect(() =>
      deploymentConfiguration({
        ...env,
        CLOUDFLARE_D1_DATABASE_ID: "00000000-0000-0000-0000-000000000000",
      }),
    ).toThrow("DATABASE_ID");
  });
  it("exports only deployment files, injects production IDs and records hashes", async () => {
    const root = await fixture();
    const output = join(root, ".release");
    await exportRelease({ root, output, sourceSha: "a".repeat(40) });
    expect((await readdir(output)).sort()).toEqual([
      "migrations",
      "public",
      "release.json",
      "worker",
      "wrangler.json",
    ]);
    const config = JSON.parse(
      await readFile(join(output, "wrangler.json"), "utf8"),
    );
    expect(config.account_id).toBeUndefined();
    expect(config.d1_databases[0].database_id).toBe(
      "00000000-0000-0000-0000-000000000000",
    );
    const deployment = await configureDeployment(root, env);
    const concrete = JSON.parse(
      await readFile(join(deployment, "wrangler.json"), "utf8"),
    );
    expect(concrete.account_id).toBe(env.CLOUDFLARE_ACCOUNT_ID);
    expect(concrete.d1_databases[0].database_id).toBe(
      env.CLOUDFLARE_D1_DATABASE_ID,
    );
    await verifyRelease(output);
    expect(config.d1_databases[0].migrations_dir).toBe("./migrations");
    const metadata = JSON.parse(
      await readFile(join(output, "release.json"), "utf8"),
    );
    expect(metadata.sourceSha).toBe("a".repeat(40));
    expect(Object.keys(metadata.files).sort()).toEqual([
      "migrations/0001_initial.sql",
      "public/_headers",
      "public/assets/main-test.js",
      "public/index.html",
      "worker/index.js",
      "wrangler.json",
    ]);
    expect(
      Object.values(metadata.files).every((hash) =>
        /^[a-f0-9]{64}$/.test(hash as string),
      ),
    ).toBe(true);
  });
  it("refuses unexpected files and unsafe output paths before replacing anything", async () => {
    const root = await fixture();
    await writeFile(join(root, "dist/client/.env"), "private");
    await expect(
      exportRelease({
        root,
        output: join(root, ".release"),
        sourceSha: "a".repeat(40),
      }),
    ).rejects.toThrow("Unexpected asset");
    await expect(
      exportRelease({ root, output: root, sourceSha: "a".repeat(40) }),
    ).rejects.toThrow("Output must");
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toBe(
      "Must not ship",
    );
  });
  it("promotes an exact snapshot without changing the source branch or index, preserving Production history", async () => {
    const root = await fixture();
    const remote = join(root, "remote.git");
    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        env: testGitEnv,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    git("init", "--initial-branch=Main");
    git("config", "user.name", "Release test");
    git("config", "user.email", "test@example.com");
    git("config", "core.hooksPath", "/dev/null");
    git("config", "commit.gpgsign", "false");
    git("add", "AGENTS.md");
    git("commit", "-m", "Source");
    const sourceSha = git("rev-parse", "HEAD");
    git("init", "--bare", remote);
    git("remote", "add", "origin", remote);
    git("push", "origin", "Main");
    git("config", "core.excludesFile", join(root, "ignore-global"));
    await writeFile(join(root, "ignore-global"), "*.json\n");
    await exportRelease({
      root,
      output: join(root, ".release"),
      sourceSha,
    });
    const script = resolve("scripts/promote-release.mjs");
    const sourceIndex = git("ls-files", "--stage");
    execFileSync(process.execPath, [script], {
      cwd: root,
      env: {
        ...testGitEnv,
        GIT_DIR: join(root, "foreign.git"),
        GIT_INDEX_FILE: join(root, "foreign-index"),
        GIT_WORK_TREE: "/",
      },
      stdio: "pipe",
    });
    const first = git("--git-dir", remote, "rev-parse", "Production");
    expect(
      git("--git-dir", remote, "ls-tree", "--name-only", "Production"),
    ).toBe("migrations\npublic\nrelease.json\nworker\nwrangler.json");
    expect(git("branch", "--show-current")).toBe("Main");
    expect(git("rev-parse", "HEAD")).toBe(sourceSha);
    expect(git("ls-files", "--stage")).toBe(sourceIndex);
    execFileSync(process.execPath, [script], {
      cwd: root,
      env: testGitEnv,
      stdio: "pipe",
    });
    expect(git("--git-dir", remote, "rev-parse", "Production^")).toBe(first);
    await writeFile(join(root, "AGENTS.md"), "New source revision");
    git("add", "AGENTS.md");
    git("commit", "-m", "Next source");
    git("push", "origin", "Main");
    // Simulate rerunning the old source checkout after remote Main moved on.
    git("checkout", "--detach", sourceSha);
    expect(() =>
      execFileSync(process.execPath, [script], {
        cwd: root,
        env: testGitEnv,
        stdio: "pipe",
      }),
    ).toThrow();
    expect(git("--git-dir", remote, "rev-parse", "Production^")).toBe(first);
  });
  it("rejects a modified or extended release manifest", async () => {
    const root = await fixture();
    const output = join(root, ".release");
    await exportRelease({ root, output, sourceSha: "a".repeat(40) });
    await writeFile(join(output, "worker/index.js"), "modified");
    await expect(verifyRelease(output)).rejects.toThrow("checksum");
    await writeFile(join(output, ".env"), "private");
    await expect(verifyRelease(output)).rejects.toThrow("file list");
  });
  it("refuses new runtime configuration or chunks rather than dropping them", async () => {
    const root = await fixture();
    const path = join(root, "dist/my_press_review/wrangler.json");
    const config = JSON.parse(await readFile(path, "utf8"));
    await writeFile(
      path,
      JSON.stringify({ ...config, vars: { NEW_SETTING: "" } }),
    );
    await expect(
      exportRelease({
        root,
        output: join(root, ".release"),
        sourceSha: "a".repeat(40),
      }),
    ).rejects.toThrow("Unsupported Worker configuration");
    await writeFile(path, JSON.stringify(config));
    await writeFile(join(root, "dist/my_press_review/chunk.js"), "chunk");
    await expect(
      exportRelease({
        root,
        output: join(root, ".release"),
        sourceSha: "a".repeat(40),
      }),
    ).rejects.toThrow("Unexpected Worker chunk");
  });
});
