import { assertCurrentMain } from "./git-utils.mjs";
assertCurrentMain(
  process.cwd(),
  process.env.GITHUB_SHA ?? process.env.SOURCE_SHA ?? "",
);
console.log("Source matches current remote Main.");
