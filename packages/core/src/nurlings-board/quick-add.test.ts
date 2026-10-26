import type { Bot } from "@rakazo/contracts";
import { TICKET_TITLE_MAX_LENGTH } from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import { quickAddTicket } from "./quick-add.js";

const scout = { id: "bot-scout", name: "Scout" } as Bot;
const dialer = { id: "bot-dialer", name: "Dialer" } as Bot;

describe("quickAddTicket", () => {
  it("makes one line the title, with no description and no owner", () => {
    expect(quickAddTicket("  Weekly cash flow summary  ", [])).toEqual({
      title: "Weekly cash flow summary",
    });
  });
  it("puts the lines after the first in the description", () => {
    expect(quickAddTicket("Comp report\nUse the last 6 months\n\nTwo flips max", [])).toEqual({
      title: "Comp report",
      description: "Use the last 6 months\n\nTwo flips max",
    });
  });
  it("gives the ticket to the first picked Nurling still named, and takes its @Name out", () => {
    expect(quickAddTicket("@Scout skip trace 12 owners and ask @Dialer", [scout, dialer])).toEqual({
      title: "skip trace 12 owners and ask @Dialer",
      assigneeBotId: "bot-scout",
    });
    expect(quickAddTicket("Skip trace @Scout today", [scout])).toEqual({
      title: "Skip trace today",
      assigneeBotId: "bot-scout",
    });
  });
  it("ignores a pick whose @Name was deleted", () => {
    expect(quickAddTicket("Skip trace for @Dialer", [scout, dialer])).toEqual({
      title: "Skip trace for",
      assigneeBotId: "bot-dialer",
    });
    expect(quickAddTicket("Skip trace", [scout])).toEqual({ title: "Skip trace" });
  });
  it("cuts a long first line and keeps all of it in the description", () => {
    const line = "a".repeat(TICKET_TITLE_MAX_LENGTH + 20);
    expect(quickAddTicket(`${line}\nmore`, [])).toEqual({
      title: "a".repeat(TICKET_TITLE_MAX_LENGTH),
      description: `${line}\nmore`,
    });
  });
  it("creates nothing without a title", () => {
    expect(quickAddTicket("   \n  ", [])).toBeNull();
    expect(quickAddTicket("@Scout", [scout])).toBeNull();
  });
});
