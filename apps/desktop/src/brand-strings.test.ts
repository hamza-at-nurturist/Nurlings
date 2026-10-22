import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { brand } from "@nurlings/brand";
import { describe, expect, it } from "vitest";
import { DesktopUpdateController } from "./auto-update";
import { aboutPanelOptions, isUpstreamCloudSetup } from "./brand-desktop";

const UPSTREAM_NAME = /(?<![\w{])Rakazo(?!\w)/;
/**
 * Source for scripts injected into the renderer. They are code, not text a person reads, and one
 * carries a developer comment naming the product.
 */
const EMBEDDED_RENDERER_SCRIPTS = ["data-rakazo-app-state"];

/**
 * Every string literal and template text in a TypeScript source, comments excluded. A small
 * scanner instead of the compiler API: it only has to be good enough to guard the user-facing
 * strings, and the sanity test below fails if it ever stops finding them.
 */
function stringLiterals(source: string): string[] {
  const found: string[] = [];
  const length = source.length;
  let i = 0;
  while (i < length) {
    const char = source[i];
    const next = source[i + 1];
    if (char === "/" && next === "/") {
      while (i < length && source[i] !== "\n") i += 1;
    } else if (char === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? length : end + 2;
    } else if (char === '"' || char === "'") {
      let text = "";
      i += 1;
      while (i < length && source[i] !== char) {
        if (source[i] === "\\") i += 1;
        text += source[i] ?? "";
        i += 1;
      }
      found.push(text);
      i += 1;
    } else if (char === "`") {
      let text = "";
      i += 1;
      while (i < length && source[i] !== "`") {
        if (source[i] === "\\") {
          i += 1;
          text += source[i] ?? "";
          i += 1;
        } else if (source[i] === "$" && source[i + 1] === "{") {
          found.push(text);
          text = "";
          let depth = 1;
          const start = i + 2;
          i = start;
          while (i < length && depth > 0) {
            if (source[i] === "{") depth += 1;
            else if (source[i] === "}") depth -= 1;
            i += 1;
          }
          found.push(...stringLiterals(source.slice(start, i - 1)));
        } else {
          text += source[i];
          i += 1;
        }
      }
      found.push(text);
      i += 1;
    } else {
      i += 1;
    }
  }
  return found;
}

describe("the string scanner", () => {
  it("finds literals and template text but not comments", () => {
    const found = stringLiterals(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: the sample source contains a template literal
      '// "in a comment"\nconst a = \'one\'; /* "two" */ const b = `three ${x ? "four" : \'five\'} six`;',
    );
    expect(found).toEqual(["one", "three ", "four", "five", " six"]);
  });
});

describe("desktop sources", () => {
  const sources = readdirSync(import.meta.dirname).filter(
    (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
  );

  it("scans the real sources and finds the strings it guards", () => {
    expect(sources).toContain("main.ts");
    const literals = sources.flatMap((name) =>
      stringLiterals(readFileSync(path.join(import.meta.dirname, name), "utf8")),
    );
    expect(literals).toContain(" services did not start. Check the output below, then retry.");
    expect(literals).toContain("Sign-in callback rejected. Return to ");
    expect(literals.length).toBeGreaterThan(300);
  });

  it("never shows the upstream product name in a string literal", () => {
    const offenders: string[] = [];
    for (const name of sources) {
      const source = readFileSync(path.join(import.meta.dirname, name), "utf8");
      for (const text of stringLiterals(source)) {
        if (EMBEDDED_RENDERER_SCRIPTS.some((marker) => text.includes(marker))) continue;
        if (UPSTREAM_NAME.test(text)) offenders.push(`${name}: ${text}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("isUpstreamCloudSetup", () => {
  const cloud = { mode: "existing" as const, serverUrl: "https://app.rakazo.com" };

  it("recognises a profile that saved the upstream's hosted service, however it was typed", () => {
    expect(isUpstreamCloudSetup(cloud)).toBe(true);
    expect(isUpstreamCloudSetup({ ...cloud, serverUrl: "https://APP.rakazo.com/" })).toBe(true);
    expect(isUpstreamCloudSetup({ ...cloud, serverUrl: "app.rakazo.com" })).toBe(true);
  });

  it("leaves every other saved choice alone", () => {
    expect(isUpstreamCloudSetup(null)).toBe(false);
    expect(isUpstreamCloudSetup({ mode: "new", serverUrl: "http://127.0.0.1:45173" })).toBe(false);
    expect(
      isUpstreamCloudSetup({ mode: "existing", serverUrl: "https://nurlings.example.com" }),
    ).toBe(false);
    expect(
      isUpstreamCloudSetup({ mode: "existing", serverUrl: "https://app.rakazo.com.evil.test" }),
    ).toBe(false);
  });

  it("does not apply once the brand has a hosted service of its own", () => {
    expect(isUpstreamCloudSetup(cloud, { cloud: "https://app.example.test" })).toBe(false);
  });
});

describe("aboutPanelOptions", () => {
  it("shows the name, version and tagline", () => {
    expect(aboutPanelOptions("1.2.3")).toEqual({
      applicationName: brand.name,
      applicationVersion: "1.2.3",
      credits: brand.tagline,
    });
    expect(JSON.stringify(aboutPanelOptions("1.2.3"))).not.toMatch(/rakazo/i);
  });
});

describe("the desktop updater with the brand's default", () => {
  it("is off: it never loads electron-updater and reports no update", async () => {
    expect(brand.updates.desktop).toBe(false);
    let loads = 0;
    const controller = new DesktopUpdateController(
      { packaged: true, version: "1.0.0", disabled: !brand.updates.desktop },
      async () => {
        loads += 1;
        throw new Error("electron-updater must not be loaded");
      },
    );
    expect(controller.state().phase).toBe("unsupported");
    await controller.check(true);
    await controller.download();
    expect(loads).toBe(0);
    expect(controller.state().phase).toBe("unsupported");
    expect(controller.state().message).not.toMatch(/rakazo/i);
  });
});
