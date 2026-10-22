import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

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

export const brandChecks: BrandCheck[] = [licenseCheck];

export async function runBrandChecks(
  repoRoot: string,
  checks: BrandCheck[] = brandChecks,
): Promise<{ name: string; problems: string[] }[]> {
  return Promise.all(
    checks.map(async (check) => ({ name: check.name, problems: await check.run(repoRoot) })),
  );
}
