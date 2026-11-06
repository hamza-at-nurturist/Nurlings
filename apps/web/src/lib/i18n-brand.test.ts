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
      // Ids stay as upstream wrote them (some are the English text); what people see is the values.
      expect(JSON.stringify(Object.values(i18n.messages)), locale).not.toContain("Rakazo");
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
        "["About ",["kb"]," KB of memory no longer reaches the bot."]",
        "["All bots"]",
        "["Allow cross-space bot communication"]",
        "["Bot email addresses"]",
        "["Bot is watching, not acting"]",
        "["Bot screen preview"]",
        "["Bot screen"]",
        "["Bot style"]",
        "["Bot templates"]",
        "["Bot"]",
        "["Bot"]",
        "["Bot's model"]",
        "["Bots and browser automation"]",
        "["Bots use the accounts of whoever messages them"]",
        "["Bots with their own computer and browser"]",
        "["Bots with their own model"]",
        "["Cancel new bot"]",
        "["Chat with your bot from Slack."]",
        "["Chat with your bots from other apps."]",
        "["Choose a bot shape, color, or upload an image"]",
        "["Close bot templates"]",
        "["Computers are available. Reload or open a bot to continue."]",
        "["Connect a model in Settings before running bots."]",
        "["Could not create bot"]",
        "["Could not create the bot"]",
        "["Could not create your bot"]",
        "["Could not delete bot"]",
        "["Could not load bots. Reload to try again."]",
        "["Could not open the bot"]",
        "["Could not update bot access"]",
        "["Couldn't update bot style"]",
        "["Create bot"]",
        "["Customize bot avatar"]",
        "["Docker limits access to your computer for added security. Using ",["hostLabel"]," lets bots work with your local files and tools."]",
        "["Every bot in this space reads these notes and keeps them up to date."]",
        "["Everyone here sees its chats, bots and memory"]",
        "["Everyone in this bot's space can read the chats it gets from ",["linkApp"],"."]",
        "["Files your bots create, like reports, docs and images, collect here."]",
        "["Filter bots"]",
        "["Filter by bot"]",
        "["Go to bot"]",
        "["How other bots see it"]",
        "["In this bot"]",
        "["Its bots and groups are kept and leave the section."]",
        "["Its conversation, files, and routines will be permanently deleted. Bots it created stay in your list."]",
        "["Let bots use this computer"]",
        "["Lets bots save and recall facts by meaning, alongside MEMORY.md."]",
        "["Local access lets bots run commands without asking. Avoid it on shared or public servers."]",
        "["Logins and keys your bots can use."]",
        "["Made by bots"]",
        "["Manage other bots"]",
        "["Minimize bots"]",
        "["Name this bot"]",
        "["Name your Bot"]",
        "["New bot"]",
        "["Next or previous bot"]",
        "["No bots match"]",
        "["No bots"]",
        "["Pages this bot builds for you appear here. Ask for a dashboard, tracker or plan to make one."]",
        "["Private workspace with its own bots and groups."]",
        "["Remove ",["secretName"],"? Bots will no longer be able to use it."]",
        "["Resize bots sidebar"]",
        "["Runs when this bot receives a verified message from this provider."]",
        "["Search bots"]",
        "["Search bots, actions, and settings"]",
        "["Select a bot"]",
        "["Show bots"]",
        "["Skills join the library all your bots share."]",
        "["The bot can use the file but won't see the picture."]",
        "["The bot's browser stays signed in for everyone in this space"]",
        "["The computer your bots work on."]",
        "["This bot runs on this computer, not a Linux desktop. Shell and files use your home folder."]",
        "["This bot"]",
        "["This server cannot be assigned without a bot."]",
        "["Use in this bot"]",
        "["What this bot is for"]",
        "["What your bots remember between chats."]",
        "["When bots check with you before acting."]",
        "["Where should bots run?"]",
        "["Where your bots pay from."]",
        "["Which LLMs your bots use."]",
        "["bot"]",
        "[["botCount","plural",{"one":["Delete ",["name"]," and its ","#"," bot?"],"other":["Delete ",["name"]," and its ","#"," bots?"]}]]",
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
        "pl",
        "pt-BR",
        "ru",
        "tr",
        "zh-CN",
        "zh-TW",
      ]
    `);
  });
});
