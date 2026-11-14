import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";

const script = path.resolve(import.meta.dirname, "../scripts/release-feed.mjs");

describe("release repository feed", () => {
  it.each(["own-app", ".rakazo", "_rakazo", "-rakazo"])(
    "packages repository %s without changing identity or signing settings",
    (repo) => {
      const root = mkdtempSync(path.join(os.tmpdir(), "release-feed-"));
      try {
        const file = path.join(root, "package.json");
        const input = {
          version: "1.2.3",
          build: {
            appId: "dev.example.app",
            mac: { notarize: true },
            publish: [{ provider: "github", owner: "parent", repo: "app" }],
          },
        };
        writeFileSync(file, JSON.stringify(input));
        const result = spawnSync(process.execPath, [script, file], {
          env: { ...process.env, GITHUB_REPOSITORY: `example-owner/${repo}` },
        });
        expect(result.status, result.stderr.toString()).toBe(0);
        expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({
          ...input,
          build: {
            ...input.build,
            publish: [{ provider: "github", owner: "example-owner", repo }],
          },
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it.each([
    "",
    "https://example.test/owner/repo",
    "owner/repo/extra",
    "owner/../repo",
    "owner/.",
    "owner/..",
    "owner/repo\nother",
  ])("rejects invalid repository %j before writing", (repository) => {
    const root = mkdtempSync(path.join(os.tmpdir(), "release-feed-"));
    try {
      const file = path.join(root, "package.json");
      const original = '{"build":{"mac":{}}}';
      writeFileSync(file, original);
      expect(
        spawnSync(process.execPath, [script, file], {
          env: { ...process.env, GITHUB_REPOSITORY: repository },
        }).status,
      ).not.toBe(0);
      expect(readFileSync(file, "utf8")).toBe(original);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("packaged update feed verification", () => {
  it.each([
    ["example-owner/123", { provider: "github", owner: "example-owner", repo: "123" }, true],
    ["true/false", { provider: "github", owner: "true", repo: "false" }, true],
    ["example-owner/app", { provider: "github", owner: "example-owner", repo: "app" }, true],
    ["example-owner/app", { provider: "generic", owner: "example-owner", repo: "app" }, false],
    ["example-owner/app", { provider: "github", owner: "another-owner", repo: "app" }, false],
    ["example-owner/app", { provider: "github", owner: "example-owner", repo: "other" }, false],
    ["example-owner/123", { provider: "github", owner: "example-owner", repo: 123 }, false],
    ["true/false", { provider: "github", owner: true, repo: false }, false],
    ["example-owner/app", null, false],
  ])("checks parsed repository values for %s", (repository, feed, accepted) => {
    const root = mkdtempSync(path.join(os.tmpdir(), "packaged-feed-"));
    try {
      const file = path.join(root, "app-update.yml");
      const contents = stringify(feed);
      writeFileSync(file, contents);
      const result = spawnSync(process.execPath, [script, "--verify", file], {
        env: { ...process.env, GITHUB_REPOSITORY: repository },
      });
      expect(result.status === 0, result.stderr.toString()).toBe(accepted);
      expect(readFileSync(file, "utf8")).toBe(contents);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
