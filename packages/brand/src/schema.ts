export interface Brand {
  /** Product name shown everywhere a person reads it. */
  name: string;
  /** One agent is "a Nurling", several are "Nurlings". */
  bot: { singular: string; plural: string };
  tagline: string;
  description: string;
  company: { name: string; url: string };
  urls: {
    site: string;
    /** `null` hides the entry: there is no hosted service, store listing or community link. */
    cloud: string | null;
    iosApp: string | null;
    androidApp: string | null;
    community: string | null;
  };
  /** iOS bundle identifier and Android package share one value. */
  native: { bundleId: string };
  /**
   * Lowercase image prefix; compose defaults must equal it (`brand:check`). Holds the
   * `REGISTRY_PLACEHOLDER` until the repository's organization is known.
   */
  registry: string;
  colors: {
    themeLight: string;
    themeDark: string;
    splashLight: string;
    splashDark: string;
    iconBackground: string;
  };
  /** Paths relative to `packages/brand`. */
  assets: {
    mark: string;
    wordmark: string;
    appIcon: string;
    appleIcon: string;
    androidAdaptiveForeground: string;
    androidAdaptiveBackground: string;
    androidMonochrome: string;
    androidNotification: string;
    splash: string;
    favicon: string;
  };
  /** Every updater that could replace our build with an upstream one stays off. */
  updates: { desktop: boolean; mobileOta: boolean; serverSelfUpdate: boolean };
}

export class BrandConfigError extends Error {
  constructor(
    readonly field: string,
    problem: string,
  ) {
    super(`Invalid brand config: ${field} ${problem}`);
    this.name = "BrandConfigError";
  }
}

type Shape = Record<string, unknown>;

const BUNDLE_ID = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;
const REGISTRY = /^[a-z0-9][a-z0-9.-]*(?::\d+)?(?:\/[a-z0-9][a-z0-9._-]*)+$/;

/**
 * Stands in for the GitHub organization until the repository moves. It is the only uppercase value
 * the validator accepts, so it cannot be mistaken for a real image path; `brand:check --release`
 * fails while it is present.
 */
export const REGISTRY_PLACEHOLDER = "ghcr.io/REPLACE_WITH_ORG/nurlings";

export function registryIsPlaceholder(registry: string): boolean {
  return registry === REGISTRY_PLACEHOLDER;
}
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function object(value: unknown, field: string, keys: readonly string[]): Shape {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BrandConfigError(field, "must be an object");
  }
  // Top-level problems read `name`, nested ones `urls.site`.
  const at = (key: string) => (field === "brand" ? key : `${field}.${key}`);
  const record = value as Shape;
  for (const key of Object.keys(record)) {
    if (!keys.includes(key)) throw new BrandConfigError(at(key), "is not a known field");
  }
  for (const key of keys) {
    if (!(key in record)) throw new BrandConfigError(at(key), "is required");
  }
  return record;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "" || value !== value.trim()) {
    throw new BrandConfigError(field, "must be a non-empty string without surrounding spaces");
  }
  return value;
}

function httpsUrl(value: unknown, field: string): string {
  const raw = text(value, field);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BrandConfigError(field, "must be a valid URL");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new BrandConfigError(field, "must be an https URL without credentials");
  }
  return raw;
}

function optionalUrl(value: unknown, field: string): string | null {
  return value === null ? null : httpsUrl(value, field);
}

function match(value: unknown, field: string, pattern: RegExp, expected: string): string {
  const raw = text(value, field);
  if (!pattern.test(raw)) throw new BrandConfigError(field, `must be ${expected}`);
  return raw;
}

function assetPath(value: unknown, field: string): string {
  const raw = text(value, field);
  if (raw.startsWith("/") || raw.split("/").includes("..") || raw.includes("\\")) {
    throw new BrandConfigError(field, "must be a relative path inside packages/brand");
  }
  return raw;
}

function flag(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new BrandConfigError(field, "must be true or false");
  return value;
}

/** Validates a parsed `brand.json`. Unknown fields are rejected so a typo cannot silently drop a value. */
export function parseBrand(input: unknown): Brand {
  const root = object(input, "brand", [
    "name",
    "bot",
    "tagline",
    "description",
    "company",
    "urls",
    "native",
    "registry",
    "colors",
    "assets",
    "updates",
  ]);
  const bot = object(root.bot, "bot", ["singular", "plural"]);
  const company = object(root.company, "company", ["name", "url"]);
  const urls = object(root.urls, "urls", ["site", "cloud", "iosApp", "androidApp", "community"]);
  const native = object(root.native, "native", ["bundleId"]);
  const colors = object(root.colors, "colors", [
    "themeLight",
    "themeDark",
    "splashLight",
    "splashDark",
    "iconBackground",
  ]);
  const assets = object(root.assets, "assets", [
    "mark",
    "wordmark",
    "appIcon",
    "appleIcon",
    "androidAdaptiveForeground",
    "androidAdaptiveBackground",
    "androidMonochrome",
    "androidNotification",
    "splash",
    "favicon",
  ]);
  const updates = object(root.updates, "updates", ["desktop", "mobileOta", "serverSelfUpdate"]);
  const hex = (key: string) => match(colors[key], `colors.${key}`, HEX_COLOR, "a #RRGGBB colour");
  const asset = (key: string) => assetPath(assets[key], `assets.${key}`);
  return {
    name: text(root.name, "name"),
    bot: {
      singular: text(bot.singular, "bot.singular"),
      plural: text(bot.plural, "bot.plural"),
    },
    tagline: text(root.tagline, "tagline"),
    description: text(root.description, "description"),
    company: {
      name: text(company.name, "company.name"),
      url: httpsUrl(company.url, "company.url"),
    },
    urls: {
      site: httpsUrl(urls.site, "urls.site"),
      cloud: optionalUrl(urls.cloud, "urls.cloud"),
      iosApp: optionalUrl(urls.iosApp, "urls.iosApp"),
      androidApp: optionalUrl(urls.androidApp, "urls.androidApp"),
      community: optionalUrl(urls.community, "urls.community"),
    },
    native: {
      bundleId: match(
        native.bundleId,
        "native.bundleId",
        BUNDLE_ID,
        "a lowercase reverse-DNS identifier such as com.example.app",
      ),
    },
    registry:
      root.registry === REGISTRY_PLACEHOLDER
        ? REGISTRY_PLACEHOLDER
        : match(
            root.registry,
            "registry",
            REGISTRY,
            `a lowercase image prefix such as ghcr.io/owner/name (or ${REGISTRY_PLACEHOLDER})`,
          ),
    colors: {
      themeLight: hex("themeLight"),
      themeDark: hex("themeDark"),
      splashLight: hex("splashLight"),
      splashDark: hex("splashDark"),
      iconBackground: hex("iconBackground"),
    },
    assets: {
      mark: asset("mark"),
      wordmark: asset("wordmark"),
      appIcon: asset("appIcon"),
      appleIcon: asset("appleIcon"),
      androidAdaptiveForeground: asset("androidAdaptiveForeground"),
      androidAdaptiveBackground: asset("androidAdaptiveBackground"),
      androidMonochrome: asset("androidMonochrome"),
      androidNotification: asset("androidNotification"),
      splash: asset("splash"),
      favicon: asset("favicon"),
    },
    updates: {
      desktop: flag(updates.desktop, "updates.desktop"),
      mobileOta: flag(updates.mobileOta, "updates.mobileOta"),
      serverSelfUpdate: flag(updates.serverSelfUpdate, "updates.serverSelfUpdate"),
    },
  };
}
