// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub expressions are literal workflow fixtures.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface Step {
  name?: string;
  id?: string;
  if?: string;
  run?: string;
  uses?: string;
}

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const workflow = parse(readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8")) as {
  jobs: Record<string, { steps: Step[] }>;
};
const steps = workflow.jobs["publish-mobile-update"]?.steps ?? [];
const checkIndex = steps.findIndex((step) => step.id === "expo");

describe("the mobile update job without an Expo token", () => {
  it("records whether the token is set, with a notice, and never fails on a missing one", () => {
    const check = steps[checkIndex];
    expect(check?.name).toBe("Check Expo automation token");
    expect(check?.if).toBe("steps.ota.outputs.publish == 'true'");
    expect(check?.run).toContain("configured=true");
    expect(check?.run).toContain("configured=false");
    expect(check?.run).toContain("::notice::");
    expect(check?.run).not.toMatch(/\bexit 1\b/);
  });

  it("runs every step that needs Expo only when the token is set", () => {
    const after = steps.slice(checkIndex + 1);
    expect(after.map((step) => step.name ?? step.uses)).toEqual([
      expect.stringContaining("pnpm/action-setup"),
      expect.stringContaining("actions/setup-node"),
      "Set up Expo",
      "Install dependencies",
      "Verify mobile project",
      "Publish production update",
    ]);
    for (const step of after) expect(step.if).toBe("steps.expo.outputs.configured == 'true'");
  });

  it("still decides whether the change is safe for an update before it needs the token", () => {
    expect(steps.findIndex((step) => step.id === "ota")).toBeGreaterThan(-1);
    expect(steps.findIndex((step) => step.id === "ota")).toBeLessThan(checkIndex);
  });
});
