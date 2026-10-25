import type { Bot, TicketMention } from "@rakazo/contracts";
import { botHexColor } from "../bot-avatar-colors.js";
import type { Viewer } from "./types.js";

/** A Nurling or user a comment called in, with what the reader knows about them now. */
export type MentionTarget = {
  kind: TicketMention["kind"];
  id: string;
  name: string;
  color?: string;
};

export type MentionSegment =
  | { type: "text"; text: string }
  | { type: "mention"; text: string; target: MentionTarget };

const WORD = "\\p{L}\\p{N}_-";

/** The `#hex` part of a Nurling's color, before `::`; nothing when it is not a hex value. */
export const mentionColor = botHexColor;

/** Mentions the reader can name: a Nurling it still has, or the reader themselves. */
export function resolveMentionTargets(
  mentions: readonly TicketMention[],
  bots: readonly Bot[],
  viewer: Viewer,
): MentionTarget[] {
  return mentions.flatMap((mention): MentionTarget[] => {
    if (mention.kind === "bot") {
      const bot = bots.find((row) => row.id === mention.id);
      return bot ? [{ kind: "bot", id: bot.id, name: bot.name, color: bot.color }] : [];
    }
    return viewer.id && mention.id === viewer.id && viewer.name
      ? [{ kind: "user", id: mention.id, name: viewer.name }]
      : [];
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenPattern(names: string[]): RegExp | null {
  const alternatives = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (alternatives.length === 0) return null;
  return new RegExp(`(^|[^${WORD}])@(${alternatives.join("|")})(?![${WORD}])`, "giu");
}

/** True when the text still has `@name` as a whole token. */
export function hasMentionToken(text: string, name: string): boolean {
  return tokenPattern([name])?.test(text) ?? false;
}

/** The text as plain runs and the `@Name` tokens of the given targets, in order. */
export function splitMentions(body: string, targets: readonly MentionTarget[]): MentionSegment[] {
  const pattern = tokenPattern(targets.map((target) => target.name));
  if (!pattern) return [{ type: "text", text: body }];
  const byName = new Map(targets.map((target) => [target.name.trim().toLowerCase(), target]));
  const segments: MentionSegment[] = [];
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const [whole, lead = "", name = ""] = match;
    const target = byName.get(name.toLowerCase());
    if (!target) continue;
    const start = (match.index ?? 0) + lead.length;
    if (start > cursor) segments.push({ type: "text", text: body.slice(cursor, start) });
    segments.push({ type: "mention", text: whole.slice(lead.length), target });
    cursor = (match.index ?? 0) + whole.length;
  }
  if (cursor < body.length) segments.push({ type: "text", text: body.slice(cursor) });
  return segments;
}

/** The `@query` the caret is in, if the caret follows an `@` that starts a word. */
export function activeMentionToken(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)@([^\s@]*)$/u.exec(before);
  if (!match) return null;
  return { start: before.length - match[2]!.length - 1, query: match[2]! };
}

const MAX_OPTIONS = 8;

/** The Nurlings an `@query` offers: names containing the query, those starting with it first. */
export function mentionOptions<T extends Pick<Bot, "name">>(
  bots: readonly T[],
  query: string,
): T[] {
  const needle = query.toLowerCase();
  return bots
    .filter((bot) => bot.name.toLowerCase().includes(needle))
    .sort(
      (a, b) =>
        Number(b.name.toLowerCase().startsWith(needle)) -
        Number(a.name.toLowerCase().startsWith(needle)),
    )
    .slice(0, MAX_OPTIONS);
}

/** The text and caret after picking `bot` for the `@query` token the caret was in. */
export function applyMention(
  text: string,
  token: { start: number },
  caret: number,
  bot: Pick<Bot, "name">,
): { text: string; caret: number } {
  return {
    text: `${text.slice(0, token.start)}@${bot.name} ${text.slice(caret)}`,
    caret: token.start + bot.name.length + 2,
  };
}
