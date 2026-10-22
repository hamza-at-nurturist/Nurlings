import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { brandChecks, builtChecks, runBrandChecks } from "./guard.js";
import {
  builtWebCheck,
  deploymentDocCheck,
  desktopPackageCheck,
  expoConfigCheck,
  registryDefaultsCheck,
  serverTextCheck,
  upstreamNameInServerText,
} from "./repo-checks.js";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/** A scratch repository holding copies of the named files, so a test can seed a leak. */
async function scratch(files: string[]) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brand-repo-"));
  for (const file of ["packages/brand/brand.json", ...files]) {
    await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
    await cp(path.join(repoRoot, file), path.join(dir, file));
  }
  return {
    dir,
    async edit(file: string, change: (text: string) => string) {
      const full = path.join(dir, file);
      await writeFile(full, change(await readFile(full, "utf8")));
    },
  };
}

describe("the repository passes every static check", () => {
  it("has no problems in the default suite", async () => {
    const results = await runBrandChecks(repoRoot, brandChecks);
    expect(results.filter((result) => result.problems.length > 0)).toEqual([]);
    expect(results.length).toBeGreaterThanOrEqual(8);
  });

  it("only adds the built-web scan for --built", () => {
    expect(builtChecks).toEqual([...brandChecks, builtWebCheck]);
    expect(brandChecks).not.toContain(builtWebCheck);
  });
});

describe("registryDefaultsCheck", () => {
  const files = [
    "infra/compose/docker-compose.images.yml",
    "infra/compose/docker-compose.prod.yml",
    "infra/compose/docker-compose.prod.docker.yml",
    "infra/compose/.env.images.example",
    ".env.example",
  ];

  it("passes for the real files", async () => {
    expect(await registryDefaultsCheck.run(repoRoot)).toEqual([]);
  });

  it("names the file and line of an image outside the registry", async () => {
    const repo = await scratch(files);
    await repo.edit("infra/compose/docker-compose.images.yml", (text) =>
      text.replace("ghcr.io/nurturist-ai/nurlings/app", "ghcr.io/elie222/rakazo/app"),
    );
    const problems = await registryDefaultsCheck.run(repo.dir);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0]).toMatch(/docker-compose\.images\.yml:\d+ ghcr\.io\/elie222\/rakazo\/app/);
  });

  it("rejects a mixed-case image path", async () => {
    const repo = await scratch(files);
    await repo.edit(".env.example", (text) =>
      text.replace("ghcr.io/nurturist-ai/nurlings/app", "ghcr.io/nurturist-ai/Nurlings/app"),
    );
    expect((await registryDefaultsCheck.run(repo.dir)).join("\n")).toContain("Nurlings/app");
  });
});

describe("desktopPackageCheck", () => {
  it("passes for the real package", async () => {
    expect(await desktopPackageCheck.run(repoRoot)).toEqual([]);
  });

  it("catches the product name, the update feed and an upstream account", async () => {
    const repo = await scratch(["apps/desktop/package.json"]);
    await repo.edit("apps/desktop/package.json", (text) => {
      const pkg = JSON.parse(text);
      pkg.productName = "Rakazo";
      pkg.build.publish = { provider: "github", owner: "elie222", repo: "rakazo" };
      return JSON.stringify(pkg);
    });
    const problems = (await desktopPackageCheck.run(repo.dir)).join("\n");
    expect(problems).toContain("productName is Rakazo");
    expect(problems).toContain("build.publish");
    expect(problems).toContain("upstream host or account");
  });
});

describe("expoConfigCheck", () => {
  it("passes for the real app.json", async () => {
    expect(await expoConfigCheck.run(repoRoot)).toEqual([]);
  });

  it("catches a changed bundle id, an update URL and the upstream Expo account", async () => {
    const repo = await scratch(["apps/mobile/app.json"]);
    await repo.edit("apps/mobile/app.json", (text) => {
      const config = JSON.parse(text);
      config.expo.ios.bundleIdentifier = "com.rakazo.app";
      config.expo.updates = { url: "https://u.expo.dev/07f7eb04" };
      return JSON.stringify(config);
    });
    const problems = (await expoConfigCheck.run(repo.dir)).join("\n");
    expect(problems).toContain("ios.bundleIdentifier");
    expect(problems).toContain("updates.url");
    expect(problems).toContain("u.expo.dev");
  });
});

describe("serverTextCheck", () => {
  it("passes for the real sources", async () => {
    expect(await serverTextCheck.run(repoRoot)).toEqual([]);
  });

  it("flags readable text but not comments, internal errors or persisted markers", () => {
    const source = [
      "// Rakazo is described in a comment",
      " * Rakazo in a doc block",
      'throw new Error("different Rakazo target");',
      'export const AUTOMATED_MESSAGE_LABEL = "[Automated message from Rakazo]";',
      "const repo = OFFICIAL_REPO_URL; // Rakazo",
      "const text = `Open Rakazo for details.`;",
      'const ok = "Open Nurlings for details.";',
    ].join("\n");
    expect(upstreamNameInServerText(source)).toEqual([6]);
  });

  it("names the file and line of a leak in a scanned source", async () => {
    const repo = await scratch(["packages/auth/src/index.ts"]);
    await repo.edit("packages/auth/src/index.ts", (text) =>
      text.replace(
        ["`Verify your ", "$", "{brand.name} email`"].join(""),
        "`Verify your Rakazo email`",
      ),
    );
    const problems = await serverTextCheck.run(repo.dir);
    expect(problems.some((problem) => problem.startsWith("packages/auth/src/index.ts:"))).toBe(
      true,
    );
  });
});

describe("deploymentDocCheck", () => {
  const files = ["infra/compose/install-images.sh", "docs/nurlings-deployment.md"];

  it("passes for the real files", async () => {
    expect(await deploymentDocCheck.run(repoRoot)).toEqual([]);
  });

  it("catches a variable the guide invents and one it forgets", async () => {
    const repo = await scratch(files);
    await repo.edit("docs/nurlings-deployment.md", (text) =>
      text.replaceAll("NURLINGS_REGISTRY_TOKEN", "NURLINGS_REGISTRY_SECRET"),
    );
    const problems = (await deploymentDocCheck.run(repo.dir)).join("\n");
    expect(problems).toContain("does not document NURLINGS_REGISTRY_TOKEN");
    expect(problems).toContain("NURLINGS_REGISTRY_SECRET, which the installer does not read");
  });
});

describe("builtWebCheck", () => {
  async function builtDist(files: Record<string, string>) {
    const repo = await scratch([]);
    const dist = path.join(repo.dir, "apps/web/dist");
    await mkdir(path.join(dist, "assets"), { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      await writeFile(path.join(dist, name), content);
    }
    return repo.dir;
  }
  const clean = {
    "index.html": "<title>Nurlings</title>",
    "site.webmanifest": '{"name":"Nurlings"}',
    "assets/app.js": 'const docs = "https://nurlings.nurturistai.com";',
  };

  it("passes for a branded build", async () => {
    expect(await builtWebCheck.run(await builtDist(clean))).toEqual([]);
  });

  it("asks for a build when there is none", async () => {
    const repo = await scratch([]);
    expect((await builtWebCheck.run(repo.dir))[0]).toContain("build the web app first");
  });

  it("catches the old name in the page and an upstream host in a chunk", async () => {
    const problems = (
      await builtWebCheck.run(
        await builtDist({
          ...clean,
          "index.html": "<title>Rakazo</title>",
          "assets/app.js": 'fetch("https://app.rakazo.com/privacy")',
        }),
      )
    ).join("\n");
    expect(problems).toContain("index.html must say Nurlings");
    expect(problems).toContain("assets/app.js contains rakazo.com");
  });

  it("does not trip over the unreachable bot-voices repository string in the shared core", async () => {
    const dir = await builtDist({
      ...clean,
      "assets/core.js": 'const url = "https://github.com/elie222/rakazo-bot-voices";',
    });
    expect(await builtWebCheck.run(dir)).toEqual([]);
  });
});
