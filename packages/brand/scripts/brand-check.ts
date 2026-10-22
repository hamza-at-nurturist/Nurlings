import { fileURLToPath } from "node:url";
import { brandChecks, releaseChecks, runBrandChecks } from "../src/guard.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
// `--release` adds the checks that only pass once placeholders are resolved.
const release = process.argv.includes("--release");
const results = await runBrandChecks(repoRoot, release ? releaseChecks : brandChecks);
let failed = false;
for (const { name, problems } of results) {
  if (problems.length === 0) {
    console.log(`ok   ${name}`);
    continue;
  }
  failed = true;
  console.error(`FAIL ${name}`);
  for (const problem of problems) console.error(`     - ${problem}`);
}
process.exit(failed ? 1 : 0);
