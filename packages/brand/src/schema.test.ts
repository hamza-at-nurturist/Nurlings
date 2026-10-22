import { describe, expect, it } from "vitest";
import data from "../brand.json" with { type: "json" };
import {
  BrandConfigError,
  brand,
  parseBrand,
  REGISTRY_PLACEHOLDER,
  registryIsPlaceholder,
} from "./index.js";

function withChange(change: (draft: Record<string, any>) => void) {
  const draft = structuredClone(data) as Record<string, any>;
  change(draft);
  return draft;
}

function problem(input: unknown): string {
  try {
    parseBrand(input);
  } catch (error) {
    if (error instanceof BrandConfigError) return error.message;
    throw error;
  }
  throw new Error("expected parseBrand to throw");
}

describe("brand.json", () => {
  it("is valid and carries the agreed values", () => {
    expect(brand.name).toBe("Nurlings");
    expect(brand.bot).toEqual({ singular: "Nurling", plural: "Nurlings" });
    expect(brand.tagline).toBe("Powered by Nurturist AI");
    expect(brand.company).toEqual({ name: "Nurturist AI", url: "https://nurturistai.com" });
    expect(brand.urls.site).toBe("https://nurlings.nurturistai.com");
    expect(brand.native.bundleId).toBe("com.nurturistai.nurlings");
    expect(brand.registry).toBe(REGISTRY_PLACEHOLDER);
  });

  it("offers no hosted cloud, store, or community link until one exists", () => {
    expect(brand.urls.cloud).toBeNull();
    expect(brand.urls.iosApp).toBeNull();
    expect(brand.urls.androidApp).toBeNull();
    expect(brand.urls.community).toBeNull();
  });

  it("keeps every updater off", () => {
    expect(brand.updates).toEqual({ desktop: false, mobileOta: false, serverSelfUpdate: false });
  });

  it("keeps today's colours so nothing shifts visually", () => {
    expect(brand.colors).toEqual({
      themeLight: "#FCFCFC",
      themeDark: "#141414",
      splashLight: "#FCFCFC",
      splashDark: "#141414",
      iconBackground: "#141414",
    });
  });

  it("never contains the upstream name", () => {
    expect(JSON.stringify(brand).toLowerCase()).not.toContain("rakazo");
  });
});

describe("parseBrand", () => {
  it("holds the registry placeholder until the organization is known", () => {
    expect(REGISTRY_PLACEHOLDER).toBe("ghcr.io/REPLACE_WITH_ORG/nurlings");
    expect(registryIsPlaceholder(brand.registry)).toBe(true);
  });

  it("accepts a real lowercase registry and stops reporting a placeholder", () => {
    const parsed = parseBrand(withChange((d) => (d.registry = "ghcr.io/nurturist-ai/nurlings")));
    expect(parsed.registry).toBe("ghcr.io/nurturist-ai/nurlings");
    expect(registryIsPlaceholder(parsed.registry)).toBe(false);
  });

  it.each([
    "ghcr.io/REPLACE_WITH_ORG/Nurlings",
    "ghcr.io/replace_with_org/nurlings/",
    "GHCR.io/REPLACE_WITH_ORG/nurlings",
    "ghcr.io/Some-Org/nurlings",
  ])("rejects %s: only the exact placeholder may be uppercase", (registry) => {
    expect(problem(withChange((d) => (d.registry = registry)))).toContain(
      "Invalid brand config: registry",
    );
  });

  it("accepts a configured optional URL", () => {
    const parsed = parseBrand(withChange((d) => (d.urls.community = "https://example.com/chat")));
    expect(parsed.urls.community).toBe("https://example.com/chat");
  });

  it.each([
    ["a missing field", (d: Record<string, any>) => delete d.name, "name"],
    ["an unknown field", (d: Record<string, any>) => (d.nmae = "x"), "nmae"],
    [
      "an unknown nested field",
      (d: Record<string, any>) => (d.urls.discord = null),
      "urls.discord",
    ],
    ["an empty name", (d: Record<string, any>) => (d.name = " "), "name"],
    ["padded text", (d: Record<string, any>) => (d.tagline = " Powered "), "tagline"],
    ["an http site URL", (d: Record<string, any>) => (d.urls.site = "http://x.test"), "urls.site"],
    [
      "a URL with credentials",
      (d: Record<string, any>) => (d.company.url = "https://u:p@x.test"),
      "company.url",
    ],
    [
      "a malformed optional URL",
      (d: Record<string, any>) => (d.urls.cloud = "not a url"),
      "urls.cloud",
    ],
    [
      "an undefined optional URL",
      (d: Record<string, any>) => (d.urls.iosApp = undefined),
      "urls.iosApp",
    ],
    [
      "an uppercase registry",
      (d: Record<string, any>) => (d.registry = "ghcr.io/Owner/Nurlings"),
      "registry",
    ],
    ["a registry without a path", (d: Record<string, any>) => (d.registry = "ghcr.io"), "registry"],
    [
      "a bundle id without a domain",
      (d: Record<string, any>) => (d.native.bundleId = "nurlings"),
      "native.bundleId",
    ],
    [
      "an uppercase bundle id",
      (d: Record<string, any>) => (d.native.bundleId = "com.Nurlings.app"),
      "native.bundleId",
    ],
    [
      "a short colour",
      (d: Record<string, any>) => (d.colors.themeDark = "#111"),
      "colors.themeDark",
    ],
    [
      "an absolute asset path",
      (d: Record<string, any>) => (d.assets.mark = "/etc/passwd"),
      "assets.mark",
    ],
    [
      "an asset path that escapes",
      (d: Record<string, any>) => (d.assets.splash = "../x.png"),
      "assets.splash",
    ],
    [
      "a non-boolean flag",
      (d: Record<string, any>) => (d.updates.desktop = "no"),
      "updates.desktop",
    ],
  ])("rejects %s and names the field", (_label, change, field) => {
    const message = problem(withChange(change));
    expect(message).toContain(`Invalid brand config: ${field}`);
  });

  it("rejects a non-object", () => {
    expect(problem(null)).toContain("brand must be an object");
    expect(problem([])).toContain("brand must be an object");
  });
});
