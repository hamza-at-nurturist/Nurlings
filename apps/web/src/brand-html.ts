import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import brandData from "@nurlings/brand/brand.json" with { type: "json" };
import { parseBrand } from "@nurlings/brand/schema";
import type { Plugin } from "vite";

/**
 * Brands the document title, home-screen title and web manifest at build and dev time, so
 * `index.html` and `public/site.webmanifest` stay identical to upstream. A pattern that no longer
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

const MANIFEST = "site.webmanifest";

async function brandedManifestText(file: string): Promise<string> {
  const manifest = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
  return `${JSON.stringify(brandManifest(manifest), null, 2)}\n`;
}

export function brandPlugin(): Plugin {
  let publicDir = "";
  let outDir = "";
  return {
    name: "nurlings-brand-identity",
    configResolved(config) {
      publicDir = config.publicDir;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: (html) => brandIndexHtml(html),
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!publicDir || req.url?.split("?", 1)[0] !== `/${MANIFEST}`) return next();
        try {
          res.setHeader("content-type", "application/manifest+json");
          res.end(await brandedManifestText(path.join(publicDir, MANIFEST)));
        } catch (error) {
          next(error);
        }
      });
    },
    // Vite copies `public/` before it writes the bundle, so the manifest is already in `outDir`.
    async writeBundle() {
      if (!publicDir) return;
      await writeFile(
        path.join(outDir, MANIFEST),
        await brandedManifestText(path.join(publicDir, MANIFEST)),
      );
    },
  };
}
