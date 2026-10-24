import type { ConfigContext, ExpoConfig } from "expo/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import appConfig from "../app.config";
import { brandExpoConfig } from "./brand-expo-config";

beforeEach(() => {
  vi.stubEnv("EAS_BUILD_PROFILE", "production");
  vi.stubEnv("EXPO_PUBLIC_API_URL", "https://app.example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const config: ExpoConfig = {
  name: "Example",
  slug: "example",
  android: { package: "com.example.app", permissions: ["POST_NOTIFICATIONS"] },
  ios: { bundleIdentifier: "com.example.app" },
  extra: { example: true },
};

function context(config: ExpoConfig): ConfigContext {
  return { config, projectRoot: "/project", staticConfigPath: null, packageJsonPath: null };
}

// app.config.ts brands whatever it is given before its own overlays, so every expectation is
// relative to that branded baseline: these tests are about the Firebase and passkey overlays.
const passkeysFor = (base: ExpoConfig, domains = ["webcredentials:app.example.com"]) => ({
  ios: { ...base.ios, associatedDomains: domains },
  extra: { ...base.extra, passkeyRpIds: ["app.example.com"] },
});

describe("mobile app config", () => {
  it("loads the Firebase file path while preserving the existing config", () => {
    vi.stubEnv("GOOGLE_SERVICES_JSON", "/build/google-services.json");
    const base = brandExpoConfig(config);

    expect(appConfig(context(config))).toEqual({
      ...base,
      ...passkeysFor(base),
      android: { ...base.android, googleServicesFile: "/build/google-services.json" },
    });
    expect(config.android).not.toHaveProperty("googleServicesFile");
  });

  it("builds the preview app as another package and name, without the Firebase file", () => {
    vi.stubEnv("NURLINGS_PREVIEW", "1");
    vi.stubEnv("GOOGLE_SERVICES_JSON", "/build/google-services.json");
    const result = appConfig(context(config));

    expect(result.name).toBe("Nurlings Preview");
    expect(result.android?.package).toBe("com.nurturistai.nurlings.preview");
    expect(result.android).not.toHaveProperty("googleServicesFile");
    expect(result.ios?.bundleIdentifier).toBe("com.nurturistai.nurlings");
  });

  it("keeps the real package and name when it is not a preview", () => {
    vi.stubEnv("NURLINGS_PREVIEW", undefined);
    const result = appConfig(context(config));

    expect(result.name).toBe("Nurlings");
    expect(result.android?.package).toBe("com.nurturistai.nurlings");
  });

  it("adds only the brand when no variable applies, and never mutates its input", () => {
    vi.stubEnv("EAS_BUILD_PROFILE", "development");
    vi.stubEnv("EXPO_PUBLIC_API_URL", undefined);
    vi.stubEnv("GOOGLE_SERVICES_JSON", undefined);
    const existing = {
      ...config,
      android: { ...config.android, googleServicesFile: "./custom-google-services.json" },
    };
    const before = structuredClone(existing);

    expect(appConfig(context(existing))).toEqual(brandExpoConfig(existing));
    expect(appConfig(context(config))).toEqual(brandExpoConfig(config));
    expect(existing).toEqual(before);
  });

  it("adds Android config when none exists", () => {
    vi.stubEnv("GOOGLE_SERVICES_JSON", "/build/google-services.json");
    const { android: _android, ...withoutAndroid } = config;
    const base = brandExpoConfig(withoutAndroid);

    expect(appConfig(context(withoutAndroid))).toEqual({
      ...base,
      ...passkeysFor(base),
      android: { ...base.android, googleServicesFile: "/build/google-services.json" },
    });
  });

  it("associates the default server's domain for passkeys and keeps other domains", () => {
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://App.Example.com:8443/api");
    const existing = { ...config, ios: { ...config.ios, associatedDomains: ["applinks:x.test"] } };
    const base = brandExpoConfig(existing);

    expect(appConfig(context(existing))).toEqual({
      ...base,
      ...passkeysFor(base, ["applinks:x.test", "webcredentials:app.example.com"]),
    });
  });

  it.each([
    "http://app.example.com",
    "https://localhost:3100",
    "https://192.168.1.20",
    "https://[::1]",
    "not a url",
  ])("skips passkey domains for %s", (url) => {
    vi.stubEnv("EAS_BUILD_PROFILE", "development");
    vi.stubEnv("EXPO_PUBLIC_API_URL", url);
    vi.stubEnv("GOOGLE_SERVICES_JSON", undefined);

    expect(appConfig(context(config))).toEqual(brandExpoConfig(config));
  });
});
