import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const script = path.resolve(import.meta.dirname, "../../../scripts/ci-e2e-paths.sh");

function classify(files: string[]): string {
  const result = spawnSync("bash", [script], { input: files.join("\n"), encoding: "utf8" });
  expect(result.status).toBe(0);
  return result.stdout.trim();
}

describe("the Web E2E path classifier", () => {
  it.each([
    [["apps/web/src/main.tsx"]],
    [["apps/api/src/index.ts"]],
    [["apps/worker/src/index.ts"]],
    [["apps/www/src/pages/index.astro"]],
    [["packages/ui-web/src/button.tsx"]],
    [["packages/ui-tokens/src/tokens.ts"]],
    [["packages/chat-ui/src/thread.tsx"]],
    [["packages/contracts/src/index.ts"]],
    [["packages/db/prisma/schema.prisma"]],
    [["package.json"]],
    [["pnpm-lock.yaml"]],
    [["patches/some-package.patch"]],
    [[".github/workflows/playwright.yml"]],
    [[".github/workflows/ci.yml"]],
    [["docs/self-host.md", "apps/web/e2e/golden.spec.ts"]],
  ])("runs Web E2E for %j", (files) => {
    expect(classify(files)).toBe("e2e=true");
  });

  it.each([
    [["apps/mobile/app/index.tsx"]],
    [["apps/desktop/src/main.ts"]],
    [["infra/updater/src/index.ts"]],
    [["deploy/coolify/docker-compose.yml"]],
    [["docs/self-host.md", "README.md"]],
    [["openspec/changes/x/proposal.md"]],
    [[".github/workflows/publish-nurlings-images.yml"]],
    [["scripts/ci-openspec-check.sh"]],
  ])("skips Web E2E for %j", (files) => {
    expect(classify(files)).toBe("e2e=false");
  });

  it("runs Web E2E on an empty list so a failed diff never skips it", () => {
    expect(classify([])).toBe("e2e=true");
  });
});
