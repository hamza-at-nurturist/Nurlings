import { useLingui } from "@lingui/react/macro";
import type { Bot, TicketComment } from "@rakazo/contracts";
import { ATTACHMENT_ALLOWED_MIME_TYPES, TICKET_COMMENT_MAX_LENGTH } from "@rakazo/contracts";
import { Button, Textarea } from "@rakazo/ui-web";
import { ArrowUp, Paperclip, Plus, X } from "lucide-react";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";
import { MentionChip } from "./MentionChip";
import { MentionPicker } from "./MentionPicker";
import { activeMentionToken, hasMentionToken } from "./mentions";
import type { StagedFiles } from "./use-staged-files";

type Props = {
  ticketId: string;
  /** Uploads belong to the ticket's owner; without one there is no attach control. */
  ownerBotId: string | null;
  files: StagedFiles;
  bots: Bot[];
  onSent: (comment: TicketComment) => void;
  onError: (message: string) => void;
};

const MAX_OPTIONS = 8;
const ATTACHMENT_ACCEPT = [...ATTACHMENT_ALLOWED_MIME_TYPES, ".zip"].join(",");

export function ReplyBox({ ticketId, ownerBotId, files, bots, onSent, onError }: Props) {
  const { t } = useLingui();
  const pickerId = useId();
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [caret, setCaret] = useState(0);
  const [picked, setPicked] = useState<Bot[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  // The `@` position the user closed the picker at, so it stays closed until they type another.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const canSend = !busy && (body.trim().length > 0 || files.staged.length > 0);
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
    pendingCaret.current = next;
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
      const artifactIds = ownerBotId && files.staged.length ? await files.upload(ownerBotId) : [];
      onSent(
        await rpc.tickets.comment({
          ticketId,
          body,
          ...(mentions.length ? { mentions } : {}),
          ...(artifactIds.length ? { artifactIds } : {}),
        }),
      );
      setBody("");
      setCaret(0);
      setPicked([]);
      files.clear();
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
      {files.notice ? <p className="mb-1.5 text-xs text-muted-foreground">{files.notice}</p> : null}
      {files.staged.length ? (
        <div data-testid="reply-files" className="mb-1.5 flex flex-wrap gap-1.5">
          {files.staged.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-[13px] text-foreground/75"
            >
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <Paperclip size={14} strokeWidth={1.8} />
              )}
              <span className="max-w-[180px] truncate" dir="auto">
                {item.file.name}
              </span>
              <button
                type="button"
                aria-label={t`Remove ${item.file.name}`}
                onClick={() => files.remove(item)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="relative">
        {ownerBotId ? (
          <>
            <input
              ref={picker}
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              className="hidden"
              data-testid="reply-file-input"
              onChange={(event) => {
                files.add(event.target.files);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t`Attach file`}
              disabled={busy}
              onClick={() => picker.current?.click()}
              className="absolute bottom-2 left-2 z-10 rounded-full border border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus size={16} strokeWidth={2} />
            </Button>
          </>
        ) : null}
        <Textarea
          ref={box}
          aria-label={t`Reply`}
          placeholder={t`Reply`}
          aria-controls={open ? pickerId : undefined}
          aria-activedescendant={open ? `${pickerId}-${options[active]?.id}` : undefined}
          value={body}
          maxLength={TICKET_COMMENT_MAX_LENGTH}
          rows={1}
          className={`max-h-40 min-h-11 resize-none rounded-2xl py-2.5 pr-12 ${ownerBotId ? "pl-12" : ""}`}
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
