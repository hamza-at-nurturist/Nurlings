import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generatedAssetProblems, sourceAssetProblems } from "./assets.js";
import { parseBrand } from "./schema.js";

/**
 * Guards that keep an upstream merge from quietly undoing the white-label. Each check returns the
 * list of problems it found (empty means pass). New checks are added here as the rebrand lands.
 */
export interface BrandCheck {
  name: string;
  run(repoRoot: string): Promise<string[]>;
}

/** SHA-256 of the Apache-2.0 `LICENSE` exactly as upstream ships it. It must never change. */
export const UPSTREAM_LICENSE_SHA256 =
  "b9738182c46747cb7cd36cad62d55c8922ca8d0029df280d3d73bb3c95d34935";

export const licenseCheck: BrandCheck = {
  name: "LICENSE is byte-identical to upstream's",
  async run(repoRoot) {
    const bytes = await readFile(path.join(repoRoot, "LICENSE"));
    const actual = createHash("sha256").update(bytes).digest("hex");
    return actual === UPSTREAM_LICENSE_SHA256
      ? []
      : [`LICENSE changed (sha256 ${actual}); the original Apache-2.0 file must stay untouched.`];
  },
};

const NOTICE_PHRASES = [
  "Nurlings",
  "Nurturist AI",
  "based on Rakazo",
  "Elie Steinbock",
  "Apache License, Version 2.0",
  "https://github.com/elie222/rakazo",
  "has been modified",
];

export const noticeCheck: BrandCheck = {
  name: "NOTICE credits the upstream project",
  async run(repoRoot) {
    let notice: string;
    try {
      notice = (await readFile(path.join(repoRoot, "NOTICE"), "utf8")).replace(/\s+/g, " ");
    } catch {
      return ["NOTICE is missing; Apache-2.0 attribution to the upstream project must stay."];
    }
    return NOTICE_PHRASES.filter((phrase) => !notice.includes(phrase)).map(
      (phrase) => `NOTICE no longer says "${phrase}".`,
    );
  },
};

export const assetsCheck: BrandCheck = {
  name: "brand artwork and generated icons exist at the documented sizes",
  async run(repoRoot) {
    const brandDir = path.join(repoRoot, "packages/brand");
    const brand = parseBrand(JSON.parse(await readFile(path.join(brandDir, "brand.json"), "utf8")));
    return [
      ...(await sourceAssetProblems(brandDir, brand)),
      ...(await generatedAssetProblems(repoRoot)),
    ];
  },
};

export const brandChecks: BrandCheck[] = [licenseCheck, noticeCheck, assetsCheck];

export async function runBrandChecks(
  repoRoot: string,
  checks: BrandCheck[] = brandChecks,
): Promise<{ name: string; problems: string[] }[]> {
  return Promise.all(
    checks.map(async (check) => ({ name: check.name, problems: await check.run(repoRoot) })),
  );
}
