import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { brand } from "@nurlings/brand";
import { describe, expect, it } from "vitest";
import { brandIndexHtml, brandManifest, brandPlugin, isAppIndexHtml } from "./brand-html";

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

describe("brandIndexHtml", () => {
  const upstream = read("../index.html");

  it("starts from upstream's markup, which still names the upstream product", () => {
    expect(upstream).toContain("<title>Rakazo</title>");
  });

  it("brands the title, home-screen title, description and theme colour", () => {
    const html = brandIndexHtml(upstream);
    expect(html).toContain(`<title>${brand.name}</title>`);
    expect(html).toContain(`name="apple-mobile-web-app-title" content="${brand.name}"`);
    expect(html).toContain(`name="description" content="${brand.description}"`);
    expect(html).toContain(`name="theme-color" content="${brand.colors.themeDark}"`);
    expect(html).not.toMatch(/rakazo/i);
  });

  it("leaves the rest of the document untouched", () => {
    const html = brandIndexHtml(upstream);
    expect(html).toContain('<script src="/theme.js"></script>');
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest" />');
  });

  it("escapes markup characters in the name", () => {
    const html = brandIndexHtml(upstream, {
      ...brand,
      name: 'A&B "Co" <x>',
    });
    expect(html).toContain("<title>A&amp;B &quot;Co&quot; &lt;x&gt;</title>");
  });

  it("fails loudly when upstream changes the markup it relies on", () => {
    expect(() => brandIndexHtml("<html><head></head></html>")).toThrow(/<title> was not found/);
    expect(() => brandIndexHtml("<title>x</title>")).toThrow(/apple-mobile-web-app-title/);
  });
});

describe("isAppIndexHtml", () => {
  it("is true only for the app's own index.html", () => {
    expect(isAppIndexHtml("/repo/apps/web/index.html", "/repo/apps/web")).toBe(true);
    expect(isAppIndexHtml("/repo/apps/web/e2e/fixtures/chart-links.html", "/repo/apps/web")).toBe(
      false,
    );
    expect(isAppIndexHtml("/repo/apps/web/public/index.html", "/repo/apps/web")).toBe(false);
  });
});

describe("brandPlugin", () => {
  function resolved() {
    const plugin = brandPlugin();
    (plugin.configResolved as (config: unknown) => void)({
      root: "/repo/apps/web",
      publicDir: "/repo/apps/web/public",
      build: { outDir: "dist" },
    });
    return plugin.transformIndexHtml as (html: string, context: { filename: string }) => string;
  }

  it("brands the app's index.html", () => {
    const html = read("../index.html");
    const out = resolved()(html, { filename: "/repo/apps/web/index.html" });
    expect(out).toContain(`<title>${brand.name}</title>`);
  });

  it("leaves fixture pages without a home-screen title alone instead of throwing", () => {
    const fixture = "<!doctype html><html><head><title>Chart fixture</title></head></html>";
    expect(resolved()(fixture, { filename: "/repo/apps/web/e2e/fixtures/chart-links.html" })).toBe(
      fixture,
    );
  });
});

describe("brandManifest", () => {
  const upstream = JSON.parse(read("../public/site.webmanifest")) as Record<string, unknown>;

  it("brands the names, description and colours and keeps the rest", () => {
    const manifest = brandManifest(upstream);
    expect(manifest).toMatchObject({
      name: brand.name,
      short_name: brand.name,
      description: brand.description,
      background_color: brand.colors.themeDark,
      theme_color: brand.colors.themeDark,
      start_url: "/",
      display: "standalone",
    });
    expect(manifest.icons).toEqual(upstream.icons);
    expect(JSON.stringify(manifest)).not.toMatch(/rakazo/i);
  });
});
