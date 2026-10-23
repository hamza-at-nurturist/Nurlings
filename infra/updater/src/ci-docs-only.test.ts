import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const script = path.join(repoRoot, "scripts/ci-docs-only.sh");

function classify(files: string[]): string {
  const result = spawnSync("bash", [script], { input: files.join("\n"), encoding: "utf8" });
  expect(result.status).toBe(0);
  return result.stdout.trim();
}

describe("the docs-only classifier", () => {
  it.each([
    [["openspec/specs/coolify-deployment/spec.md"]],
    [["openspec/changes/archive/2026-10-22-x/design.md", "docs/self-host.md"]],
    [["README.md", "CONTRIBUTING.md"]],
    [["deploy/coolify/README.md"]],
    [["docs/images/diagram.png", "openspec/config.yaml"]],
  ])("skips a change that only touches documentation: %j", (files) => {
    expect(classify(files)).toBe("code=false");
  });

  it.each([
    [["apps/api/src/index.ts"]],
    [["docs/self-host.md", "apps/web/src/main.tsx"]],
    [["deploy/coolify/docker-compose.yml"]],
    [["deploy/coolify/README.md", "deploy/coolify/docker-compose.yml"]],
    [[".github/workflows/ci.yml"]],
    [["package.json"]],
    [["packages/core/prompts/system.md"]],
    [["apps/www/content/page.md"]],
    [["scripts/ci-docs-only.sh"]],
  ])("runs everything when any file is not documentation: %j", (files) => {
    expect(classify(files)).toBe("code=true");
  });

  it("treats an empty list as code so a failed diff never skips the checks", () => {
    expect(classify([])).toBe("code=true");
  });
});

interface Job {
  needs?: string | string[];
  if?: string;
  uses?: string;
}

const workflow = parse(readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8")) as {
  jobs: Record<string, Job>;
};

describe("the ci workflow's docs-only skipping", () => {
  const needsChanges = (job: Job) => [job.needs ?? []].flat().includes("changes");

  it.each(["build", "test-integration"])("skips %s when only documentation changed", (name) => {
    const job = workflow.jobs[name] as Job;
    expect(needsChanges(job)).toBe(true);
    expect(job.if).toBe("needs.changes.outputs.code == 'true'");
  });

  it("skips Web E2E on a pull request unless it changes something the job exercises", () => {
    const job = workflow.jobs["test-e2e"] as Job;
    expect(needsChanges(job)).toBe(true);
    expect(job.if).toBe(
      "needs.changes.outputs.code == 'true' && needs.changes.outputs.e2e == 'true'",
    );
  });

  it("runs the native computer jobs on pushes only", () => {
    const job = workflow.jobs["native-computer"] as Job;
    expect(needsChanges(job)).toBe(true);
    expect(job.if).toBe("github.event_name == 'push' && needs.changes.outputs.code == 'true'");
  });

  it.each(["lint", "check", "test"])("always runs %s", (name) => {
    const job = workflow.jobs[name] as Job;
    expect(needsChanges(job)).toBe(false);
    expect(job.if).toBeUndefined();
  });

  it("only skips for pull requests and never changes what a push to main runs", () => {
    const source = readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
    expect(source).toContain('if [ "$EVENT_NAME" != pull_request ]');
    expect(source).toMatch(/echo "code=true" >> "\$GITHUB_OUTPUT"/);
    expect(source).toMatch(/echo "e2e=true" >> "\$GITHUB_OUTPUT"/);
  });
});
