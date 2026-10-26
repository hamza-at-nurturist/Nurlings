import type { Bot } from "@rakazo/contracts";
import { TICKET_TITLE_MAX_LENGTH } from "@rakazo/contracts";
import { hasMentionToken } from "./mentions.js";

export type QuickAddTicket = { title: string; description?: string; assigneeBotId?: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The text without the first `@name` token, its surrounding spaces collapsed. */
function removeMention(text: string, name: string): string {
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_-])@${escapeRegExp(name)}(?![\\p{L}\\p{N}_-])`,
    "iu",
  );
  return text.replace(pattern, "$1").replace(/[ \t]{2,}/g, " ");
}

/**
 * What the quick-add box creates: the first line is the title, the rest the description. The first
 * picked Nurling still named in the text owns it, and its `@Name` leaves the text. Null when there
 * is no title.
 */
export function quickAddTicket(text: string, picked: readonly Bot[]): QuickAddTicket | null {
  const owner = picked.find((bot) => hasMentionToken(text, bot.name));
  const body = owner ? removeMention(text, owner.name) : text;
  const [first = "", ...rest] = body.trim().split("\n");
  const line = first.trim();
  if (!line) return null;
  const cut = line.length > TICKET_TITLE_MAX_LENGTH;
  const title = cut ? line.slice(0, TICKET_TITLE_MAX_LENGTH).trimEnd() : line;
  // A title cut short keeps its whole first line in the description.
  const description = (cut ? body.trim() : rest.join("\n")).trim();
  return {
    title,
    ...(description ? { description } : {}),
    ...(owner ? { assigneeBotId: owner.id } : {}),
  };
}
