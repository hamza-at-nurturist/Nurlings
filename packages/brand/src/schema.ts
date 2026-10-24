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
  /** Prefix new boards number their tickets with: `NUR` gives `NUR-1`. */
  ticketPrefix: string;
  /**
   * The logo mark as SVG path data: a blob and an orb. The UI draws them (the blob in the
   * surrounding text colour, the orb with `colors.orbGradient`), and the checks compare them with
   * the source SVGs in `packages/brand/assets/logo`. `viewBox` frames the whole mark;
   * `smallViewBox` frames the blob alone, for favicons and single-colour icons.
   */
  mark: {
    viewBox: string;
    smallViewBox: string;
    blob: string;
    /** The outer sub-path of `blob` only, with the two eye cut-outs removed. Drawn as an avatar shape. */
    blobBody: string;
    orb: string;
    /** User-space coordinates of the orb gradient, in the mark's own units. */
    orbGradient: { x1: number; y1: number; x2: number; y2: number };
    /** Centre of the left eye cut-out in the mark's coordinate space. */
    eyeLeft: { cx: number; cy: number };
    /** Centre of the right eye cut-out in the mark's coordinate space. */
    eyeRight: { cx: number; cy: number };
    /** Clockwise tilt of the eye long-axis from vertical, in degrees. */
    eyeAngleDeg: number;
    /** Width of an eye pill, and its length including the round caps, in the mark's units. */
    eyeWidth: number;
    eyeLength: number;
  };
  /**
   * The wordmark's typeface (the product name beside the mark, nowhere else in the UI). The font
   * is self-hosted in `packages/brand` so desktop and mobile render it offline; `fallback` is the
   * stack used until it loads or if it fails.
   */
  wordmarkFont: {
    family: string;
    weight: number;
    letterSpacing: string;
    fallback: string;
    /** Font file and the stylesheet that declares it, relative to `packages/brand`. */
    file: string;
    css: string;
  };
  /** Lowercase image prefix; compose defaults must equal it (`brand:check`). */
  registry: string;
  colors: {
    themeLight: string;
    themeDark: string;
    splashLight: string;
    splashDark: string;
    /** The navy plate behind the app icon. */
    iconBackground: string;
    /** The blob, on the navy plate. */
    blob: string;
    /** The orb's gradient stops, first to last. */
    orbGradient: [string, string, string];
  };
  /** Paths relative to `packages/brand`. */
  assets: {
    /** Vector sources: the transparent full mark, the blob alone, the square app icon, the original composition (reference only). */
    markSvg: string;
    markSmallSvg: string;
    iconSvg: string;
    logoSvg: string;
    /** Animated marks used as plain images: plays once then idles, and a loop. */
    introSvg: string;
    loaderSvg: string;
    mark: string;
    wordmark: string;
    /** The wordmark with fixed colours for use outside the app: navy text for light backgrounds, white for dark. */
    wordmarkLight: string;
    wordmarkDark: string;
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
  updates: { desktop: boolean; mobileOta: boolean };
}

export class BrandConfigError extends Error {
  // A plain field, not a constructor parameter property: this file is loaded by plain Node
  // (type stripping) from vite.config.ts, which cannot run parameter properties.
  readonly field: string;

  constructor(field: string, problem: string) {
    super(`Invalid brand config: ${field} ${problem}`);
    this.name = "BrandConfigError";
    this.field = field;
  }
}

type Shape = Record<string, unknown>;

const BUNDLE_ID = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;
// Board prefixes are upper-cased by the API; at most 12 characters, as in the board contract.
const TICKET_PREFIX = /^[A-Z][A-Z0-9]{0,11}$/;
const REGISTRY = /^[a-z0-9][a-z0-9.-]*(?::\d+)?(?:\/[a-z0-9][a-z0-9._-]*)+$/;

const FONT_NAME = /^[A-Za-z][A-Za-z0-9 -]*$/;
const LETTER_SPACING = /^-?\d+(?:\.\d+)?em$/;
// Names, quotes, commas and spaces only: nothing that could break out of a style attribute.
const FONT_STACK = /^[A-Za-z0-9 ,'"-]+$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const VIEW_BOX = /^-?\d+(?:\.\d+)?(?: -?\d+(?:\.\d+)?){3}$/;
// SVG path data only: commands, numbers, separators. Nothing that could break out of an attribute.
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]+$/;

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

function coordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BrandConfigError(field, "must be a number");
  }
  return value;
}

function fontWeight(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 100 || value > 900) {
    throw new BrandConfigError(field, "must be a whole number from 100 to 900");
  }
  return value;
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
    "ticketPrefix",
    "mark",
    "wordmarkFont",
    "registry",
    "colors",
    "assets",
    "updates",
  ]);
  const bot = object(root.bot, "bot", ["singular", "plural"]);
  const company = object(root.company, "company", ["name", "url"]);
  const urls = object(root.urls, "urls", ["site", "cloud", "iosApp", "androidApp", "community"]);
  const native = object(root.native, "native", ["bundleId"]);
  const mark = object(root.mark, "mark", [
    "viewBox",
    "smallViewBox",
    "blob",
    "blobBody",
    "orb",
    "orbGradient",
    "eyeLeft",
    "eyeRight",
    "eyeAngleDeg",
    "eyeWidth",
    "eyeLength",
  ]);
  const font = object(root.wordmarkFont, "wordmarkFont", [
    "family",
    "weight",
    "letterSpacing",
    "fallback",
    "file",
    "css",
  ]);
  const gradient = object(mark.orbGradient, "mark.orbGradient", ["x1", "y1", "x2", "y2"]);
  const colors = object(root.colors, "colors", [
    "themeLight",
    "themeDark",
    "splashLight",
    "splashDark",
    "iconBackground",
    "blob",
    "orbGradient",
  ]);
  const assets = object(root.assets, "assets", [
    "markSvg",
    "markSmallSvg",
    "iconSvg",
    "logoSvg",
    "introSvg",
    "loaderSvg",
    "mark",
    "wordmark",
    "wordmarkLight",
    "wordmarkDark",
    "appIcon",
    "appleIcon",
    "androidAdaptiveForeground",
    "androidAdaptiveBackground",
    "androidMonochrome",
    "androidNotification",
    "splash",
    "favicon",
  ]);
  const updates = object(root.updates, "updates", ["desktop", "mobileOta"]);
  const hex = (key: string) => match(colors[key], `colors.${key}`, HEX_COLOR, "a #RRGGBB colour");
  const gradientStops = (value: unknown): [string, string, string] => {
    if (!Array.isArray(value) || value.length !== 3) {
      throw new BrandConfigError("colors.orbGradient", "must list exactly three #RRGGBB colours");
    }
    const [a, b, c] = value.map((stop, index) =>
      match(stop, `colors.orbGradient[${index}]`, HEX_COLOR, "a #RRGGBB colour"),
    );
    return [a as string, b as string, c as string];
  };
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
    ticketPrefix: match(
      root.ticketPrefix,
      "ticketPrefix",
      TICKET_PREFIX,
      "1 to 12 upper-case letters or digits, starting with a letter, such as NUR",
    ),
    mark: {
      viewBox: match(mark.viewBox, "mark.viewBox", VIEW_BOX, "four numbers such as 0 0 100 100"),
      smallViewBox: match(
        mark.smallViewBox,
        "mark.smallViewBox",
        VIEW_BOX,
        "four numbers such as 0 0 100 100",
      ),
      blob: match(mark.blob, "mark.blob", PATH_DATA, "SVG path data"),
      blobBody: match(mark.blobBody, "mark.blobBody", PATH_DATA, "SVG path data"),
      orb: match(mark.orb, "mark.orb", PATH_DATA, "SVG path data"),
      orbGradient: {
        x1: coordinate(gradient.x1, "mark.orbGradient.x1"),
        y1: coordinate(gradient.y1, "mark.orbGradient.y1"),
        x2: coordinate(gradient.x2, "mark.orbGradient.x2"),
        y2: coordinate(gradient.y2, "mark.orbGradient.y2"),
      },
      eyeLeft: (() => {
        const eye = object(mark.eyeLeft, "mark.eyeLeft", ["cx", "cy"]);
        return {
          cx: coordinate(eye.cx, "mark.eyeLeft.cx"),
          cy: coordinate(eye.cy, "mark.eyeLeft.cy"),
        };
      })(),
      eyeRight: (() => {
        const eye = object(mark.eyeRight, "mark.eyeRight", ["cx", "cy"]);
        return {
          cx: coordinate(eye.cx, "mark.eyeRight.cx"),
          cy: coordinate(eye.cy, "mark.eyeRight.cy"),
        };
      })(),
      eyeAngleDeg: coordinate(mark.eyeAngleDeg, "mark.eyeAngleDeg"),
      eyeWidth: coordinate(mark.eyeWidth, "mark.eyeWidth"),
      eyeLength: coordinate(mark.eyeLength, "mark.eyeLength"),
    },
    wordmarkFont: {
      family: match(font.family, "wordmarkFont.family", FONT_NAME, "a font family name"),
      weight: fontWeight(font.weight, "wordmarkFont.weight"),
      letterSpacing: match(
        font.letterSpacing,
        "wordmarkFont.letterSpacing",
        LETTER_SPACING,
        "an em value such as -0.02em",
      ),
      fallback: match(font.fallback, "wordmarkFont.fallback", FONT_STACK, "a font stack"),
      file: assetPath(font.file, "wordmarkFont.file"),
      css: assetPath(font.css, "wordmarkFont.css"),
    },
    registry: match(
      root.registry,
      "registry",
      REGISTRY,
      "a lowercase image prefix such as ghcr.io/owner/name",
    ),
    colors: {
      themeLight: hex("themeLight"),
      themeDark: hex("themeDark"),
      splashLight: hex("splashLight"),
      splashDark: hex("splashDark"),
      iconBackground: hex("iconBackground"),
      blob: hex("blob"),
      orbGradient: gradientStops(colors.orbGradient),
    },
    assets: {
      markSvg: asset("markSvg"),
      markSmallSvg: asset("markSmallSvg"),
      iconSvg: asset("iconSvg"),
      logoSvg: asset("logoSvg"),
      introSvg: asset("introSvg"),
      loaderSvg: asset("loaderSvg"),
      mark: asset("mark"),
      wordmark: asset("wordmark"),
      wordmarkLight: asset("wordmarkLight"),
      wordmarkDark: asset("wordmarkDark"),
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
    },
  };
}
