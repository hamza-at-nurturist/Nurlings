import { copyFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { brandChecks, licenseCheck, noticeCheck, runBrandChecks } from "./guard.js";

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

describe("noticeCheck", () => {
  async function withNotice(text: string | null) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "brand-notice-"));
    if (text !== null) await writeFile(path.join(dir, "NOTICE"), text);
    return dir;
  }

  it("passes for the repository's NOTICE", async () => {
    expect(await noticeCheck.run(repoRoot)).toEqual([]);
  });

  it("accepts the same words re-wrapped across lines", async () => {
    const original = await readFile(path.join(repoRoot, "NOTICE"), "utf8");
    expect(await noticeCheck.run(await withNotice(original.replace(/ /g, "\n")))).toEqual([]);
  });

  it("names each credit that goes missing", async () => {
    const original = await readFile(path.join(repoRoot, "NOTICE"), "utf8");
    const problems = await noticeCheck.run(
      await withNotice(original.replace("Elie Steinbock", "someone")),
    );
    expect(problems).toEqual(['NOTICE no longer says "Elie Steinbock".']);
  });

  it("fails when NOTICE is deleted", async () => {
    const problems = await noticeCheck.run(await withNotice(null));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("NOTICE is missing");
  });

  it("is part of the default suite", () => {
    expect(brandChecks).toContain(noticeCheck);
  });
});
