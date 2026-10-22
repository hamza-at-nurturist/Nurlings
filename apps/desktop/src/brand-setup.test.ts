import { readFileSync } from "node:fs";
import path from "node:path";
import { brand } from "@nurlings/brand";
import { describe, expect, it } from "vitest";
import { brandSetupHtml, brandSetupScript } from "./brand-setup";

const read = (file: string) => readFileSync(path.resolve(import.meta.dirname, file), "utf8");
const html = read("setup.html");
const script = read("setup.js");

describe("brandSetupHtml", () => {
  it("starts from upstream's markup, which names the upstream product and its hosted cloud", () => {
    expect(html).toContain("Welcome to Rakazo");
    expect(html).toContain('id="mode-cloud"');
  });

  const branded = brandSetupHtml(html);

  it("names the product in the title, title bar, quit button and heading", () => {
    expect(branded).toContain(`<title>Set up ${brand.name}</title>`);
    expect(branded).toContain(`<span class="titlebar-name">${brand.name}</span>`);
    expect(branded).toContain(`title="Quit ${brand.name}"`);
    expect(branded).toContain(`Welcome to ${brand.name}</h1>`);
    expect(branded).not.toMatch(/rakazo/i);
  });

  it("brands the example server address shown in the input", () => {
    expect(branded).toContain(`placeholder="https://${brand.name.toLowerCase()}.example.com"`);
  });

  it("offers no hosted cloud while the brand has none, and defaults to this computer", () => {
    expect(branded).not.toContain("mode-cloud");
    expect(branded).not.toContain("Cloud");
    expect(branded).toContain(
      '<input id="mode-new" type="radio" name="mode" value="new" checked />',
    );
    expect(branded.match(/type="radio"/g)).toHaveLength(2);
    expect(branded.match(/ checked/g)).toHaveLength(1);
  });

  it("keeps the rest of the window intact", () => {
    for (const id of ["setup", "quit", "panel-new", "panel-existing", "server-url", "continue"]) {
      expect(branded, id).toContain(`id="${id}"`);
    }
    expect(branded).toContain('<script src="setup.js"></script>');
    expect(branded).toContain("script-src 'self'");
  });

  it("keeps a hosted-cloud choice, branded, when the brand configures one", () => {
    const withCloud = brandSetupHtml(html, {
      name: brand.name,
      urls: { ...brand.urls, cloud: "https://app.example.test" },
    });
    expect(withCloud).toContain(`${brand.name} Cloud`);
    expect(withCloud).toContain('id="mode-cloud"');
    expect(withCloud).toMatch(/id="mode-cloud"[^>]* checked/);
    expect(withCloud).not.toMatch(/rakazo/i);
  });

  it("fails loudly when upstream changes the markup it relies on", () => {
    expect(() => brandSetupHtml("<html></html>")).toThrow(/hosted-cloud choice was not found/);
    const withoutNew = html.replace('id="mode-new"', 'id="mode-fresh"');
    expect(() => brandSetupHtml(withoutNew)).toThrow(/'This computer' choice was not found/);
  });
});

describe("brandSetupScript", () => {
  it("starts from upstream's script, which names the upstream product", () => {
    expect(script).toContain("Starting Rakazo");
  });

  it("brands every visible string and nothing that is code", () => {
    const branded = brandSetupScript(script);
    expect(branded).toContain(`Starting ${brand.name}…`);
    expect(branded).toContain(`Downloading ${brand.name}…`);
    expect(branded).toContain(`${brand.name} is ready.`);
    expect(branded).toContain(`${brand.name} answered at`);
    expect(branded).toContain(`Quit ${brand.name} and try again.`);
    expect(branded).not.toContain("Rakazo");
    // Everything else, including identifiers, is byte-identical.
    expect(branded.replaceAll(brand.name, "Rakazo")).toBe(script);
  });

  it("does not rewrite the word bot or other prose rules", () => {
    expect(brandSetupScript("const bot = 1; // a bot")).toBe("const bot = 1; // a bot");
  });
});
