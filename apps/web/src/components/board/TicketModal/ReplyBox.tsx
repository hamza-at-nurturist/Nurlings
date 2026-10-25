import { useLingui } from "@lingui/react/macro";
import type { Bot, TicketComment } from "@rakazo/contracts";
import { ATTACHMENT_ALLOWED_MIME_TYPES, TICKET_COMMENT_MAX_LENGTH } from "@rakazo/contracts";
import { Button, Textarea } from "@rakazo/ui-web";
import { ArrowUp, Paperclip, Plus, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";
import { MentionChip } from "./MentionChip";
import { MentionPicker } from "./MentionPicker";
import { useMentionInput } from "./use-mention-input";
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

const ATTACHMENT_ACCEPT = [...ATTACHMENT_ALLOWED_MIME_TYPES, ".zip"].join(",");

export function ReplyBox({ ticketId, ownerBotId, files, bots, onSent, onError }: Props) {
  const { t } = useLingui();
  const pickerId = useId();
  const picker = useRef<HTMLInputElement>(null);
  const input = useMentionInput(bots);
  const { box, text: body, picked, options, open, active } = input;
  const [busy, setBusy] = useState(false);
  const canSend = !busy && (body.trim().length > 0 || files.staged.length > 0);

  async function send() {
    if (!canSend) return;
    const mentions = input.mentioned().map((bot) => ({ kind: "bot" as const, id: bot.id }));
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
      input.reset();
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
          onHighlight={input.setHighlighted}
          onPick={input.pick}
        />
      ) : null}
      {picked.length ? (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {picked.map((bot) => (
            <MentionChip
              key={bot.id}
              name={bot.name}
              color={bot.color}
              onRemove={() => input.unpick(bot.id)}
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
          onChange={input.onChange}
          onSelect={input.onSelect}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || input.pickerKey(event)) return;
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
