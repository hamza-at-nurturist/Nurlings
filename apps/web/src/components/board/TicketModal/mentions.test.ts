import type { Bot } from "@rakazo/contracts";
import { expect, it } from "vitest";
import {
  activeMentionToken,
  hasMentionToken,
  mentionColor,
  resolveMentionTargets,
  splitMentions,
} from "./mentions";

const bots = [
  { id: "bot-1", name: "Chief", color: "#7C3AED::shape_8" },
  { id: "bot-2", name: "Scout Two", color: "#22c55e" },
  { id: "bot-3", name: "Scout", color: "blue" },
] as unknown as Bot[];
const viewer = { id: "user-1", name: "Ada" };

it("takes the hex before :: as the chip color and nothing else", () => {
  expect(mentionColor("#7C3AED::shape_8")).toBe("#7C3AED");
  expect(mentionColor("#abc")).toBe("#abc");
  expect(mentionColor("#22c55e")).toBe("#22c55e");
  expect(mentionColor("blue")).toBeUndefined();
  expect(mentionColor("data:image/png;base64,AAAA")).toBeUndefined();
  expect(mentionColor("#12345")).toBeUndefined();
  expect(mentionColor("")).toBeUndefined();
  expect(mentionColor(undefined)).toBeUndefined();
});

it("names a mention by the Nurling or user the reader knows now, and drops the rest", () => {
  const targets = resolveMentionTargets(
    [
      { kind: "bot", id: "bot-1" },
      { kind: "bot", id: "gone" },
      { kind: "user", id: "user-1" },
      { kind: "user", id: "someone-else" },
    ],
    bots,
    viewer,
  );
  expect(targets).toEqual([
    { kind: "bot", id: "bot-1", name: "Chief", color: "#7C3AED::shape_8" },
    { kind: "user", id: "user-1", name: "Ada" },
  ]);
});

it("splits a comment into text and one chip per @Name, keeping line breaks and order", () => {
  const targets = resolveMentionTargets(
    [
      { kind: "bot", id: "bot-1" },
      { kind: "user", id: "user-1" },
    ],
    bots,
    viewer,
  );
  const segments = splitMentions("Hi @chief,\nplease ask @Ada. @Chiefly no", targets);
  expect(segments.map((s) => (s.type === "text" ? s.text : `[${s.target.name}]`))).toEqual([
    "Hi ",
    "[Chief]",
    ",\nplease ask ",
    "[Ada]",
    ". @Chiefly no",
  ]);
});

it("matches the longest name and only whole tokens", () => {
  const targets = resolveMentionTargets(
    [
      { kind: "bot", id: "bot-2" },
      { kind: "bot", id: "bot-3" },
    ],
    bots,
    viewer,
  );
  const segments = splitMentions("@Scout Two and @Scout, not me@Scout or @Scouts", targets);
  expect(
    segments.filter((s) => s.type === "mention").map((s) => s.type === "mention" && s.target.id),
  ).toEqual(["bot-2", "bot-3"]);
  expect(hasMentionToken("hello @Scout Two!", "Scout Two")).toBe(true);
  expect(hasMentionToken("hello @Scouts", "Scout")).toBe(false);
  expect(hasMentionToken("a@Scout", "Scout")).toBe(false);
});

it("treats regex characters in a name literally", () => {
  const segments = splitMentions("ping @A.(b)+ now", [{ kind: "bot", id: "x", name: "A.(b)+" }]);
  expect(segments.map((s) => s.type)).toEqual(["text", "mention", "text"]);
  expect(splitMentions("plain", [])).toEqual([{ type: "text", text: "plain" }]);
});

it("finds the @ the caret is in, only at the start of a word", () => {
  expect(activeMentionToken("@", 1)).toEqual({ start: 0, query: "" });
  expect(activeMentionToken("hi @sc", 6)).toEqual({ start: 3, query: "sc" });
  expect(activeMentionToken("hi @sc there", 6)).toEqual({ start: 3, query: "sc" });
  expect(activeMentionToken("hi @sc there", 12)).toBeNull();
  expect(activeMentionToken("mail me@sc", 10)).toBeNull();
  expect(activeMentionToken("line\n@x", 7)).toEqual({ start: 5, query: "x" });
  expect(activeMentionToken("@a @b", 5)).toEqual({ start: 3, query: "b" });
});
