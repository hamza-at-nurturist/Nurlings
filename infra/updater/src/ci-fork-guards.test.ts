// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub expressions are literal workflow fixtures.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface Step {
  name?: string;
  run?: string;
}
interface Job {
  if?: string;
  steps?: Step[];
}

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const workflow = parse(readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8")) as {
  jobs: Record<string, Job>;
};
const upstreamOnly = "github.repository == 'elie222/rakazo'";

/**
 * CI is upstream's, merged as is, with the fork's differences kept to a few lines: the jobs that
 * publish to upstream's Expo project or deploy to upstream's host never run here, and the brand
 * guard runs with lint and again on the built web app.
 */
describe("the fork's CI differences", () => {
  it("keeps the jobs that target upstream's infrastructure off the fork", () => {
    expect(workflow.jobs["publish-mobile-update"]?.if).toContain(upstreamOnly);
    expect(workflow.jobs["deploy-production"]?.if).toContain(upstreamOnly);
  });

  it("checks the brand with lint and on the built web app", () => {
    const run = (job: string) => (workflow.jobs[job]?.steps ?? []).map((step) => step.run ?? "");
    expect(run("static-checks")).toContain("pnpm brand:check");
    expect(run("build")).toContain("pnpm brand:check --built");
  });
});
