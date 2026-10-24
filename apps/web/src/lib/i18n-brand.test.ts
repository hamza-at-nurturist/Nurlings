import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCompiledCatalog, getCatalogForFile, getCatalogs } from "@lingui/cli/api";
import { getConfig } from "@lingui/conf";
import { brand, brandMessages, brandText } from "@nurlings/brand";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { activateUiLocale, i18n, setCatalogLoadersForTests } from "./i18n";
import { UI_LOCALES } from "./ui-locale";

vi.mock("./apply-ui-direction", () => ({ applyUiDirection: vi.fn() }));

type Compiled = Record<string, unknown>;

const webRoot = fileURLToPath(new URL("../..", import.meta.url));

/** Compiles a locale's real .po the way the Lingui Vite plugin does at build time. */
async function compileLocale(locale: string): Promise<Compiled> {
  const config = getConfig({ cwd: webRoot, configPath: path.join(webRoot, "lingui.config.ts") });
  const found = getCatalogForFile(`src/locales/${locale}/messages.po`, await getCatalogs(config));
  if (!found) throw new Error(`No catalog for ${locale}`);
  const { messages } = await found.catalog.getTranslations(locale, {
    fallbackLocales: config.fallbackLocales,
    sourceLocale: config.sourceLocale,
  });
  const { source } = createCompiledCatalog(locale, messages, { namespace: "es" });
  return new Function(source.replace(/export const messages\s*=/, "return "))() as Compiled;
}

const compiled: Record<string, Compiled> = {};

beforeAll(async () => {
  for (const locale of UI_LOCALES) compiled[locale] = await compileLocale(locale);
}, 120_000);

beforeEach(() => {
  setCatalogLoadersForTests(
    Object.fromEntries(
      UI_LOCALES.map((locale) => [locale, async () => ({ messages: compiled[locale] as never })]),
    ) as never,
  );
  i18n.load("en", {});
  i18n.activate("en");
});

describe("web catalog seam", () => {
  it("compiles every supported locale (the upstream catalogs still say Rakazo)", () => {
    expect(UI_LOCALES.length).toBeGreaterThanOrEqual(12);
    for (const locale of UI_LOCALES) {
      expect(Object.keys(compiled[locale] ?? {}).length, locale).toBeGreaterThan(1000);
    }
    expect(JSON.stringify(compiled.en)).toContain("Rakazo");
  });

  it("leaves no message in any locale containing the upstream name once loaded", async () => {
    for (const locale of UI_LOCALES) {
      await activateUiLocale(locale);
      expect(i18n.locale).toBe(locale);
      expect(JSON.stringify(i18n.messages), locale).not.toContain("Rakazo");
    }
  });

  it("shows the configured name where the upstream catalog had it", async () => {
    await activateUiLocale("en");
    const shown = Object.values(i18n.messages);
    expect(shown).toContainEqual(["Sign in to Nurlings"]);
    expect(shown).toContainEqual(["Create your Nurlings"]);
    expect(shown).toContainEqual(["Return to Nurlings"]);
  });

  it("rewrites exactly the messages the product name or the bot rule touches, nowhere else", () => {
    const before = compiled.en as Record<string, unknown>;
    const after = brandMessages(before as never, brand) as Record<string, unknown>;
    expect(Object.keys(after)).toEqual(Object.keys(before));
    const changed = Object.keys(before).filter(
      (id) => JSON.stringify(before[id]) !== JSON.stringify(after[id]),
    );
    for (const id of changed) {
      expect(JSON.stringify(before[id]), id).toMatch(/Rakazo|[Bb]ots?\b/);
    }
    expect(changed.length).toBeGreaterThan(40);
  });

  it("keeps the English source catalog files identical to upstream", () => {
    // The .po files are never edited: they are read, not written, by the seam.
    expect(JSON.stringify(compiled.en)).toContain("Sign in to Rakazo");
  });
});

describe("the bot → Nurling rule on the real English catalog", () => {
  it("fires on these messages and no others (reviewed)", () => {
    const before = compiled.en as Record<string, unknown>;
    const fired = Object.values(before)
      .filter((message) => {
        const text = JSON.stringify(message);
        // Keep the name as-is so only the bot rule can change the text.
        return brandText(text, { name: "Rakazo", bot: brand.bot }) !== text;
      })
      .map((message) => JSON.stringify(message))
      .sort();
    expect(fired).toMatchInlineSnapshot(`
      [
        "["All bots"]",
        "["Allow cross-space bot communication"]",
        "["Available to this bot's shell commands as ",["commandVariable"]]",
        "["Bot models"]",
        "["Bot screen preview"]",
        "["Bot screen"]",
        "["Bot to link"]",
        "["Bot"]",
        "["Bot"]",
        "["Bot's model"]",
        "["Bots and browser automation"]",
        "["Bots with their own computer and browser"]",
        "["Bots"]",
        "["Can edit and organise bots it creates"]",
        "["Choose a bot shape, color, or upload an image"]",
        "["Choose a bot…"]",
        "["Computers are available. Reload or open a bot to continue."]",
        "["Could not create bot"]",
        "["Could not create your bot"]",
        "["Could not delete bot"]",
        "["Could not load bots. Reload to try again."]",
        "["Create new Bot"]",
        "["Customize bot avatar"]",
        "["Docker limits access to your computer for added security. Using ",["hostLabel"]," lets bots work with your local files and tools."]",
        "["Filter bots"]",
        "["How other bots see it"]",
        "["Its bots and groups are kept and leave the section."]",
        "["Its conversation, files, and routines will be permanently deleted. Bots it created stay in your list."]",
        "["Local access lets bots run commands without asking. Avoid it on shared or public servers."]",
        "["Manage the bots it creates"]",
        "["Minimize bots"]",
        "["Name your Bot"]",
        "["No bots match"]",
        "["No bots"]",
        "["Only empty spaces can be deleted. Delete its bots and groups first."]",
        "["Private workspace with its own bots and groups."]",
        "["Remove ",["secretName"],"? This bot will no longer be able to use it."]",
        "["Resize bots sidebar"]",
        "["Runs when this bot receives a verified message from this provider."]",
        "["Search bots and switch conversations"]",
        "["Select a bot"]",
        "["Shared chat with ",["GROUP_MEMBER_MIN"],"-",["GROUP_MEMBER_MAX"]," bots. They all reply in the same thread."]",
        "["Show bots"]",
        "["Switch bot"]",
        "["Their own model is cleared. You can pick one again in each bot."]",
        "["This bot runs on this computer, not a Linux desktop. Shell and files use your home folder."]",
        "["This server cannot be assigned without a bot."]",
        "["What this bot is for"]",
        "["Where should bots run?"]",
        "["bot"]",
        "[["0","plural",{"one":["#"," bot has its own model:"],"other":["#"," bots have their own model:"]}]]",
        "[["0","plural",{"one":["Switch ","#"," bot to the space default?"],"other":["Switch ","#"," bots to the space default?"]}]]",
        "[["moved","plural",{"one":["#"," bot now uses the space default."],"other":["#"," bots now use the space default."]}]]",
        "[["remaining"]," left · bot is watching, not acting"]",
      ]
    `);
  });
});

describe("locales that keep their own word for a bot", () => {
  it("lists them (recorded; their name rebranding still applies)", () => {
    const en = compiled.en as Record<string, unknown>;
    const ids = Object.keys(en).filter((id) => {
      const text = JSON.stringify(en[id]);
      return brandText(text, { name: "Rakazo", bot: brand.bot }) !== text;
    });
    const keeping: Record<string, number> = {};
    for (const locale of UI_LOCALES) {
      if (locale === "en") continue;
      const catalog = compiled[locale] as Record<string, unknown>;
      const count = ids.filter((id) => {
        const after = JSON.stringify(brandMessages({ [id]: catalog[id] } as never, brand));
        return !/Nurling/.test(after);
      }).length;
      if (count > 0) keeping[locale] = count;
    }
    expect(Object.keys(keeping).sort()).toMatchInlineSnapshot(`
      [
        "de",
        "he",
        "hi",
        "ja",
        "ko",
        "nl",
        "pt-BR",
        "ru",
        "tr",
        "zh-CN",
      ]
    `);
  });
});
