import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
export async function verifyRelease(release) {
  const metadata = JSON.parse(
    await readFile(join(release, "release.json"), "utf8"),
  );
  if (
    !/^[a-f0-9]{40}$/.test(metadata.sourceSha) ||
    !metadata.files ||
    typeof metadata.files !== "object"
  )
    throw new Error("Invalid release metadata.");
  async function walk(directory, prefix = "") {
    const paths = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = prefix + entry.name;
      if (entry.isDirectory())
        paths.push(...(await walk(join(directory, entry.name), path + "/")));
      else if (entry.isFile()) paths.push(path);
      else throw new Error("Only regular release files are allowed.");
    }
    return paths;
  }
  const expected = [...Object.keys(metadata.files), "release.json"].sort();
  const actual = (await walk(release)).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("Release file list differs from its manifest.");
  for (const [path, hash] of Object.entries(metadata.files)) {
    // The membership check above excludes traversal paths and absolute filenames.
    const actualHash = createHash("sha256")
      .update(await readFile(join(release, path)))
      .digest("hex");
    if (actualHash !== hash)
      throw new Error(`Release checksum mismatch: ${path}`);
  }
  return metadata;
}
