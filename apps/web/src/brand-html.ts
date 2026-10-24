import { writeFile } from "node:fs/promises";
import path from "node:path";
import brandData from "@nurlings/brand/brand.json" with { type: "json" };
import { parseBrand } from "@nurlings/brand/schema";
import type { Plugin } from "vite";
import { webManifest } from "./pwa/plugin.js";

/**
 * Brands the document title, home-screen title and web manifest at build and dev time, so
 * `index.html` and the manifest `pwa/plugin.ts` generates stay identical to upstream. A pattern that no longer
 * matches throws instead of silently shipping the upstream name.
 */
type BrandIdentity = Pick<ReturnType<typeof parseBrand>, "name" | "description" | "colors">;

// vite.config.ts loads this file in plain Node, which can only strip types from a module without
// sibling imports, so it reads the validated config from the two self-contained subpaths instead
// of the package entry point. An invalid brand.json therefore stops the build here.
const brand = parseBrand(brandData);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function replaceOnce(html: string, pattern: RegExp, replacement: string, what: string): string {
  if (!pattern.test(html)) {
    throw new Error(
      `Cannot brand index.html: ${what} was not found. Update apps/web/src/brand-html.ts.`,
    );
  }
  return html.replace(pattern, replacement);
}

export function brandIndexHtml(html: string, identity: BrandIdentity = brand): string {
  const name = escapeHtml(identity.name);
  let result = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${name}</title>`, "<title>");
  result = replaceOnce(
    result,
    /(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/,
    `$1${name}$2`,
    "apple-mobile-web-app-title",
  );
  result = replaceOnce(
    result,
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escapeHtml(identity.description)}$2`,
    "meta description",
  );
  return replaceOnce(
    result,
    /(<meta name="theme-color" content=")[^"]*(")/,
    `$1${identity.colors.themeDark}$2`,
    "meta theme-color",
  );
}

export function brandManifest(
  manifest: Record<string, unknown>,
  identity: BrandIdentity = brand,
): Record<string, unknown> {
  return {
    ...manifest,
    name: identity.name,
    short_name: identity.name,
    description: identity.description,
    background_color: identity.colors.themeDark,
    theme_color: identity.colors.themeDark,
  };
}

/**
 * Vite runs `transformIndexHtml` for every HTML page it serves, including the e2e fixture pages,
 * which have no home-screen title to brand. Only the app's own `index.html` is branded.
 */
export function isAppIndexHtml(filename: string, root: string): boolean {
  return path.resolve(filename) === path.resolve(root, "index.html");
}

const MANIFEST = "site.webmanifest";

function brandedManifestText(): string {
  return `${JSON.stringify(brandManifest(webManifest()), null, 2)}\n`;
}

export function brandPlugin(): Plugin {
  let root = "";
  let outDir = "";
  return {
    name: "nurlings-brand-identity",
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: (html, context) =>
      isAppIndexHtml(context.filename, root) ? brandIndexHtml(html) : html,
    // This plugin runs before the PWA plugin, so its dev response wins.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?", 1)[0] !== `/${MANIFEST}`) return next();
        res.setHeader("content-type", "application/manifest+json");
        res.end(brandedManifestText());
      });
    },
    // The PWA plugin emits the manifest while it generates the bundle, so ours overwrites it
    // after the bundle is written.
    async writeBundle() {
      await writeFile(path.join(outDir, MANIFEST), brandedManifestText());
    },
  };
}
