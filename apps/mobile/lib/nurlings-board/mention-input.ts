import type { Bot } from "@rakazo/contracts";
import {
  activeMentionToken,
  applyMention,
  hasMentionToken,
  mentionOptions,
} from "@rakazo/core/nurlings-board";

/** What a text box that offers Nurlings after an `@` holds. Pure, so both composers share it. */
export type MentionInputState = { text: string; caret: number; picked: Bot[] };

export const emptyMentionInput: MentionInputState = { text: "", caret: 0, picked: [] };

export function typeText(state: MentionInputState, text: string): MentionInputState {
  // The selection event that follows corrects this; until then the caret moves with the edit.
  const caret = state.caret + text.length - state.text.length;
  return { ...state, text, caret: Math.max(0, Math.min(caret, text.length)) };
}

export function moveCaret(state: MentionInputState, caret: number): MentionInputState {
  return { ...state, caret };
}

/** The Nurlings the `@query` at the caret offers, none when the picker is not open. */
export function pickerOptions(state: MentionInputState, bots: readonly Bot[]): Bot[] {
  const token = activeMentionToken(state.text, state.caret);
  return token ? mentionOptions(bots, token.query) : [];
}

/** Puts `@Name` in place of the query and remembers the Nurling. */
export function pickBot(state: MentionInputState, bot: Bot): MentionInputState {
  const token = activeMentionToken(state.text, state.caret);
  if (!token) return state;
  const next = applyMention(state.text, token, state.caret, bot);
  return {
    text: next.text,
    caret: next.caret,
    picked: state.picked.some((row) => row.id === bot.id) ? state.picked : [...state.picked, bot],
  };
}

/** Only the Nurlings still named in the text count; a deleted `@Name` drops its pick. */
export function mentionedBots(state: MentionInputState): Bot[] {
  return state.picked.filter((bot) => hasMentionToken(state.text, bot.name));
}
