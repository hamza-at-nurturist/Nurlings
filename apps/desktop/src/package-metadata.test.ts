import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { brand } from "@nurlings/brand";
import { describe, expect, it } from "vitest";

const desktopRoot = path.resolve(import.meta.dirname, "..");
const raw = readFileSync(path.join(desktopRoot, "package.json"), "utf8");
const packageJson = JSON.parse(raw) as {
  productName?: string;
  author?: { name?: string };
  build?: {
    productName?: string;
    appId?: string;
    publish?: unknown;
    extraMetadata?: { name?: string };
    mac?: { icon?: string; extendInfo?: Record<string, string> };
    win?: { icon?: string };
    linux?: { executableName?: string; icon?: string };
  };
};

describe("desktop package metadata", () => {
  it("shares the customer-facing name between Electron and electron-builder", () => {
    expect(packageJson.productName).toBe(brand.name);
    expect(packageJson.build?.productName).toBeUndefined();
  });

  it("publishes as the brand's company", () => {
    expect(packageJson.author?.name).toBe(brand.company.name);
  });

  it("keeps the application id, Linux executable and package name unchanged", () => {
    expect(packageJson.build?.appId).toBe("dev.rakazo.desktop");
    expect(packageJson.build?.linux?.executableName).toBe("rakazo");
    expect(packageJson.build?.extraMetadata?.name).toBe("rakazo");
  });

  it("names the product in the microphone prompt", () => {
    const prompt = packageJson.build?.mac?.extendInfo?.NSMicrophoneUsageDescription;
    expect(prompt).toBe(
      `${brand.name} uses the microphone for dictation and voice calls with your ${brand.bot.plural}.`,
    );
  });

  it("uses the brand's icons, all of which exist", () => {
    const icons = [
      packageJson.build?.mac?.icon,
      packageJson.build?.win?.icon,
      packageJson.build?.linux?.icon,
    ];
    expect(packageJson.build?.mac?.icon).toBe(`../../packages/brand/${brand.assets.appleIcon}`);
    for (const icon of icons) {
      expect(existsSync(path.join(desktopRoot, String(icon))), String(icon)).toBe(true);
    }
  });

  it("carries no update feed, so a packaged app cannot be pointed at the upstream's releases", () => {
    expect(packageJson.build).not.toHaveProperty("publish");
    expect(raw).not.toContain("elie222");
    expect(raw).not.toMatch(/"repo":\s*"rakazo"/);
  });
});
