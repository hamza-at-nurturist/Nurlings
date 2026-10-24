// Expo evaluates app.config.ts with its own loader, which cannot follow the brand package's entry
// point (sibling `.js` specifiers), so the helper composes the self-contained subpaths instead.
import brandData from "@nurlings/brand/brand.json" with { type: "json" };
import { parseBrand } from "@nurlings/brand/schema";
import { brandText } from "@nurlings/brand/text";
import type { ExpoConfig } from "expo/config";

const brand = parseBrand(brandData);

/** `<owner>`/`<projectId>` placeholders in app.json must be replaced before a release build. */
const PLACEHOLDER = /REPLACE_WITH_[A-Z_]+/;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** Permission prompts (`…Permission`, `…UsageDescription`) are text the system shows a person. */
const PROMPT_KEY = /(Permission|Description)$/;

function brandPrompts(value: Json, key = ""): Json {
  if (typeof value === "string") {
    return PROMPT_KEY.test(key) ? brandText(value, brand) : value;
  }
  if (Array.isArray(value)) return value.map((item) => brandPrompts(item, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, brandPrompts(item, name)]),
    );
  }
  return value;
}

/** Width the splash image is shown at, in points: the mark fills most of the image. */
export const SPLASH_IMAGE_WIDTH = 240;

/** Splash colours come from the brand; the splash image itself is `assets/splash-icon.png`. */
function brandSplash(plugin: Json): Json {
  if (!Array.isArray(plugin) || plugin[0] !== "expo-splash-screen") return plugin;
  const options = (plugin[1] ?? {}) as { dark?: Record<string, Json> } & Record<string, Json>;
  return [
    "expo-splash-screen",
    {
      ...options,
      imageWidth: SPLASH_IMAGE_WIDTH,
      backgroundColor: brand.colors.splashLight,
      dark: { ...options.dark, backgroundColor: brand.colors.splashDark },
    },
  ];
}

/**
 * Overlays the brand onto upstream's `app.json` so that file stays identical to upstream: display
 * name, permission prompts, splash colours, the iOS icon bundle, the bundle id / package, and no
 * over-the-air updates. The URL scheme is deliberately not touched.
 */
export function brandExpoConfig(config: ExpoConfig): ExpoConfig {
  const result: ExpoConfig = {
    ...config,
    name: brand.name,
    ios: {
      ...config.ios,
      bundleIdentifier: brand.native.bundleId,
      icon: `../../packages/brand/${brand.assets.appleIcon}`,
      infoPlist: brandPrompts((config.ios?.infoPlist ?? {}) as Json) as Record<string, Json>,
    },
    android: { ...config.android, package: brand.native.bundleId },
    plugins: (brandPrompts((config.plugins ?? []) as Json) as Json[]).map(brandSplash) as never,
  };
  if (!brand.updates.mobileOta) {
    // No update URL and updates switched off: a build can never be replaced by an upstream one.
    const { url: _upstreamUrl, ...updates } = config.updates ?? {};
    result.updates = { ...updates, enabled: false };
  }
  return result;
}

/** Release builds must not carry upstream's Expo account or an unfilled placeholder. */
export function placeholderProblems(config: ExpoConfig): string[] {
  const projectId = (config.extra?.eas as { projectId?: string } | undefined)?.projectId;
  const fields: Array<[string, string | undefined]> = [
    ["owner", config.owner],
    ["extra.eas.projectId", projectId],
  ];
  return fields
    .filter(([, value]) => typeof value === "string" && PLACEHOLDER.test(value))
    .map(([field, value]) => `${field} is still the placeholder ${value}`);
}
