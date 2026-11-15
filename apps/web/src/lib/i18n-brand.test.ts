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
  const config = getConfig({
    cwd: path.join(webRoot, "../.."),
    configPath: path.join(webRoot, "../../lingui.config.ts"),
  });
  const found = getCatalogForFile(
    `packages/i18n/locales/${locale}/messages.po`,
    await getCatalogs(config),
  );
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
        "["1 bot has its own model:"]",
        "["1 bot now uses the space default."]",
        "["A ",["times"],"× more powerful computer for your bot"]",
        "["A kanban board of tickets your bots can work on"]",
        "["About ",["kb"]," KB of memory no longer reaches the bot."]",
        "["All bots"]",
        "["Allow cross-space bot communication"]",
        "["Allow microphone access to call a bot."]",
        "["Ask this Bot in chat to set up a routine."]",
        "["Bot actions"]",
        "["Bot email addresses"]",
        "["Bot is watching, not acting"]",
        "["Bot models"]",
        "["Bot screen preview"]",
        "["Bot screen"]",
        "["Bot style"]",
        "["Bot templates"]",
        "["Bot"]",
        "["Bot"]",
        "["Bot's model"]",
        "["Bots and browser automation"]",
        "["Bots and their own chats stay."]",
        "["Bots can use each imported login until you change its Bots setting."]",
        "["Bots use the accounts of whoever messages them"]",
        "["Bots with their own computer and browser"]",
        "["Bots with their own computer"]",
        "["Bots with their own model"]",
        "["Bots"]",
        "["Cancel new bot"]",
        "["Chat with your bot from Slack."]",
        "["Chat with your bots from other apps."]",
        "["Choose a bot shape, color, or upload an image"]",
        "["Chosen bots"]",
        "["Chosen bots"]",
        "["Close bot templates"]",
        "["Computers are available. Reload or open a bot to continue."]",
        "["Connect a model in Settings before running bots."]",
        "["Conversations, names, memories, searches and bot and Space IDs are sent to store and recall context."]",
        "["Could not archive bot"]",
        "["Could not create bot"]",
        "["Could not create the bot"]",
        "["Could not create your bot"]",
        "["Could not delete bot"]",
        "["Could not load bot"]",
        "["Could not load bots"]",
        "["Could not load bots. Reload to try again."]",
        "["Could not load bots. Reload to try again."]",
        "["Could not open the bot"]",
        "["Could not restore bot"]",
        "["Could not save bot"]",
        "["Could not update bot access"]",
        "["Couldn't update bot style"]",
        "["Create bot"]",
        "["Customize bot avatar"]",
        "["Delete ",["name"]," and its ",["count"]," bots?"]",
        "["Delete ",["name"]," and its bot?"]",
        "["Deleted bot"]",
        "["Docker limits access to your computer for added security. Using ",["hostLabel"]," lets bots work with your local files and tools."]",
        "["Every bot in this space reads these notes and keeps them up to date."]",
        "["Everyone here sees its chats, bots and memory"]",
        "["Everyone in this bot's space can read the chats it gets from ",["app"],"."]",
        "["Everyone in this bot's space can read the chats it gets from ",["linkApp"],"."]",
        "["Files your bots create, like reports, docs and images, collect here."]",
        "["Filter bots"]",
        "["Filter by bot"]",
        "["Get notified when this Bot finishes or needs input"]",
        "["Go to bot"]",
        "["Grok Bot"]",
        "["Groups left with fewer than two bots are deleted too, including their messages, files, and pages."]",
        "["Hello ",["name"],", ",["bot"]," here."]",
        "["Hello, ",["bot"]," here."]",
        "["How other bots see it"]",
        "["In this bot"]",
        "["Its bots and groups are kept and leave the section."]",
        "["Its conversation, files, and routines will be permanently deleted. Bots it created stay in your list."]",
        "["Let bots use this computer"]",
        "["Local access lets bots run commands without asking. Avoid it on shared or public servers."]",
        "["Logins and keys your bots can use."]",
        "["Made by bots"]",
        "["Manage other bots"]",
        "["Messages, chat history, bot instructions, memories, attachments, screenshots and connected-app content are sent to run your bots, including routines."]",
        "["Minimize bots"]",
        "["Name this bot"]",
        "["Name your Bot"]",
        "["New bot"]",
        "["Next or previous bot"]",
        "["No bots match"]",
        "["No bots"]",
        "["No bots"]",
        "["No matching bots"]",
        "["Only the bot's creator can see its webhook key."]",
        "["Only the bot's creator can set its webhook key."]",
        "["Pages this bot builds for you appear here. Ask for a dashboard, tracker or plan to make one."]",
        "["Pages this bot builds for you appear here."]",
        "["Private workspace with its own bots and groups."]",
        "["Put your bots to work"]",
        "["Remove ",["secretName"],"? Bots will no longer be able to use it."]",
        "["Resize bots sidebar"]",
        "["Runs when this bot receives a verified message from this provider."]",
        "["Same as ",["bot"]]",
        "["Saved, but this server can't block bots yet."]",
        "["Saved, but this server can't limit an item to chosen bots."]",
        "["Search bots"]",
        "["Search bots, actions, and settings"]",
        "["Select a bot"]",
        "["Show bots"]",
        "["Skills join the library all your bots share."]",
        "["Switch ",["count"]," bots to the space default?"]",
        "["Switch 1 bot to the space default?"]",
        "["Tap + to create a bot"]",
        "["That isn't a Grok Bot export. Paste the Bot's whole reply."]",
        "["The bot can use the file but won't see the picture."]",
        "["The bot couldn't finish its reply. Technical details includes the reported error."]",
        "["The bot couldn't reply because its provider's daily limit was reached."]",
        "["The bot couldn't reply because its provider's monthly limit was reached."]",
        "["The bot couldn't reply because its provider's usage limit was reached."]",
        "["The bot couldn't reply because its provider's weekly limit was reached."]",
        "["The bot's browser stays signed in for everyone in this space"]",
        "["The computer your bots work on."]",
        "["The provider couldn't serve the model selected for this bot."]",
        "["The provider received too many requests to answer this bot."]",
        "["The provider refused the key this bot used for its reply."]",
        "["The reply looks cut off. Ask the Bot for the rest, then paste both."]",
        "["Their own model is cleared. You can pick one again in each bot."]",
        "["This Space keeps its own vault, so its bots can't use account items."]",
        "["This bot can't use this item. Change it in the Vault, or dismiss the request."]",
        "["This bot runs on this computer, not a Linux desktop. Shell and files use your home folder."]",
        "["This bot"]",
        "["This bot's reply stopped at its key's daily limit. Your own key has its own limits."]",
        "["This bot's reply stopped at its key's monthly limit. Your own key has its own limits."]",
        "["This bot's reply stopped at its key's usage limit. Your own key has its own limits."]",
        "["This bot's reply stopped at its key's weekly limit. Your own key has its own limits."]",
        "["This item is blocked for bots. Allow it in the Vault, or dismiss the request."]",
        "["This limits only this Space's bots. Your other Spaces choose for their own."]",
        "["This permanently deletes your account, bots, conversations, memories, files, and saved connections. This cannot be undone."]",
        "["This removes every message and stops current work. The bot, computer, memory, and routines are kept."]",
        "["This server cannot be assigned without a bot."]",
        "["Use in this bot"]",
        "["Used ",["when"]," by ",["bot"]]",
        "["Waiting for this bot’s response."]",
        "["What this bot is for"]",
        "["What your bots remember between chats."]",
        "["When bots check with you before acting."]",
        "["Where should bots run?"]",
        "["Where your bots pay from."]",
        "["Which Bot?"]",
        "["Which LLMs your bots use."]",
        "["bot"]",
        "[["bot"]," here. Hi ",["name"],"."]",
        "[["bot"]," here."]",
        "[["botCount","plural",{"one":["Delete ",["name"]," and its ","#"," bot?"],"other":["Delete ",["name"]," and its ","#"," bots?"]}]]",
        "[["count"]," bots have their own model:"]",
        "[["count"]," bots now use the space default."]",
        "[["memoryGb"]," GB of RAM and ",["usage"],"× the computer time of ",["0"],". Time counts only while your bot uses its computer."]",
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
        "es",
        "fr",
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
