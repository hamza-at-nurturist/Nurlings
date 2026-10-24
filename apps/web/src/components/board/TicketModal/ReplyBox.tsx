import { useLingui } from "@lingui/react/macro";
import type { Bot, TicketComment } from "@rakazo/contracts";
import { TICKET_COMMENT_MAX_LENGTH } from "@rakazo/contracts";
import { Button, Textarea } from "@rakazo/ui-web";
import { ArrowUp } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";
import { MentionChip } from "./MentionChip";
import { MentionPicker } from "./MentionPicker";
import { activeMentionToken, hasMentionToken } from "./mentions";

type Props = {
  ticketId: string;
  bots: Bot[];
  onSent: (comment: TicketComment) => void;
  onError: (message: string) => void;
};

const MAX_OPTIONS = 8;

export function ReplyBox({ ticketId, bots, onSent, onError }: Props) {
  const { t } = useLingui();
  const pickerId = useId();
  const box = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [caret, setCaret] = useState(0);
  const [picked, setPicked] = useState<Bot[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  // The `@` position the user closed the picker at, so it stays closed until they type another.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const canSend = !busy && body.trim().length > 0;

  const token = activeMentionToken(body, caret);
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
    const text = `${body.slice(0, token.start)}@${bot.name} ${body.slice(caret)}`;
    const next = token.start + bot.name.length + 2;
    setBody(text);
    setCaret(next);
    setHighlighted(0);
    setPicked((current) =>
      current.some((row) => row.id === bot.id) ? current : [...current, bot],
    );
    requestAnimationFrame(() => {
      box.current?.focus();
      box.current?.setSelectionRange(next, next);
    });
  }

  async function send() {
    if (!canSend) return;
    // Only the mentions still in the text count; a chip whose `@Name` was deleted is dropped.
    const mentions = picked
      .filter((bot) => hasMentionToken(body, bot.name))
      .map((bot) => ({ kind: "bot" as const, id: bot.id }));
    setBusy(true);
    onError("");
    try {
      onSent(
        await rpc.tickets.comment({ ticketId, body, ...(mentions.length ? { mentions } : {}) }),
      );
      setBody("");
      setCaret(0);
      setPicked([]);
    } catch (cause) {
      onError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      {open ? (
        <MentionPicker
          id={pickerId}
          options={options}
          highlighted={active}
          onHighlight={setHighlighted}
          onPick={pick}
        />
      ) : null}
      {picked.length ? (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {picked.map((bot) => (
            <MentionChip
              key={bot.id}
              name={bot.name}
              color={bot.color}
              onRemove={() => setPicked((current) => current.filter((row) => row.id !== bot.id))}
            />
          ))}
        </div>
      ) : null}
      <div className="relative">
        <Textarea
          ref={box}
          aria-label={t`Reply`}
          placeholder={t`Reply`}
          aria-controls={open ? pickerId : undefined}
          aria-activedescendant={open ? `${pickerId}-${options[active]?.id}` : undefined}
          value={body}
          maxLength={TICKET_COMMENT_MAX_LENGTH}
          rows={1}
          className="max-h-40 min-h-11 resize-none rounded-2xl py-2.5 pr-12"
          onChange={(event) => {
            setBody(event.target.value);
            setCaret(event.target.selectionStart);
            setHighlighted(0);
          }}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (open) {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setHighlighted((active + step + options.length) % options.length);
                return;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                const bot = options[active];
                if (bot) pick(bot);
                return;
              }
              if (event.key === "Escape") {
                // Close the picker, not the whole dialog.
                event.preventDefault();
                event.stopPropagation();
                setDismissedAt(token?.start ?? null);
                return;
              }
            }
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            void send();
          }}
        />
        <Button
          type="submit"
          size="icon-sm"
          className="absolute right-2 bottom-2 rounded-full"
          aria-label={t`Send`}
          disabled={!canSend}
        >
          <ArrowUp />
        </Button>
      </div>
    </form>
  );
}
