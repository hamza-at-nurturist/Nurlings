import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflowText = readFileSync(
  path.resolve(import.meta.dirname, "../../../.github/workflows/publish-server-image.yml"),
  "utf8",
);
interface WorkflowJob {
  if?: string;
  needs?: string;
  "runs-on"?: string;
  strategy?: { matrix?: { arch?: string[]; include?: Array<Record<string, string>> } };
}

const workflow = parse(workflowText) as {
  jobs: { validate: WorkflowJob; build: WorkflowJob; publish: WorkflowJob };
};

describe("server image publish workflow", () => {
  it("builds every architecture natively instead of emulating arm64", () => {
    expect(workflowText).not.toContain("setup-qemu-action");
    const build = workflow.jobs.build;
    expect(build["runs-on"]).toContain("matrix.runner");
    expect(build.strategy?.matrix?.arch).toEqual(["amd64", "arm64"]);
    const runners = Object.fromEntries(
      (build.strategy?.matrix?.include ?? [])
        .filter((entry) => entry.arch !== undefined)
        .map((entry) => [entry.arch, entry.runner]),
    );
    expect(runners).toEqual({ amd64: "ubuntu-latest", arm64: "ubuntu-24.04-arm" });
  });

  it("publishes one verified multi-arch manifest per image after both builds", () => {
    const publish = workflow.jobs.publish;
    expect(publish.needs).toBe("build");
    expect(workflowText).toContain("push-by-digest=true");
    expect(workflowText).toContain("docker buildx imagetools create");
    expect(workflowText).toContain("for want in linux/amd64 linux/arm64");
    expect(workflowText).toContain("actions/attest-build-provenance@");
  });

  it("keeps pull requests read-only and every action pinned to a commit", () => {
    const validate = workflow.jobs.validate;
    const build = workflow.jobs.build;
    const publish = workflow.jobs.publish;
    const upstreamOnly = "github.repository == 'elie222/rakazo' && ";
    expect(validate.if).toBe(`${upstreamOnly}github.event_name == 'pull_request'`);
    expect(build.if).toBe(`${upstreamOnly}github.event_name != 'pull_request'`);
    expect(publish.if).toBe(`${upstreamOnly}github.event_name != 'pull_request'`);
    expect(workflowText).toContain("push: false");
    for (const match of workflowText.matchAll(/uses:\s+([^\s#]+)/g)) {
      expect(match[1], match[1]).toMatch(/@[0-9a-f]{40}$/);
    }
  });
});

const nurlingsText = readFileSync(
  path.resolve(import.meta.dirname, "../../../.github/workflows/publish-nurlings-images.yml"),
  "utf8",
);
const nurlings = parse(nurlingsText) as {
  on: { push: { branches: string[]; tags: string[] }; workflow_dispatch: unknown };
  jobs: {
    publish: {
      permissions: Record<string, string>;
      strategy: { matrix: { include: Array<Record<string, string>> } };
    };
  };
};

describe("upstream publish workflow in this repository", () => {
  it("only runs the image jobs in the upstream repository", () => {
    expect(workflowText).toContain("github.repository == 'elie222/rakazo'");
    for (const job of [workflow.jobs.validate, workflow.jobs.build, workflow.jobs.publish]) {
      expect(job.if).toMatch(/^github\.repository == 'elie222\/rakazo' && /);
    }
    // The installer smokes stay on everywhere.
    expect(parse(workflowText).jobs["installer-smoke"].if).toBe(
      "github.event_name == 'pull_request'",
    );
  });
});

describe("nurlings image publish workflow", () => {
  it("publishes on main, release tags and manual runs only", () => {
    expect(nurlings.on.push.branches).toEqual(["main"]);
    expect(nurlings.on.push.tags).toEqual(["v*"]);
    expect(nurlings.on).toHaveProperty("workflow_dispatch");
    expect(nurlingsText).not.toContain("pull_request");
  });

  it("builds app, updater and computer for amd64 from upstream's Dockerfiles", () => {
    const include = nurlings.jobs.publish.strategy.matrix.include;
    expect(include.map((entry) => entry.name)).toEqual(["app", "updater", "computer"]);
    expect(include.map((entry) => entry.dockerfile)).toEqual([
      "infra/compose/Dockerfile",
      "infra/updater/Dockerfile",
      "infra/sandboxes/computer/Dockerfile",
    ]);
    expect(nurlingsText).toContain("platforms: linux/amd64");
    expect(nurlingsText).not.toContain("arm64");
    expect(nurlingsText).not.toContain("attest");
    expect(nurlingsText).toContain("GIT_SHA={0}");
  });

  it("lowercases the namespace and never uses the mixed-case repository name", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions syntax, not a template literal
    expect(nurlingsText).toContain("${OWNER,,}");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions syntax, not a template literal
    expect(nurlingsText).toContain("ghcr.io/${OWNER,,}/nurlings/${{ matrix.name }}");
    expect(nurlingsText).not.toContain("github.repository }}");
    expect(nurlingsText).not.toMatch(/ghcr\.io\/[^\s$]*[A-Z]/);
  });

  it("tags edge on main and latest only for stable release tags", () => {
    expect(nurlingsText).toContain("type=sha,prefix=sha-");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions syntax, not a template literal
    expect(nurlingsText).toContain("value=edge,enable=${{ github.ref == 'refs/heads/main' }}");
    expect(nurlingsText).toContain("!contains(github.ref, '-')");
  });

  it("has the least privilege it needs and pins every action to a commit", () => {
    expect(nurlings.jobs.publish.permissions).toEqual({ contents: "read", packages: "write" });
    for (const match of nurlingsText.matchAll(/uses:\s+([^\s#]+)/g)) {
      expect(match[1], match[1]).toMatch(/@[0-9a-f]{40}$/);
    }
  });
});
