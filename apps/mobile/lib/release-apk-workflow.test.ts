import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  path.resolve(import.meta.dirname, "../../../.github/workflows/release-android-apk.yml"),
  "utf8",
);
const easConfig = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "../eas.json"), "utf8"),
) as { build: Record<string, { extends?: string; android?: { buildType?: string } }> };

describe("Android APK release workflow", () => {
  it("only runs on demand, from main or as an explicit preview, with release credentials", () => {
    expect(workflow).toMatch(/^on:\n {2}workflow_dispatch:\n {4}inputs:\n {6}preview:/m);
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).toContain("if: github.ref == 'refs/heads/main' || inputs.preview");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).not.toContain("cache: pnpm");
  });

  it("pins every third-party action to an immutable commit", () => {
    const actionReferences = [...workflow.matchAll(/uses:\s+([^\s#]+)/g)].map((match) => match[1]);
    expect(actionReferences.length).toBeGreaterThan(0);
    for (const reference of actionReferences) {
      expect(reference, reference).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it("builds a production-channel APK and never takes the desktop updater's latest release", () => {
    expect(easConfig.build["android-apk"]).toEqual({
      extends: "production",
      android: { buildType: "apk" },
    });
    expect(workflow).toContain('--profile "$EAS_PROFILE"');
    expect(workflow).toContain("inputs.preview && 'android-preview-apk' || 'android-apk'");
    expect(workflow).toContain("inputs.preview && 'android-preview' || 'android'");
    expect(workflow).toContain("--latest=false");
    expect(workflow).not.toContain("gh release delete");
    expect(readFileSync(path.resolve(import.meta.dirname, "../app.config.ts"), "utf8")).toContain(
      '"android-apk"',
    );
  });

  it("publishes a Nurlings-named APK without upstream names or OTA claims", () => {
    expect(workflow).toContain("nurlings.apk");
    expect(workflow).toContain('title="Nurlings for Android $VERSION ($VERSION_CODE)"');
    expect(workflow).toContain("nurturist-ai/nurlings Expo project");
    for (const forbidden of ["rakazo.apk", "Rakazo for", "inbox-zero", "over the air"]) {
      expect(workflow, forbidden).not.toContain(forbidden);
    }
  });
});
