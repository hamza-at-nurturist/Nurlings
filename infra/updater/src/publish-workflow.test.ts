import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflowsDir = path.resolve(import.meta.dirname, "../../../.github/workflows");
const workflowText = readFileSync(path.join(workflowsDir, "publish-server-image.yml"), "utf8");
interface WorkflowJob {
  if?: string;
  needs?: string | string[];
  uses?: string;
  "runs-on"?: string;
  permissions?: Record<string, string>;
  strategy?: { matrix?: { arch?: string[]; include?: Array<Record<string, string>> } };
}

const workflow = parse(workflowText) as {
  on: Record<string, { branches?: string[]; tags?: string[] } | null>;
  jobs: {
    validate: WorkflowJob;
    build: WorkflowJob;
    "build-depot": WorkflowJob;
    publish: WorkflowJob;
  };
};
const ci = parse(readFileSync(path.join(workflowsDir, "ci.yml"), "utf8")) as {
  jobs: Record<string, WorkflowJob>;
};

describe("server image publish workflow", () => {
  // The fork never publishes upstream's images, so every job is guarded to the upstream repository.
  const upstreamOnly = "github.repository == 'elie222/rakazo' && ";

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
    expect(publish.needs).toEqual(["build", "build-depot"]);
    expect(publish.if).toContain("needs.build.result == 'success'");
    expect(publish.if).toContain("needs.build-depot.result == 'success'");
    expect(workflowText).toContain("push-by-digest=true");
    expect(workflowText).toContain("docker buildx imagetools create");
    expect(workflowText).toContain("for want in linux/amd64 linux/arm64");
    expect(workflowText).toContain("actions/attest-build-provenance@");
  });

  it("builds on Depot only when the repository names a project, and never for pull requests", () => {
    const depot = workflow.jobs["build-depot"];
    expect(depot.if).toBe(
      `${upstreamOnly}github.event_name != 'pull_request' && vars.DEPOT_PROJECT_ID != ''`,
    );
    expect(workflow.jobs.build.if).toBe(
      `${upstreamOnly}github.event_name != 'pull_request' && vars.DEPOT_PROJECT_ID == ''`,
    );
    expect(depot.permissions?.["id-token"]).toBe("write");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: this is the literal workflow expression
    expect(workflowText).toContain("project: ${{ vars.DEPOT_PROJECT_ID }}");
  });

  it("checks the app image for credentials before any tag points at it", () => {
    const checks = workflowText.match(/bash infra\/compose\/check-image\.sh/g) ?? [];
    // One check per build path, both before the publish job tags the digest.
    expect(checks).toHaveLength(2);
    // GitHub's runners check each architecture on its own leg; Depot's one build checks both.
    expect(workflowText).toContain('check-image.sh "$IMAGE" "$PLATFORM"');
    expect(workflowText).toContain("for platform in linux/amd64 linux/arm64; do");
    expect(workflowText.indexOf("check-image.sh")).toBeLessThan(
      workflowText.indexOf("docker buildx imagetools create"),
    );
  });

  it("publishes main from ci.yml so the production deploy waits for its image", () => {
    expect(workflow.on.push?.branches).toBeUndefined();
    expect(workflow.on).toHaveProperty("workflow_call");
    const publish = ci.jobs["publish-server-image"];
    expect(publish?.uses).toBe("./.github/workflows/publish-server-image.yml");
    expect(publish?.if).toBe("github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(ci.jobs["deploy-production"]?.if).toContain(upstreamOnly);
    expect(ci.jobs["publish-mobile-update"]?.if).toContain(upstreamOnly);
    expect(ci.jobs["deploy-production"]?.needs).toEqual([
      "lint",
      "check",
      "build",
      "test",
      "test-integration",
      "test-postgres-upgrade",
      "test-e2e",
      "publish-server-image",
    ]);
  });

  it("keeps pull requests read-only and every action pinned to a commit", () => {
    const validate = workflow.jobs.validate;
    expect(validate.if).toBe(`${upstreamOnly}github.event_name == 'pull_request'`);
    expect(workflow.jobs.build.if).toContain(`${upstreamOnly}github.event_name != 'pull_request'`);
    expect(workflow.jobs["build-depot"].if).toContain(
      `${upstreamOnly}github.event_name != 'pull_request'`,
    );
    expect(workflow.jobs.publish.if).toContain(`${upstreamOnly}!cancelled()`);
    expect(workflow.jobs.publish.if).toContain("github.event_name != 'pull_request'");
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

describe("nurlings image publish workflow: tags and the test server", () => {
  interface Step {
    name?: string;
    id?: string;
    if?: string;
    run?: string;
    uses?: string;
    env?: Record<string, string>;
  }
  const jobs = (
    parse(nurlingsText) as {
      jobs: Record<
        string,
        {
          needs?: string;
          if?: string;
          permissions?: Record<string, string>;
          steps: Step[];
          concurrency?: { "cancel-in-progress": boolean };
        }
      >;
    }
  ).jobs;
  const steps = jobs.publish?.steps ?? [];

  it("retags the commit's image for version tags and builds only when it did not", () => {
    const retag = steps.find((step) => step.id === "retag");
    expect(retag?.if).toBe("startsWith(github.ref, 'refs/tags/v')");
    expect(retag?.run).toContain("scripts/retag-commit-image.sh");
    expect(retag?.run).toContain("grep -v ':sha-'");
    const build = steps.find((step) => step.uses?.startsWith("docker/build-push-action@"));
    expect(build?.if).toBe("steps.retag.outputs.retagged != 'true'");
    expect(steps.indexOf(retag as Step)).toBeLessThan(steps.indexOf(build as Step));
  });

  it("redeploys the test server only after every image is published from main", () => {
    const deploy = jobs["deploy-test"];
    expect(deploy?.needs).toBe("publish");
    expect(deploy?.if).toBe("github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(deploy?.permissions).toEqual({});
  });

  it("reads the webhook and token from secrets through the environment only", () => {
    const step = jobs["deploy-test"]?.steps[0] as Step;
    expect(step.env).toEqual({
      // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions syntax, not a template literal
      WEBHOOK: "${{ secrets.COOLIFY_TEST_DEPLOY_WEBHOOK }}",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions syntax, not a template literal
      TOKEN: "${{ secrets.COOLIFY_TEST_DEPLOY_TOKEN }}",
    });
    expect(step.run).not.toContain("secrets.");
    expect(step.run).toContain('-z "$WEBHOOK"');
    expect(step.run).toContain("exit 0");
    // Only the status code is printed, so the address cannot reach the log.
    expect(step.run).toContain("2> /dev/null");
    expect(step.run).not.toMatch(/echo[^\n]*\$WEBHOOK/);
  });
});
