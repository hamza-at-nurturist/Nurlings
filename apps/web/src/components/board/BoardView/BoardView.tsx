import { Trans, useLingui } from "@lingui/react/macro";
import type { Bot, TicketListItem, TicketStatus } from "@rakazo/contracts";
import { isRetryableError, retryDelayMs, WORKING_RUN_STATUSES } from "@rakazo/core";
import type { QuickAddTicket } from "@rakazo/core/nurlings-board";
import { boardColumns } from "@rakazo/core/nurlings-board";
import { buttonVariants } from "@rakazo/ui-web";
import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";
import { WindowChrome } from "../../../pages/WindowChrome";
import { TicketModal } from "../TicketModal/TicketModal";
import { useLiveBots } from "../TicketModal/use-live-bots";
import { BoardCard } from "./BoardCard";
import { BoardColumn } from "./BoardColumn";
import { NurlingFilter } from "./NurlingFilter";
import { QuickAdd } from "./QuickAdd";

/** The Board: quick-add, a Nurling filter and six columns of live cards. */
export function BoardView() {
  const { t } = useLingui();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [initialBots, setInitialBots] = useState<Bot[]>([]);
  // Dates are shown and picked in the user's saved timezone, the one the server resolves them in.
  const [timeZone, setTimeZone] = useState("UTC");
  const [selected, setSelected] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [commentRefresh, setCommentRefresh] = useState<Record<string, number>>({});
  const bots = useLiveBots(initialBots, commentRefresh["*"] ?? 0);
  const reload = useCallback(async () => {
    const result = await rpc.tickets.list({});
    setTickets(result.tickets);
  }, []);

  useEffect(() => {
    let currentController: AbortController | undefined;
    let active = true;
    void Promise.all([rpc.tickets.list({}), rpc.bots.list(), rpc.me()])
      .then(([result, owners, me]) => {
        if (!active) return;
        setTickets(result.tickets);
        setInitialBots(owners);
        setTimeZone(me.timezone ?? "UTC");
      })
      .catch((cause) => {
        if (active) setError(errorText(cause));
      });
    let cancelRetry: (() => void) | undefined;
    void (async () => {
      while (active) {
        const controller = new AbortController();
        currentController = controller;
        let failure: unknown;
        try {
          const stream = await rpc.boards.subscribe(undefined, { signal: controller.signal });
          if (!active) return;
          const result = await rpc.tickets.list({});
          if (!active) return;
          setTickets(result.tickets);
          setCommentRefresh((previous) => ({
            ...previous,
            "*": (previous["*"] ?? 0) + 1,
          }));
          setError("");
          for await (const event of stream) {
            if (!active) return;
            setCommentRefresh((previous) => ({
              ...previous,
              [event.ticketId ?? "*"]: (previous[event.ticketId ?? "*"] ?? 0) + 1,
            }));
            const result = await rpc.tickets.list({});
            if (active) setTickets(result.tickets);
          }
        } catch (cause) {
          failure = cause;
          if (active) setError(errorText(cause));
        } finally {
          controller.abort();
        }
        if (!active || !isRetryableError(failure)) return;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, retryDelayMs(failure, 1_000));
          cancelRetry = () => {
            clearTimeout(timer);
            resolve();
          };
        });
        cancelRetry = undefined;
      }
    })();
    return () => {
      active = false;
      currentController?.abort();
      cancelRetry?.();
    };
  }, []);

  // A run can finish without changing its ticket, so a change in who is working reloads the cards.
  const working = bots
    .filter((bot) => WORKING_RUN_STATUSES.some((status) => status === bot.status))
    .map((bot) => bot.id)
    .join(",");
  useEffect(() => {
    if (initialBots.length) void reload().catch(() => undefined);
  }, [working]);

  const columns = useMemo(() => boardColumns(tickets, owner, new Date()), [tickets, owner]);

  async function act(change: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await change();
    } catch (cause) {
      setError(errorText(cause));
      throw cause;
    } finally {
      await reload().catch(() => undefined);
      setBusy(false);
    }
  }

  function move(ticket: TicketListItem, status: TicketStatus) {
    if (ticket.status === status) return;
    // Show the move now; the reload after it puts the card back if the server refused.
    setTickets((rows) => rows.map((row) => (row.id === ticket.id ? { ...row, status } : row)));
    void act(() => rpc.tickets.move({ id: ticket.id, status })).catch(() => undefined);
  }

  const open = selected ? tickets.find((row) => row.id === selected) : undefined;

  return (
    <div className="@container flex h-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <WindowChrome />
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b px-4 py-3 @min-[641px]:px-7 @min-[641px]:py-4">
        <Link
          to="/app"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label={t`Back`}
        >
          <ChevronLeft />
        </Link>
        <h1 className="text-lg font-semibold">
          <Trans>Board</Trans>
        </h1>
        <NurlingFilter
          bots={bots}
          value={owner}
          onChange={setOwner}
          className="@max-[640px]:order-2 @max-[640px]:w-full @min-[641px]:ml-2"
        />
        <QuickAdd
          bots={bots}
          onCreate={(ticket: QuickAddTicket) => act(() => rpc.tickets.create(ticket))}
          className="ml-auto w-[26rem] max-w-full @max-[1100px]:order-3 @max-[1100px]:ml-0 @max-[1100px]:w-full"
        />
      </header>
      {error ? (
        <p role="alert" className="px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <main
        data-testid="board-columns"
        className="grid min-h-0 flex-1 snap-x snap-mandatory scroll-px-7 auto-cols-[minmax(12.5rem,1fr)] grid-flow-col gap-3.5 overflow-x-auto px-7 py-6 @max-[1100px]:auto-cols-[16rem] @max-[640px]:scroll-px-4 @max-[640px]:auto-cols-[84%] @max-[640px]:gap-2.5 @max-[640px]:p-4"
      >
        {columns.map((column) => {
          const shown =
            column.status === "done" && showOlder
              ? [...column.tickets, ...column.older]
              : column.tickets;
          return (
            <BoardColumn
              key={column.status}
              status={column.status}
              count={column.tickets.length + column.older.length}
              hidden={showOlder ? 0 : column.older.length}
              onShowOlder={() => setShowOlder(true)}
              onDropTicket={(id) => {
                const ticket = tickets.find((row) => row.id === id);
                if (ticket) move(ticket, column.status);
              }}
            >
              {shown.map((ticket) => (
                <BoardCard
                  key={ticket.id}
                  ticket={ticket}
                  bots={bots}
                  timeZone={timeZone}
                  busy={busy}
                  onOpen={() => setSelected(ticket.id)}
                  onMove={(status) => move(ticket, status)}
                  onApprove={() =>
                    void act(() => rpc.tickets.approve({ id: ticket.id })).catch(() => undefined)
                  }
                />
              ))}
            </BoardColumn>
          );
        })}
      </main>
      {open ? (
        <TicketModal
          key={open.id}
          ticket={open}
          bots={bots}
          timeZone={timeZone}
          revision={(commentRefresh["*"] ?? 0) + (commentRefresh[open.id] ?? 0)}
          onClose={() => setSelected(null)}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}
