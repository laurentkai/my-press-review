import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deploymentConfiguration } from "./export-release.mjs";
import { verifyRelease } from "./verify-release.mjs";

export async function configureDeployment(root, env) {
  const { account, database } = deploymentConfiguration(env);
  const release = join(root, ".release");
  await verifyRelease(release);
  const output = join(root, ".deployment");
  await rm(output, { recursive: true, force: true });
  await cp(release, output, { recursive: true });
  const config = JSON.parse(
    await readFile(join(output, "wrangler.json"), "utf8"),
  );
  config.account_id = account;
  config.d1_databases[0].database_id = database;
  await writeFile(
    join(output, "wrangler.json"),
    JSON.stringify(config, null, 2) + "\n",
  );
  return output;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await configureDeployment(process.cwd(), process.env);
  console.log("Cloudflare IDs injected into ephemeral .deployment only.");
}
