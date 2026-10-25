import { Trans, useLingui } from "@lingui/react/macro";
import type { Bot, Ticket } from "@rakazo/contracts";
import { Button, Dialog, DialogContent } from "@rakazo/ui-web";
import { Maximize2, Minimize2 } from "lucide-react";
import { useMemo, useState } from "react";
import { authClient } from "../../../lib/auth";
import { isFileDrag } from "../../../lib/pending-attachments";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";
import type { Viewer } from "./ActivityFeed";
import { ActivityFeed } from "./ActivityFeed";
import { mergeActivity } from "./activity";
import { useActivitySeen } from "./activity-seen";
import { readTicketFullscreen, writeTicketFullscreen } from "./fullscreen-pref";
import { LatestActivity } from "./LatestActivity";
import type { NarrowTab } from "./NarrowTicket";
import { NarrowTicket } from "./NarrowTicket";
import { NeedsYou } from "./NeedsYou";
import type { PropertiesPatch } from "./Properties";
import { ReplyBox } from "./ReplyBox";
import { TicketPane } from "./TicketPane";
import { useLiveBots } from "./use-live-bots";
import { useNarrowModal } from "./use-narrow-modal";
import { useStagedFiles } from "./use-staged-files";
import { useTicketActivity } from "./use-ticket-activity";
import { useVisualViewport } from "./use-visual-viewport";

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

const NARROW =
  "top-0 left-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 pt-[env(safe-area-inset-top)] ring-0 sm:max-w-none data-dragging:ring-2 data-dragging:ring-ring";

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
  const narrow = useNarrowModal();
  const [tab, setTab] = useState<NarrowTab>("ticket");
  const viewport = useVisualViewport(narrow);
  const unseen = useActivitySeen(
    ticket.id,
    items,
    viewer.id,
    activity.loaded,
    !narrow || tab === "activity",
  );

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
  const approve = () => void save(() => rpc.tickets.approve({ id: ticket.id }));
  const pane = (
    <TicketPane
      ticket={ticket}
      bots={bots}
      timeZone={timeZone}
      busy={busy}
      files={activity.files}
      failure={failure}
      narrow={narrow}
      latest={
        narrow ? (
          <LatestActivity
            items={items}
            bots={bots}
            viewer={viewer}
            onOpen={() => setTab("activity")}
          />
        ) : null
      }
      onUpdate={(patch) => void update(patch)}
    />
  );
  const feed = (
    <ActivityFeed
      items={items}
      bots={bots}
      viewer={viewer}
      files={activity.files}
      runs={activity.runs}
      ownerBotId={ticket.assigneeBotId}
    />
  );
  const reply = (
    <ReplyBox
      ticketId={ticket.id}
      ownerBotId={ticket.assigneeBotId}
      files={staged}
      bots={bots}
      touch={narrow}
      onSent={activity.addComment}
      onError={setError}
    />
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        initialFocus={false}
        showCloseButton={!narrow}
        data-dragging={dragging || undefined}
        style={narrow && viewport ? { top: viewport.top, height: viewport.height } : undefined}
        className={
          narrow
            ? NARROW
            : `grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 data-dragging:ring-2 data-dragging:ring-ring ${
                fullscreen
                  ? "h-dvh max-w-none rounded-none sm:max-w-none"
                  : "h-[min(48rem,90vh)] max-w-[calc(100%-2rem)] sm:max-w-5xl"
              }`
        }
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
        {narrow ? (
          <NarrowTicket
            ticket={ticket}
            tab={tab}
            onTabChange={setTab}
            unseen={unseen}
            busy={busy}
            pane={pane}
            feed={feed}
            reply={reply}
            onApprove={approve}
            onClose={onClose}
          />
        ) : (
          <>
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
                  onClick={approve}
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
            <div className="grid min-h-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_26rem] md:overflow-hidden">
              <section className="space-y-6 px-10 py-8 md:min-h-0 md:overflow-y-auto">
                {pane}
              </section>
              <aside className="flex flex-col border-t bg-muted/30 md:min-h-0 md:border-t-0 md:border-l">
                <div className="flex-1 p-4 md:min-h-0 md:overflow-y-auto">{feed}</div>
                <div className="p-4 pt-0">{reply}</div>
              </aside>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
