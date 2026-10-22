import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brand } from "@nurlings/brand";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({ getLocales: vi.fn(() => [{ languageTag: "en-US" }]) }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock("./ui-direction", () => ({ applyMobileUiDirection: vi.fn() }));

import { activateUiLocale, t } from "./i18n";
import { DE_MESSAGES } from "./locales/de";
import { NL_MESSAGES } from "./locales/nl";
import { RU_MESSAGES } from "./locales/ru";
import { ZH_MESSAGES } from "./locales/zh";
import type { UiLocale } from "./ui-locale";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(here, "..");

const maps: Record<string, Record<string, string>> = {
  de: DE_MESSAGES,
  nl: NL_MESSAGES,
  ru: RU_MESSAGES,
  "zh-CN": ZH_MESSAGES,
};

/** Every literal `t("…")` message in the app, the way a user could reach it. */
function sourceMessages(): string[] {
  const messages = new Set<string>();
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "locales") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        for (const match of readFileSync(path, "utf8").matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
          messages.add(JSON.parse(`"${match[1]}"`) as string);
        }
      }
    }
  };
  for (const dir of ["app", "lib", "components"]) visit(join(mobileRoot, dir));
  return [...messages];
}

beforeEach(() => activateUiLocale("en"));

describe("mobile catalog seam", () => {
  it("rebrands the product name in every translated message, in every locale", () => {
    let checked = 0;
    for (const [locale, map] of Object.entries(maps)) {
      activateUiLocale(locale as UiLocale);
      for (const key of Object.keys(map)) {
        expect(t(key), `${locale}: ${key}`).not.toContain("Rakazo");
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("rebrands untranslated English source messages too (the fallback path)", () => {
    const messages = sourceMessages();
    expect(messages.length).toBeGreaterThan(500);
    for (const locale of ["en", "de", "nl", "ru", "zh-CN"] as const) {
      activateUiLocale(locale);
      for (const message of messages) {
        expect(t(message), `${locale}: ${message}`).not.toContain("Rakazo");
      }
    }
  });

  it("shows the configured name on the sign-in screens", () => {
    expect(t("Sign in to Rakazo")).toBe(`Sign in to ${brand.name}`);
    expect(t("Sign up for Rakazo")).toBe(`Sign up for ${brand.name}`);
    expect(t("That URL did not look like a Rakazo server")).toBe(
      `That URL did not look like a ${brand.name} server`,
    );
    activateUiLocale("de");
    expect(t("Sign in to Rakazo")).toBe(`Bei ${brand.name} anmelden`);
  });

  it("uses the agent noun for English copy that says bot", () => {
    expect(t("No bots match")).toBe("No Nurlings match");
    expect(t("Delete bot")).toBe("Delete Nurling");
  });

  it("rewrites the template before filling placeholders, so values are left alone", () => {
    expect(t("Open {name}", { name: "Rakazo bot" })).toBe("Open Rakazo bot");
  });

  it("does not touch identifiers inside messages", () => {
    expect(t("IDs starting with bot- are reserved")).toBe("IDs starting with bot- are reserved");
  });
});
