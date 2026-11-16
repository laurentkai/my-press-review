import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export function deploymentConfiguration(env) {
  const account = env.CLOUDFLARE_ACCOUNT_ID ?? "";
  const database = env.CLOUDFLARE_D1_DATABASE_ID ?? "";
  if (!/^[a-f0-9]{32}$/i.test(account))
    throw new Error("CLOUDFLARE_ACCOUNT_ID must be a 32-character account ID.");
  if (
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(database) ||
    /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(database)
  ) {
    throw new Error(
      "CLOUDFLARE_D1_DATABASE_ID must identify a real production D1 database.",
    );
  }
  return { account, database };
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error("Symlinks are forbidden in deployment output.");
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile()) files.push(path);
    else throw new Error("Unsupported deployment file.");
  }
  return files.sort();
}

export async function exportRelease({ root, output, env, sourceSha }) {
  const { account, database } = deploymentConfiguration(env);
  if (!/^[a-f0-9]{40}$/.test(sourceSha))
    throw new Error("A full source commit SHA is required.");
  root = resolve(root);
  output = resolve(output);
  // Only one dedicated disposable directory can be replaced, never the checkout.
  if (output !== join(root, ".release"))
    throw new Error("Output must be the checkout .release directory.");
  const client = join(root, "dist/client");
  const assets = await walk(client);
  const allowedAsset =
    /^(?:index\.html|_headers|\.assetsignore|assets\/[A-Za-z0-9_-]+\.(?:js|css))$/;
  for (const asset of assets) {
    const path = relative(client, asset).split(sep).join("/");
    if (!allowedAsset.test(path))
      throw new Error(
        `Unexpected asset: ${path}. Extend the allowlist explicitly before deployment.`,
      );
  }
  if (
    !assets.includes(join(client, "index.html")) ||
    !assets.includes(join(client, "_headers"))
  )
    throw new Error("Missing index.html or security headers.");
  const migrationRoot = join(root, "migrations");
  const migrations = await walk(migrationRoot);
  if (
    !migrations.length ||
    migrations.some(
      (path) => !/^\d{4}_[a-z0-9_]+\.sql$/.test(relative(migrationRoot, path)),
    )
  )
    throw new Error("Unexpected or missing migration files.");
  const worker = join(root, "dist/my_press_review/index.js");
  // Read all required inputs before replacing an existing export.
  const workerCode = await readFile(worker);
  const built = JSON.parse(
    await readFile(join(root, "dist/my_press_review/wrangler.json"), "utf8"),
  );
  if (
    built.name !== "my-press-review" ||
    built.d1_databases?.length !== 1 ||
    built.d1_databases[0].binding !== "DB"
  )
    throw new Error("Unexpected Worker build configuration.");
  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, "worker"), { recursive: true });
  await writeFile(join(output, "worker/index.js"), workerCode);
  for (const file of assets) {
    const target = join(output, "public", relative(client, file));
    await mkdir(resolve(target, ".."), { recursive: true });
    await cp(file, target);
  }
  await cp(migrationRoot, join(output, "migrations"), { recursive: true });
  const config = {
    name: "my-press-review",
    account_id: account,
    main: "worker/index.js",
    compatibility_date: built.compatibility_date,
    compatibility_flags: built.compatibility_flags ?? [],
    no_bundle: true,
    upload_source_maps: false,
    assets: {
      directory: "./public",
      binding: built.assets.binding,
      not_found_handling: built.assets.not_found_handling,
      run_worker_first: built.assets.run_worker_first,
    },
    d1_databases: [
      {
        binding: "DB",
        database_name: "press-review",
        database_id: database,
        migrations_dir: "./migrations",
      },
    ],
    triggers: built.triggers,
  };
  await writeFile(
    join(output, "wrangler.json"),
    JSON.stringify(config, null, 2) + "\n",
  );
  const hashes = {};
  for (const file of await walk(output))
    hashes[relative(output, file).split(sep).join("/")] = createHash("sha256")
      .update(await readFile(file))
      .digest("hex");
  await writeFile(
    join(output, "release.json"),
    JSON.stringify(
      {
        sourceSha,
        wranglerVersion: JSON.parse(
          await readFile(
            join(root, "node_modules/wrangler/package.json"),
            "utf8",
          ),
        ).version,
        files: hashes,
      },
      null,
      2,
    ) + "\n",
  );
  return output;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = process.cwd();
  await exportRelease({
    root,
    output: join(root, ".release"),
    env: process.env,
    sourceSha: process.env.GITHUB_SHA ?? process.env.SOURCE_SHA ?? "",
  });
  console.log("Deployment-only export written to .release.");
}
