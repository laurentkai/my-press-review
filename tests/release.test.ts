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
    await exportRelease({ root, output, env, sourceSha: "a".repeat(40) });
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
    expect(config.account_id).toBe(env.CLOUDFLARE_ACCOUNT_ID);
    expect(config.d1_databases[0].database_id).toBe(
      env.CLOUDFLARE_D1_DATABASE_ID,
    );
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
        env,
        sourceSha: "a".repeat(40),
      }),
    ).rejects.toThrow("Unexpected asset");
    await expect(
      exportRelease({ root, output: root, env, sourceSha: "a".repeat(40) }),
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
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    git("init", "--initial-branch=Main");
    git("config", "user.name", "Release test");
    git("config", "user.email", "test@example.com");
    git("add", "AGENTS.md");
    git("commit", "-m", "Source");
    const sourceSha = git("rev-parse", "HEAD");
    git("init", "--bare", remote);
    git("remote", "add", "origin", remote);
    await exportRelease({
      root,
      output: join(root, ".release"),
      env,
      sourceSha,
    });
    const script = resolve("scripts/promote-release.mjs");
    const sourceIndex = git("ls-files", "--stage");
    execFileSync(process.execPath, [script], { cwd: root, stdio: "pipe" });
    const first = git("--git-dir", remote, "rev-parse", "Production");
    expect(
      git("--git-dir", remote, "ls-tree", "--name-only", "Production"),
    ).toBe("migrations\npublic\nrelease.json\nworker\nwrangler.json");
    expect(git("branch", "--show-current")).toBe("Main");
    expect(git("rev-parse", "HEAD")).toBe(sourceSha);
    expect(git("ls-files", "--stage")).toBe(sourceIndex);
    execFileSync(process.execPath, [script], { cwd: root, stdio: "pipe" });
    expect(git("--git-dir", remote, "rev-parse", "Production^")).toBe(first);
  });
});
