import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const script = path.join(repoRoot, "scripts/ci-openspec-check.sh");

function run(files: string[], labels = "") {
  return spawnSync("bash", [script], {
    input: files.join("\n"),
    encoding: "utf8",
    env: { ...process.env, PR_LABELS: labels },
  });
}

describe("the OpenSpec change check", () => {
  it.each([
    [["apps/web/src/main.tsx"]],
    [["packages/brand/brand.json", "docs/x.md"]],
    [["infra/updater/src/index.ts"]],
    [["deploy/coolify/docker-compose.yml"]],
  ])("fails code without an OpenSpec change: %j", (files) => {
    const result = run(files);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("no-spec");
    expect(result.stdout).toContain("openspec/changes/");
  });

  it.each([
    [["apps/web/src/main.tsx", "openspec/changes/x/proposal.md"]],
    [["packages/a.ts", "openspec/changes/archive/2026-01-01-x/tasks.md"]],
    [["deploy/a.yml", "openspec/changes/x/specs/y/spec.md"]],
  ])("passes code that comes with a change: %j", (files) => {
    expect(run(files).status).toBe(0);
  });

  it("passes an archive-only pull request", () => {
    expect(
      run(["openspec/changes/archive/2026-01-01-x/proposal.md", "openspec/specs/y/spec.md"]).status,
    ).toBe(0);
  });

  it("passes code labelled no-spec among other labels", () => {
    expect(run(["apps/api/src/a.ts"], "bug,no-spec").status).toBe(0);
  });

  it("does not accept a label that only contains no-spec", () => {
    expect(run(["apps/api/src/a.ts"], "no-spec-ish").status).toBe(1);
  });

  it.each([
    [[".github/workflows/ci.yml"]],
    [["README.md", "docs/a.md", "scripts/a.sh", "package.json"]],
    [[]],
  ])("passes when no code changed: %j", (files) => {
    expect(run(files).status).toBe(0);
  });
});

describe("the openspec workflow", () => {
  const source = readFileSync(path.join(repoRoot, ".github/workflows/openspec-check.yml"), "utf8");
  const workflow = parse(source) as {
    on: { pull_request: { types: string[] } };
    permissions: Record<string, string>;
    jobs: Record<string, { name: string }>;
  };

  it("re-runs when labels change", () => {
    expect(workflow.on.pull_request.types).toEqual(
      expect.arrayContaining(["opened", "reopened", "synchronize", "labeled", "unlabeled"]),
    );
  });

  it("is read-only, uses pull_request and names the check", () => {
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(source).not.toContain("pull_request_target");
    expect(workflow.jobs.check?.name).toBe("OpenSpec change");
  });
});
