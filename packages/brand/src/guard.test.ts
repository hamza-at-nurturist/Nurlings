import { copyFile, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { licenseCheck, runBrandChecks } from "./guard.js";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

describe("licenseCheck", () => {
  it("passes for the repository's LICENSE", async () => {
    expect(await licenseCheck.run(repoRoot)).toEqual([]);
  });

  it("fails and says why when LICENSE is edited", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "brand-guard-"));
    await copyFile(path.join(repoRoot, "LICENSE"), path.join(dir, "LICENSE"));
    await writeFile(path.join(dir, "LICENSE"), "Apache License, but Nurlings\n", { flag: "a" });
    const problems = await licenseCheck.run(dir);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("LICENSE changed");
  });
});

describe("runBrandChecks", () => {
  it("reports every check by name", async () => {
    const results = await runBrandChecks(repoRoot);
    expect(results.map((r) => r.name)).toContain("LICENSE is byte-identical to upstream's");
    expect(results.every((r) => r.problems.length === 0)).toBe(true);
  });
});
