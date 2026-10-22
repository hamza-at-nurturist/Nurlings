import { fileURLToPath } from "node:url";
import { runBrandChecks } from "../src/guard.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const results = await runBrandChecks(repoRoot);
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
