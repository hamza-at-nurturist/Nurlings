import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const script = path.resolve(import.meta.dirname, "../../../scripts/retag-commit-image.sh");
const image = "ghcr.io/example/nurlings/app";
const commit = "a".repeat(40);
const dirs: string[] = [];

// A stand-in for docker that records its arguments and answers `imagetools inspect` from env.
function run(args: string[], env: { exists: boolean; createFails?: boolean }) {
  const dir = mkdtempSync(path.join(tmpdir(), "retag-"));
  dirs.push(dir);
  const log = path.join(dir, "calls.log");
  const docker = path.join(dir, "docker");
  writeFileSync(
    docker,
    `#!/usr/bin/env bash
echo "$*" >> "${log}"
case "$*" in
  "buildx imagetools inspect"*) [ "$STUB_EXISTS" = 1 ] ;;
  "buildx imagetools create"*) [ "$STUB_CREATE_FAILS" != 1 ] ;;
esac
`,
  );
  chmodSync(docker, 0o755);
  const result = spawnSync("bash", [script, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      STUB_EXISTS: env.exists ? "1" : "0",
      STUB_CREATE_FAILS: env.createFails ? "1" : "0",
    },
  });
  const calls = (() => {
    try {
      return readFileSync(log, "utf8").trim().split("\n");
    } catch {
      return [];
    }
  })();
  return { status: result.status, stdout: result.stdout, calls };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("retagging a commit's image", () => {
  it("points every tag at the sha image in one call, without building", () => {
    const result = run([image, commit, `${image}:v1.2.3`, `${image}:v1.2`, `${image}:latest`], {
      exists: true,
    });
    expect(result.status).toBe(0);
    expect(result.calls).toEqual([
      `buildx imagetools inspect ${image}:sha-${commit}`,
      `buildx imagetools create --tag ${image}:v1.2.3 --tag ${image}:v1.2 --tag ${image}:latest ${image}:sha-${commit}`,
    ]);
  });

  it("exits 10 and creates nothing when the sha image is missing", () => {
    const result = run([image, commit, `${image}:v1.2.3`], { exists: false });
    expect(result.status).toBe(10);
    expect(result.calls).toEqual([`buildx imagetools inspect ${image}:sha-${commit}`]);
  });

  it("fails, rather than asking for a build, when the retag itself fails", () => {
    const result = run([image, commit, `${image}:v1.2.3`], { exists: true, createFails: true });
    expect(result.status).not.toBe(0);
    expect(result.status).not.toBe(10);
  });

  it("needs an image, a commit and at least one tag", () => {
    const result = run([image, commit], { exists: true });
    expect(result.status).toBe(2);
    expect(result.calls).toEqual([]);
  });
});
