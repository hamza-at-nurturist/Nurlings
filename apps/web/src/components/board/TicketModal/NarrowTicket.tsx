import { Trans, useLingui } from "@lingui/react/macro";
import type { Ticket } from "@rakazo/contracts";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@rakazo/ui-web";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { NeedsYou } from "./NeedsYou";
import { useSwipe } from "./use-swipe";

export type NarrowTab = "ticket" | "activity";

type Props = {
  ticket: Ticket;
  tab: NarrowTab;
  onTabChange: (tab: NarrowTab) => void;
  /** Feed items that arrived since the activity was last viewed. */
  unseen: number;
  busy: boolean;
  pane: ReactNode;
  feed: ReactNode;
  reply: ReactNode;
  onApprove: () => void;
  onClose: () => void;
};

const SAFE_BOTTOM = "pb-[max(env(safe-area-inset-bottom),0.75rem)]";
const TAB = "h-11 text-[15px] group-data-horizontal/tabs:after:bottom-0";

/**
 * The ticket on a narrow window: a full-screen sheet with a Ticket tab and an Activity tab. Both
 * stay mounted, so a reply draft and the feed's scroll survive switching.
 */
export function NarrowTicket({
  ticket,
  tab,
  onTabChange,
  unseen,
  busy,
  pane,
  feed,
  reply,
  onApprove,
  onClose,
}: Props) {
  const { t } = useLingui();
  const scroller = useRef<HTMLDivElement>(null);
  const swipe = useSwipe((direction) => onTabChange(direction === "left" ? "activity" : "ticket"));

  // Opening the feed lands on the newest item, as a chat does.
  useEffect(() => {
    const element = scroller.current;
    if (tab === "activity" && element) element.scrollTop = element.scrollHeight;
  }, [tab]);

  return (
    <div data-testid="ticket-sheet" className="flex min-h-0 flex-1 flex-col">
      <header className="flex min-w-0 items-center gap-1.5 px-1.5 pt-1.5 pb-1">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t`Back`}
          data-testid="ticket-back"
          className="size-11"
          onClick={onClose}
        >
          <ChevronLeft className="size-5" />
        </Button>
        {tab === "ticket" ? (
          <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Trans>Board</Trans>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-foreground">{ticket.ref}</span>
            {ticket.needsUser ? <NeedsYou /> : null}
          </span>
        ) : (
          <span
            data-testid="ticket-sheet-title"
            className="min-w-0 truncate text-[15px] font-medium"
          >
            {ticket.title}
          </span>
        )}
      </header>
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as NarrowTab)}
        className="min-h-0 flex-1 gap-0"
      >
        <TabsList
          variant="line"
          className="grid w-full grid-cols-2 gap-0 rounded-none border-b p-0 group-data-horizontal/tabs:h-11"
        >
          <TabsTrigger value="ticket" className={TAB}>
            <Trans>Ticket</Trans>
          </TabsTrigger>
          <TabsTrigger value="activity" className={TAB}>
            <Trans>Activity</Trans>
            {unseen > 0 ? (
              <span
                data-testid="activity-unseen"
                className="rounded-full bg-primary px-1.5 text-[11px] leading-4 font-semibold text-primary-foreground"
              >
                {unseen > 9 ? "9+" : unseen}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>
        <div className="flex min-h-0 flex-1 flex-col" {...swipe}>
          <TabsContent
            value="ticket"
            keepMounted
            data-testid="ticket-tab"
            className="flex min-h-0 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-5 pb-6">{pane}</div>
            {ticket.status === "review" ? (
              <footer className={`border-t px-4 pt-3 ${SAFE_BOTTOM}`}>
                <Button
                  data-testid="ticket-approve"
                  className="h-12 w-full rounded-full text-[15px]"
                  disabled={busy}
                  onClick={onApprove}
                >
                  <Trans>Approve</Trans>
                </Button>
              </footer>
            ) : null}
          </TabsContent>
          <TabsContent
            value="activity"
            keepMounted
            data-testid="activity-tab"
            className="flex min-h-0 flex-col"
          >
            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <div className="flex min-h-full flex-col justify-end">{feed}</div>
            </div>
            <div className={`border-t px-3 pt-2.5 ${SAFE_BOTTOM}`}>{reply}</div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
