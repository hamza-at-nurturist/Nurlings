import type { Bot } from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import {
  emptyMentionInput,
  mentionedBots,
  moveCaret,
  pickBot,
  pickerOptions,
  typeText,
} from "./mention-input";

const bots = [
  { id: "b1", name: "Scout", color: "#22C55E" },
  { id: "b2", name: "Chief", color: "#8B5CF6" },
] as Bot[];

function type(text: string) {
  return moveCaret(typeText(emptyMentionInput, text), text.length);
}

describe("mention input", () => {
  it("opens the picker after an @ and narrows as you type", () => {
    expect(pickerOptions(type("hello @"), bots).map((bot) => bot.name)).toEqual(["Scout", "Chief"]);
    expect(pickerOptions(type("hello @sc"), bots).map((bot) => bot.name)).toEqual(["Scout"]);
    expect(pickerOptions(type("hello"), bots)).toEqual([]);
    expect(pickerOptions(type("mail me@sc"), bots)).toEqual([]);
  });

  it("replaces the query with the name, moves the caret past it and remembers the pick", () => {
    const state = pickBot(type("ask @sc"), bots[0]!);
    expect(state.text).toBe("ask @Scout ");
    expect(state.caret).toBe(state.text.length);
    expect(state.picked.map((bot) => bot.id)).toEqual(["b1"]);
    expect(pickBot(state, bots[0]!)).toEqual(state);
  });

  it("counts a pick only while its @Name is still in the text", () => {
    const state = pickBot(type("ask @sc"), bots[0]!);
    expect(mentionedBots(state).map((bot) => bot.id)).toEqual(["b1"]);
    expect(mentionedBots(typeText(state, "ask Scout"))).toEqual([]);
  });

  it("keeps the caret with an edit in the middle until the selection event arrives", () => {
    const state = moveCaret(typeText(emptyMentionInput, "ab"), 1);
    expect(typeText(state, "aXb").caret).toBe(2);
  });
});
