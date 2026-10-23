// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub expressions are literal workflow fixtures.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const workflow = parse(readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8")) as {
  concurrency: { group: string; "cancel-in-progress": string };
};

/**
 * A concurrency group holds one running and one waiting run, and a newer waiting run cancels the
 * older one even with cancel-in-progress off. So main must not share a group between commits.
 */
describe("ci concurrency", () => {
  const { group } = workflow.concurrency;

  it("groups a pull request by its number so a new push replaces the older run", () => {
    expect(group).toContain("github.event.pull_request.number");
    expect(workflow.concurrency["cancel-in-progress"]).toBe(
      "${{ github.event_name == 'pull_request' }}",
    );
  });

  it("gives every other run its own group per commit, never the shared branch ref", () => {
    expect(group).toContain("github.sha");
    expect(group).not.toContain("github.ref");
  });
});
