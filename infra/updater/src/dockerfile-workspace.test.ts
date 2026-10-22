import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

interface Manifest {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readManifest(dir: string): Manifest {
  return JSON.parse(readFileSync(path.join(repoRoot, dir, "package.json"), "utf8")) as Manifest;
}

const workspaceDirs = [
  ...readdirSync(path.join(repoRoot, "apps")).map((name) => `apps/${name}`),
  ...readdirSync(path.join(repoRoot, "packages")).map((name) => `packages/${name}`),
  "infra/sandboxes/supervisor",
  "infra/updater",
];
const dirByName = new Map(workspaceDirs.map((dir) => [readManifest(dir).name, dir]));

/** Every workspace package a package needs at install time, itself included. */
function workspaceClosure(name: string, seen = new Set<string>()): Set<string> {
  if (seen.has(name)) return seen;
  seen.add(name);
  const dir = dirByName.get(name);
  if (dir === undefined) return seen;
  const manifest = readManifest(dir);
  const deps = { ...manifest.dependencies, ...manifest.devDependencies };
  for (const dep of Object.keys(deps)) if (dirByName.has(dep)) workspaceClosure(dep, seen);
  return seen;
}

describe("Docker builds copy every workspace package they install", () => {
  it("lists every workspace manifest in the app image (pnpm --frozen-lockfile needs them all)", () => {
    const dockerfile = readFileSync(path.join(repoRoot, "infra/compose/Dockerfile"), "utf8");
    for (const dir of workspaceDirs) {
      expect(dockerfile, dir).toContain(`${dir}/package.json`);
    }
  });

  it("copies the updater's workspace dependencies, brand package included, into the updater image", () => {
    const dockerfile = readFileSync(path.join(repoRoot, "infra/updater/Dockerfile"), "utf8");
    const needed = [...workspaceClosure("@rakazo/updater")]
      .map((name) => dirByName.get(name))
      .filter((dir): dir is string => dir !== undefined && dir !== "infra/updater");
    expect(needed).toContain("packages/brand");
    for (const dir of needed) {
      expect(dockerfile, dir).toMatch(new RegExp(`^COPY ${dir} ${dir}$`, "m"));
    }
  });
});

describe("the server bundler", () => {
  it("bundles the brand package like the other workspace packages", () => {
    const script = readFileSync(path.join(repoRoot, "scripts/build-server.mjs"), "utf8");
    expect(script).toContain('args.path.startsWith("@nurlings/")');
  });
});
