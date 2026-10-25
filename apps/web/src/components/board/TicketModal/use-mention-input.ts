import type { Bot } from "@rakazo/contracts";
import type { ChangeEvent, KeyboardEvent, SyntheticEvent } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { activeMentionToken, hasMentionToken } from "./mentions";

const MAX_OPTIONS = 8;

/**
 * A text box that offers the space's Nurlings after an `@`: the text, the picker's options and
 * highlight, and the Nurlings picked so far. The reply box and the board's quick-add share it.
 */
export function useMentionInput(bots: Bot[]) {
  const box = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const [picked, setPicked] = useState<Bot[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  // The `@` position the user closed the picker at, so it stays closed until they type another.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  // Where the caret goes after a pick. It is placed as soon as the new text is committed, before
  // the next keystroke can land at the end of the controlled value.
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const at = pendingCaret.current;
    if (at === null) return;
    pendingCaret.current = null;
    box.current?.focus();
    box.current?.setSelectionRange(at, at);
  });

  const token = activeMentionToken(text, caret);
  const options = useMemo(() => {
    if (!token || token.start === dismissedAt) return [];
    const query = token.query.toLowerCase();
    return bots
      .filter((bot) => bot.name.toLowerCase().includes(query))
      .sort(
        (a, b) =>
          Number(b.name.toLowerCase().startsWith(query)) -
          Number(a.name.toLowerCase().startsWith(query)),
      )
      .slice(0, MAX_OPTIONS);
  }, [token, dismissedAt, bots]);
  const open = options.length > 0;
  const active = Math.min(highlighted, Math.max(options.length - 1, 0));

  function pick(bot: Bot) {
    if (!token) return;
    const next = `${text.slice(0, token.start)}@${bot.name} ${text.slice(caret)}`;
    const at = token.start + bot.name.length + 2;
    setText(next);
    setCaret(at);
    setHighlighted(0);
    setPicked((current) =>
      current.some((row) => row.id === bot.id) ? current : [...current, bot],
    );
    pendingCaret.current = at;
  }

  /** Arrow, Enter, Tab and Escape while the picker is open. True when the key was used. */
  function pickerKey(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!open || event.nativeEvent.isComposing) return false;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((active + step + options.length) % options.length);
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const bot = options[active];
      if (bot) pick(bot);
      return true;
    }
    if (event.key === "Escape") {
      // Close the picker, not whatever surrounds the box.
      event.preventDefault();
      event.stopPropagation();
      setDismissedAt(token?.start ?? null);
      return true;
    }
    return false;
  }

  return {
    box,
    text,
    picked,
    options,
    open,
    active,
    setHighlighted,
    pick,
    pickerKey,
    /** Only the Nurlings still named in the text count; a chip whose `@Name` was deleted is dropped. */
    mentioned: () => picked.filter((bot) => hasMentionToken(text, bot.name)),
    unpick: (id: string) => setPicked((current) => current.filter((row) => row.id !== id)),
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
      setCaret(event.target.selectionStart);
      setHighlighted(0);
    },
    onSelect: (event: SyntheticEvent<HTMLTextAreaElement>) =>
      setCaret(event.currentTarget.selectionStart),
    reset: () => {
      setText("");
      setCaret(0);
      setPicked([]);
    },
  };
}
