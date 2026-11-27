import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import config from "../app.json";
import { addWatchTarget } from "./with-apple-watch.js";

const require = createRequire(import.meta.url);
const plugins = require.resolve("expo/config-plugins");
const expoRoot = dirname(require.resolve("expo/package.json"));
const xcode = createRequire(require.resolve("@expo/config-plugins", { paths: [dirname(plugins)] }))(
  "xcode",
);

const NAME = "HelloWorld";

/** Adds the watch targets to Expo's template project, writes it, and adds them again on the result. */
function regenerate(directory) {
  const file = join(directory, "project.pbxproj");
  mkdirSync(join(directory, NAME));
  writeFileSync(
    file,
    execFileSync("tar", [
      "-xOf",
      join(expoRoot, "template.tgz"),
      "package/ios/HelloWorld.xcodeproj/project.pbxproj",
    ]),
  );
  const project = xcode.project(file);
  project.parseSync();
  addWatchTarget(project, directory, NAME, config.expo);
  writeFileSync(file, project.writeSync());
  const regenerated = xcode.project(file);
  regenerated.parseSync();
  addWatchTarget(regenerated, directory, NAME, config.expo);
  return regenerated;
}

it("embeds one watch app with the correct sources, icon, and companion identity", () => {
  const directory = mkdtempSync(join(tmpdir(), "rakazo-watch-target-"));
  try {
    const regenerated = regenerate(directory);
    const { PBXCopyFilesBuildPhase, PBXNativeTarget } = regenerated.hash.project.objects;
    const [target] = Object.values(PBXNativeTarget).filter(
      (entry) => entry.name?.replaceAll('"', "") === "RakazoWatch",
    );
    expect(
      existsSync(
        join(
          directory,
          "RakazoWatch",
          "WatchAssets.xcassets",
          "AppIcon.appiconset",
          "app-icon.png",
        ),
      ),
    ).toBe(true);
    expect(target.productType).toBe('"com.apple.product-type.application"');
    const embed = Object.values(PBXCopyFilesBuildPhase).filter(
      (phase) => phase.name === '"Embed Watch Content"',
    );
    expect(embed).toHaveLength(1);
    expect(embed[0].files).toHaveLength(1);
    const sources = target.buildPhases.find(({ comment }) => comment === "Sources");
    expect(regenerated.hash.project.objects.PBXSourcesBuildPhase[sources.value].files).toHaveLength(
      4,
    );
    // The watch app is not registered in app.json, so the identity comes from the app's own.
    const watchBundleIdentifier = `${config.expo.ios.bundleIdentifier}.watchkitapp`;
    const settings = Object.values(regenerated.pbxXCBuildConfigurationSection()).filter(
      (entry) => entry.buildSettings?.PRODUCT_NAME?.replaceAll('"', "") === "RakazoWatch",
    );
    expect(settings).toHaveLength(2);
    for (const { buildSettings } of settings) {
      expect(buildSettings.INFOPLIST_KEY_WKCompanionAppBundleIdentifier).toBe(
        config.expo.ios.bundleIdentifier,
      );
      expect(buildSettings.PRODUCT_BUNDLE_IDENTIFIER.replaceAll('"', "")).toBe(
        watchBundleIdentifier,
      );
    }

    const bundleIdentifier = "com.example.rakazo-custom";
    addWatchTarget(regenerated, directory, NAME, {
      ...config.expo,
      ios: { ...config.expo.ios, bundleIdentifier },
    });
    for (const { buildSettings } of settings) {
      expect(buildSettings.INFOPLIST_KEY_WKCompanionAppBundleIdentifier).toBe(bundleIdentifier);
      expect(buildSettings.PRODUCT_BUNDLE_IDENTIFIER.replaceAll('"', "")).toBe(
        `${bundleIdentifier}.watchkitapp`,
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
