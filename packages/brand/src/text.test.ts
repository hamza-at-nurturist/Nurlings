import { describe, expect, it } from "vitest";
import type { CompiledMessage } from "./index.js";
import { brand, brandMessage, brandMessages, brandProduct, brandText } from "./index.js";

const t = (input: string) => brandText(input, brand);

describe("brandText: the product name", () => {
  it.each([
    ["Sign in to Rakazo", "Sign in to Nurlings"],
    ["Create your Rakazo", "Create your Nurlings"],
    ["Return to Rakazo", "Return to Nurlings"],
    ["Bei Rakazo anmelden", "Bei Nurlings anmelden"],
    [
      "Diese URL sieht nicht nach einem Rakazo-Server aus",
      "Diese URL sieht nicht nach einem Nurlings-Server aus",
    ],
    ["חזרה ל-Rakazo", "חזרה ל-Nurlings"],
    ["Rakazo adds /v1 if needed.", "Nurlings adds /v1 if needed."],
  ])("%s", (input, expected) => {
    expect(t(input)).toBe(expected);
  });

  it("keeps possessives grammatical for a name ending in s", () => {
    expect(t("Rakazo's inbox")).toBe("Nurlings' inbox");
    expect(t("Rakazo’s inbox")).toBe("Nurlings’ inbox");
  });

  it("adds an s to a possessive for a name that does not end in s", () => {
    const acme = { name: "Acme", bot: { singular: "Helper", plural: "Helpers" } };
    expect(brandText("Rakazo's inbox", acme)).toBe("Acme's inbox");
  });

  it("leaves identifiers and look-alikes alone", () => {
    expect(t("rakazo-shared and IDs")).toBe("rakazo-shared and IDs");
    expect(t("RAKAZO_IMAGE_TAG")).toBe("RAKAZO_IMAGE_TAG");
    expect(t("@rakazo/web")).toBe("@rakazo/web");
    expect(t("Rakazoo")).toBe("Rakazoo");
    expect(t("xRakazo")).toBe("xRakazo");
    expect(t("RakazoDesktop")).toBe("RakazoDesktop");
    expect(t("Rakazos")).toBe("Rakazos");
  });

  it("returns text without the name or bot words untouched", () => {
    const text = "Nothing to see here";
    expect(t(text)).toBe(text);
  });
});

describe("brandText: the agent noun", () => {
  it.each([
    ["No bots match", "No Nurlings match"],
    ["Could not delete bot", "Could not delete Nurling"],
    ["Bot to link", "Nurling to link"],
    ["Choose a bot…", "Choose a Nurling…"],
    ["Filter bots", "Filter Nurlings"],
    ["Ask the bot.", "Ask the Nurling."],
    ["Your bot's memory", "Your Nurling's memory"],
    ["<0>bots</0> are ready", "<0>Nurlings</0> are ready"],
    ["Alle Bots anzeigen", "Alle Nurlings anzeigen"],
  ])("%s", (input, expected) => {
    expect(t(input)).toBe(expected);
  });

  it.each([
    "bot-123",
    "IDs starting with bot- are reserved",
    "botId",
    "bot_id",
    "robot",
    "chatbot",
    "bottom",
    "/bots/list",
    "bots.json",
    "a:bot",
    "bot/avatar",
    "{bot}",
    "{bot, plural, one {x} other {y}}",
  ])("does not rewrite %s", (input) => {
    expect(t(input)).toBe(input);
  });

  it("rewrites the words inside a plural but not its variable", () => {
    expect(t("{count, plural, one {# bot} other {# bots}}")).toBe(
      "{count, plural, one {# Nurling} other {# Nurlings}}",
    );
  });

  it("rewrites both nouns in one sentence", () => {
    expect(t("rakazo-shared and IDs starting with bot- are reserved for Rakazo.")).toBe(
      "rakazo-shared and IDs starting with bot- are reserved for Nurlings.",
    );
  });
});

describe("brandMessage / brandMessages on compiled catalogs", () => {
  it("rewrites literal parts and keeps placeholder names", () => {
    const message: CompiledMessage = ["Hi ", ["name"], ", welcome to Rakazo"];
    expect(brandMessage(message, brand)).toEqual(["Hi ", ["name"], ", welcome to Nurlings"]);
  });

  it("does not rewrite a variable that happens to be named like a word", () => {
    const message: CompiledMessage = ["Delete ", ["bot"], " now?"];
    expect(brandMessage(message, brand)).toEqual(["Delete ", ["bot"], " now?"]);
  });

  it("rewrites branch text but never the plural keys or the variable", () => {
    const message: CompiledMessage = [
      ["count", "plural", { "=0": "No bots", one: "# bot", other: "# bots" }],
    ];
    expect(brandMessage(message, brand)).toEqual([
      ["count", "plural", { "=0": "No Nurlings", one: "# Nurling", other: "# Nurlings" }],
    ]);
  });

  it("leaves the numeric offset of a compiled plural alone", () => {
    const message: CompiledMessage = [
      ["count", "plural", { offset: 0, one: "# bot", other: "# bots" }],
    ];
    expect(brandMessage(message, brand)).toEqual([
      ["count", "plural", { offset: 0, one: "# Nurling", other: "# Nurlings" }],
    ]);
  });

  it("handles select with nested placeholders", () => {
    const message: CompiledMessage = [
      ["kind", "select", { bot: ["Open ", ["name"], " in Rakazo"], other: "Open Rakazo" }],
    ];
    expect(brandMessage(message, brand)).toEqual([
      ["kind", "select", { bot: ["Open ", ["name"], " in Nurlings"], other: "Open Nurlings" }],
    ]);
  });

  it("passes formatted tokens through", () => {
    const message: CompiledMessage = ["On ", ["when", "date", "short"], " Rakazo ran"];
    expect(brandMessage(message, brand)).toEqual([
      "On ",
      ["when", "date", "short"],
      " Nurlings ran",
    ]);
  });

  it("keeps catalog ids as keys and only rewrites values", () => {
    const catalog = { "Sign in to Rakazo": "Bei Rakazo anmelden", plain: ["x"] as CompiledMessage };
    const result = brandMessages(catalog, brand);
    expect(Object.keys(result)).toEqual(["Sign in to Rakazo", "plain"]);
    expect(result["Sign in to Rakazo"]).toBe("Bei Nurlings anmelden");
  });

  it("does not mutate its input", () => {
    const original: CompiledMessage = ["Rakazo ", ["x"]];
    const copy = structuredClone(original);
    brandMessage(original, brand);
    expect(original).toEqual(copy);
  });
});

describe("brandProduct (the name rule alone)", () => {
  it("rewrites the product name and nothing else", () => {
    expect(brandProduct("Welcome to Rakazo. Quit Rakazo's setup.", brand)).toBe(
      "Welcome to Nurlings. Quit Nurlings' setup.",
    );
  });

  it("leaves the word bot alone, in any case, so it is safe on source code", () => {
    const code = 'const bot = Bot.create("bots"); // Bot, bots';
    expect(brandProduct(code, brand)).toBe(code);
    expect(brandProduct("Rakazo bot", brand)).toBe("Nurlings bot");
  });

  it("does not touch identifiers", () => {
    expect(brandProduct("rakazo-shared RAKAZO_X RakazoDesktop", brand)).toBe(
      "rakazo-shared RAKAZO_X RakazoDesktop",
    );
  });
});
