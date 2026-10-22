import { fileURLToPath } from "node:url";
import { brandChecks, builtChecks, runBrandChecks } from "../src/guard.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
// `--built` adds the scan of the built web app (run after `pnpm --filter @rakazo/web build`).
const built = process.argv.includes("--built");
const results = await runBrandChecks(repoRoot, built ? builtChecks : brandChecks);
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
