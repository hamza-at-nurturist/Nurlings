import { Trans, useLingui } from "@lingui/react/macro";
import type { Bot, Ticket } from "@rakazo/contracts";
import { TICKET_DESCRIPTION_MAX_LENGTH, TICKET_TITLE_MAX_LENGTH } from "@rakazo/contracts";
import { Button, Dialog, DialogContent, DialogTitle, Textarea } from "@rakazo/ui-web";
import { Maximize2, Minimize2 } from "lucide-react";
import { useMemo, useState } from "react";
import { authClient } from "../../../lib/auth";
import { isFileDrag } from "../../../lib/pending-attachments";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";
import type { Viewer } from "./ActivityFeed";
import { ActivityFeed } from "./ActivityFeed";
import { mergeActivity } from "./activity";
import { readTicketFullscreen, writeTicketFullscreen } from "./fullscreen-pref";
import { NeedsYou } from "./NeedsYou";
import type { PropertiesPatch } from "./Properties";
import { Properties } from "./Properties";
import { ReplyBox } from "./ReplyBox";
import { TicketFiles } from "./TicketFiles";
import { useLiveBots } from "./use-live-bots";
import { useStagedFiles } from "./use-staged-files";
import { useTicketActivity } from "./use-ticket-activity";

type Props = {
  ticket: Ticket;
  bots: Bot[];
  /** The user's saved timezone, which dates are shown and picked in. */
  timeZone: string;
  /** Bumped by the board's live events for this ticket. */
  revision: number;
  onClose: () => void;
  onChanged: () => Promise<void>;
};

const FIELD =
  "-mx-1 min-h-0 w-[calc(100%+0.5rem)] resize-none rounded-md border-transparent bg-transparent px-1 shadow-none hover:bg-muted/60 focus-visible:bg-muted";

export function TicketModal({
  ticket,
  bots: initialBots,
  timeZone,
  revision,
  onClose,
  onChanged,
}: Props) {
  const { t } = useLingui();
  const session = authClient.useSession();
  const user = session.data?.user;
  const viewer = useMemo<Viewer>(
    () => ({ id: user?.id ?? "", name: user?.name ?? "", image: user?.image }),
    [user?.id, user?.name, user?.image],
  );
  const bots = useLiveBots(initialBots, revision);
  const activity = useTicketActivity(ticket.id, revision);
  const items = useMemo(
    () => mergeActivity(ticket, activity.events, activity.comments, activity.files, activity.runs),
    [ticket, activity.events, activity.comments, activity.files, activity.runs],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const staged = useStagedFiles();
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(readTicketFullscreen);
  const canAttach = Boolean(ticket.assigneeBotId);

  async function save(change: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await change();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      // A refused approve means the ticket moved on, so refresh either way.
      await onChanged().catch(() => undefined);
      activity.refresh();
      setBusy(false);
    }
  }

  function update(patch: PropertiesPatch & Partial<{ title: string; description: string }>) {
    return save(() => rpc.tickets.update({ id: ticket.id, ...patch }));
  }

  const failure = error || activity.error;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        initialFocus={false}
        data-dragging={dragging || undefined}
        className={`grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 data-dragging:ring-2 data-dragging:ring-ring ${
          fullscreen
            ? "h-dvh max-w-none rounded-none sm:max-w-none"
            : "h-[min(48rem,90vh)] max-w-[calc(100%-2rem)] sm:max-w-5xl"
        }`}
        // Files dropped anywhere on the ticket wait in the reply box, as on the chat composer.
        onDragOver={(event) => {
          if (!canAttach || !isFileDrag(event.dataTransfer)) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          if (!canAttach || !isFileDrag(event.dataTransfer)) return;
          event.preventDefault();
          setDragging(false);
          staged.add(event.dataTransfer.files);
        }}
      >
        <header className="relative flex items-center gap-2 border-b px-5 py-3 pr-20 text-sm text-muted-foreground">
          <Trans>Board</Trans>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-foreground">{ticket.ref}</span>
          {ticket.needsUser ? <NeedsYou /> : null}
          {ticket.status === "review" ? (
            <Button
              size="sm"
              data-testid="ticket-approve"
              className="ml-auto"
              disabled={busy}
              onClick={() => void save(() => rpc.tickets.approve({ id: ticket.id }))}
            >
              <Trans>Approve</Trans>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            data-testid="ticket-fullscreen"
            aria-label={fullscreen ? t`Collapse` : t`Expand`}
            className="absolute top-2 right-10"
            onClick={() => {
              writeTicketFullscreen(!fullscreen);
              setFullscreen(!fullscreen);
            }}
          >
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </header>
        <div className="grid min-h-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden">
          <section className="space-y-6 p-6 md:min-h-0 md:overflow-y-auto">
            <DialogTitle className="sr-only">{ticket.title}</DialogTitle>
            <Textarea
              key={`title-${ticket.id}-${ticket.title}`}
              aria-label={t`Title`}
              data-testid="ticket-title"
              rows={1}
              defaultValue={ticket.title}
              maxLength={TICKET_TITLE_MAX_LENGTH}
              className={`${FIELD} py-1 text-2xl leading-tight font-semibold md:text-2xl`}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              onBlur={(event) => {
                const next = event.currentTarget.value.trim();
                if (next && next !== ticket.title) void update({ title: next });
                else event.currentTarget.value = ticket.title;
              }}
            />
            <Properties
              ticket={ticket}
              bots={bots}
              timeZone={timeZone}
              disabled={busy}
              onChange={(patch) => void update(patch)}
            />
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                <Trans>Description</Trans>
              </h3>
              <Textarea
                key={`description-${ticket.id}-${ticket.updatedAt}`}
                aria-label={t`Description`}
                data-testid="ticket-description"
                defaultValue={ticket.description ?? ""}
                maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
                className={`${FIELD} min-h-20 py-1.5`}
                onBlur={(event) => {
                  if (event.currentTarget.value !== (ticket.description ?? ""))
                    void update({ description: event.currentTarget.value });
                }}
              />
            </section>
            <TicketFiles files={activity.files} bots={bots} />
            {failure ? (
              <p role="alert" className="text-sm text-destructive">
                {failure}
              </p>
            ) : null}
          </section>
          <aside className="flex flex-col border-t bg-muted/30 md:min-h-0 md:border-t-0 md:border-l">
            <div className="flex-1 p-4 md:min-h-0 md:overflow-y-auto">
              <ActivityFeed
                items={items}
                bots={bots}
                viewer={viewer}
                files={activity.files}
                runs={activity.runs}
                ownerBotId={ticket.assigneeBotId}
              />
            </div>
            <div className="p-4 pt-0">
              <ReplyBox
                ticketId={ticket.id}
                ownerBotId={ticket.assigneeBotId}
                files={staged}
                bots={bots}
                onSent={activity.addComment}
                onError={setError}
              />
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
