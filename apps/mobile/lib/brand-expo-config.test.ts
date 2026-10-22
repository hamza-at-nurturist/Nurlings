import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brand } from "@nurlings/brand";
import type { ExpoConfig } from "expo/config";
import { describe, expect, it } from "vitest";
import { brandExpoConfig, placeholderProblems } from "./brand-expo-config";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const upstream = JSON.parse(readFileSync(join(mobileRoot, "app.json"), "utf8")).expo as ExpoConfig;

type PluginEntry = string | [string, Record<string, unknown>];
const plugin = (config: ExpoConfig, name: string) =>
  (config.plugins as PluginEntry[]).find((entry) => Array.isArray(entry) && entry[0] === name) as
    | [string, Record<string, any>]
    | undefined;

describe("brandExpoConfig", () => {
  const branded = brandExpoConfig(structuredClone(upstream));

  it("shows the product name as the app's display name", () => {
    expect(branded.name).toBe(brand.name);
  });

  it("names the product in every permission prompt and never the upstream name", () => {
    const prompts = JSON.stringify([branded.ios?.infoPlist, branded.plugins]);
    expect(prompts).toContain(`${brand.name} uses the camera`);
    expect(prompts).toContain(`${brand.name} uses the microphone`);
    expect(prompts).toContain(`${brand.name} connects to a self-hosted ${brand.name} server`);
    expect(prompts).not.toContain("Rakazo");
  });

  it("applies the bot rule to prompt wording", () => {
    expect(branded.ios?.infoPlist?.NSCameraUsageDescription).toBe(
      `${brand.name} uses the camera so you can attach photos to a ${brand.bot.singular} message.`,
    );
  });

  it("sets the bundle identifier and package from the brand", () => {
    expect(branded.ios?.bundleIdentifier).toBe("com.nurturistai.nurlings");
    expect(branded.android?.package).toBe("com.nurturistai.nurlings");
    expect(branded.ios?.bundleIdentifier).toBe(brand.native.bundleId);
  });

  it("leaves the URL scheme, slug and every other upstream value alone", () => {
    expect(branded.scheme).toBe("rakazo");
    expect(branded.slug).toBe(upstream.slug);
    expect(branded.version).toBe(upstream.version);
    expect(branded.android?.versionCode).toBe(upstream.android?.versionCode);
    expect(branded.ios?.supportsTablet).toBe(upstream.ios?.supportsTablet);
    expect(branded.runtimeVersion).toEqual(upstream.runtimeVersion);
    // Non-prompt plugin options pass through.
    expect(plugin(branded, "expo-notifications")?.[1]).toEqual({
      icon: "./assets/notification-icon.png",
    });
    expect(plugin(branded, "expo-audio")?.[1].enableBackgroundPlayback).toBe(false);
  });

  it("takes the splash colours from the brand", () => {
    const splash = plugin(branded, "expo-splash-screen")?.[1];
    expect(splash?.backgroundColor).toBe(brand.colors.splashLight);
    expect(splash?.dark.backgroundColor).toBe(brand.colors.splashDark);
    expect(splash?.image).toBe("./assets/splash-icon.png");
  });

  it("points the iOS icon at the Nurlings icon bundle, and every referenced icon exists", () => {
    expect(branded.ios?.icon).toBe(`../../packages/brand/${brand.assets.appleIcon}`);
    const referenced = [
      branded.ios?.icon,
      branded.icon,
      branded.android?.icon,
      branded.android?.adaptiveIcon?.foregroundImage,
      branded.android?.adaptiveIcon?.monochromeImage,
      branded.android?.adaptiveIcon?.backgroundImage,
      branded.web?.favicon,
      plugin(branded, "expo-splash-screen")?.[1].image,
      plugin(branded, "expo-notifications")?.[1].icon,
    ];
    for (const path of referenced) {
      expect(existsSync(join(mobileRoot, String(path))), String(path)).toBe(true);
    }
  });

  it("turns over-the-air updates off and carries no update URL", () => {
    expect(branded.updates).toEqual({ enabled: false });
    expect(JSON.stringify(branded)).not.toContain("u.expo.dev");
  });

  it("does not mutate its input", () => {
    const copy = structuredClone(upstream);
    brandExpoConfig(copy);
    expect(copy).toEqual(upstream);
  });
});

describe("placeholderProblems", () => {
  it("names each unfilled placeholder", () => {
    const config = {
      owner: "REPLACE_WITH_NURLINGS_EXPO_OWNER",
      extra: { eas: { projectId: "REPLACE_WITH_NURLINGS_EAS_PROJECT_ID" } },
    } as unknown as ExpoConfig;
    expect(placeholderProblems(config)).toEqual([
      "owner is still the placeholder REPLACE_WITH_NURLINGS_EXPO_OWNER",
      "extra.eas.projectId is still the placeholder REPLACE_WITH_NURLINGS_EAS_PROJECT_ID",
    ]);
  });

  it("accepts real values and a config with no Expo account at all", () => {
    const real = {
      owner: "nurlings",
      extra: { eas: { projectId: "11111111-2222-3333-4444-555555555555" } },
    } as unknown as ExpoConfig;
    expect(placeholderProblems(real)).toEqual([]);
    expect(placeholderProblems({} as ExpoConfig)).toEqual([]);
  });
});

describe("app.json and the Maestro flows", () => {
  const raw = readFileSync(join(mobileRoot, "app.json"), "utf8");

  it("carries no upstream Expo account, project, update channel or bundle id", () => {
    for (const forbidden of ["inbox-zero", "07f7eb04", "u.expo.dev", "com.rakazo.app"]) {
      expect(raw, forbidden).not.toContain(forbidden);
    }
  });

  it("leaves obvious placeholders for the Expo owner and project", () => {
    expect(upstream.owner).toBe("REPLACE_WITH_NURLINGS_EXPO_OWNER");
    expect((upstream.extra as { eas: { projectId: string } }).eas.projectId).toBe(
      "REPLACE_WITH_NURLINGS_EAS_PROJECT_ID",
    );
    expect(placeholderProblems(upstream)).toHaveLength(2);
  });

  it("agrees with the brand on the bundle id and keeps the URL scheme", () => {
    expect(upstream.ios?.bundleIdentifier).toBe(brand.native.bundleId);
    expect(upstream.android?.package).toBe(brand.native.bundleId);
    expect(upstream.scheme).toBe("rakazo");
  });

  it("targets the bundle id in every Maestro flow", () => {
    const flows: string[] = [];
    const visit = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (entry.name.endsWith(".yaml")) flows.push(path);
      }
    };
    visit(join(mobileRoot, ".maestro"));
    visit(join(mobileRoot, "e2e"));
    const withAppId = flows.filter((file) => /^appId:/m.test(readFileSync(file, "utf8")));
    expect(withAppId.length).toBe(16);
    for (const file of withAppId) {
      expect(readFileSync(file, "utf8"), file).toMatch(
        new RegExp(`^appId: ${brand.native.bundleId.replaceAll(".", "\\.")}$`, "m"),
      );
    }
    for (const file of flows) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/Sign (in to|up for) Rakazo/);
    }
  });
});

describe("through Expo's real config loader", () => {
  const expoCli = createRequire(join(mobileRoot, "package.json")).resolve("expo/bin/cli");

  function resolved(env: Record<string, string> = {}): ExpoConfig {
    const stdout = execFileSync(process.execPath, [expoCli, "config", "--json"], {
      cwd: mobileRoot,
      env: { ...process.env, EXPO_NO_TELEMETRY: "1", CI: "1", ...env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 90_000,
    });
    return JSON.parse(stdout) as ExpoConfig;
  }

  it("resolves the branded identity and keeps the URL scheme", () => {
    const config = resolved();
    expect(config.name).toBe(brand.name);
    expect(config.ios?.bundleIdentifier).toBe("com.nurturistai.nurlings");
    expect(config.android?.package).toBe("com.nurturistai.nurlings");
    expect(config.scheme).toBe("rakazo");
    expect(config.updates).toEqual({ enabled: false });
    expect(JSON.stringify(config.ios?.infoPlist)).not.toContain("Rakazo");
  }, 120_000);

  it("refuses a release build while an Expo placeholder is present", () => {
    const attempt = () =>
      resolved({
        EAS_BUILD_PROFILE: "production",
        EXPO_PUBLIC_API_URL: "https://api.example.test",
      });
    expect(attempt).toThrow(/Fill in the Nurlings Expo project/);
    expect(attempt).toThrow(/REPLACE_WITH_NURLINGS_EXPO_OWNER/);
  }, 120_000);
});
