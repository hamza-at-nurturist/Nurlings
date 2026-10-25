// @vitest-environment jsdom

import type * as UiWeb from "@rakazo/ui-web";
import type { ComponentProps, ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  boards: { subscribe: vi.fn() },
  bots: { list: vi.fn() },
  me: vi.fn(async () => ({ timezone: "America/New_York" })),
  tickets: {
    list: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    comment: vi.fn(),
    comments: vi.fn(),
  },
}));
vi.mock("../lib/rpc", () => ({ rpc: api }));
vi.mock("../lib/relative-time", () => ({ formatRelativeTime: () => "5m ago" }));
vi.mock("./WindowChrome", () => ({ WindowChrome: () => null }));
vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce((text, part, index) => text + part + String(values[index] ?? ""), "");
  return { useLingui: () => ({ t }), Trans: ({ children }: { children: ReactNode }) => children };
});
vi.mock("@rakazo/chat-ui/web", () => ({
  ChatMarkdown: ({ children }: { children?: ReactNode }) => (
    <div data-testid="chat-markdown">{children}</div>
  ),
}));
vi.mock("@rakazo/ui-web", async (importOriginal) => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Badge: (props: ComponentProps<"span">) => <span {...props} />,
    Button: (props: ComponentProps<"button">) => <button {...props} />,
    buttonVariants: (await importOriginal<typeof UiWeb>()).buttonVariants,
    Dialog: Container,
    DialogContent: Container,
    DialogHeader: Container,
    DialogTitle: Container,
    Input: (props: ComponentProps<"input">) => <input {...props} />,
    NativeSelect: (props: ComponentProps<"select">) => <select {...props} />,
    NativeSelectOption: (props: ComponentProps<"option">) => <option {...props} />,
    Textarea: (props: ComponentProps<"textarea">) => <textarea {...props} />,
  };
});

vi.mock("../components/board/TicketModal/TicketModal", () => ({
  TicketModal: (props: {
    ticket: { id: string; status: string; assigneeBotId: string | null };
    bots: unknown[];
    revision: number;
    onClose: () => void;
    onChanged: () => Promise<void>;
  }) => (
    <div
      data-testid="ticket-modal"
      data-ticket={props.ticket.id}
      data-status={props.ticket.status}
      data-owner={props.ticket.assigneeBotId ?? ""}
      data-bots={props.bots.length}
      data-revision={props.revision}
    >
      <button type="button" data-testid="modal-close" onClick={props.onClose} />
      <button type="button" data-testid="modal-changed" onClick={() => void props.onChanged()} />
    </div>
  ),
}));

import { UpstreamBoardPage as BoardPage } from "./Board";

function bot(id: string, name: string) {
  return { id, name };
}

function ticket(
  title: string,
  id: string,
  status = "todo",
  ref = "RAK-1",
  assigneeBotId: string | null = null,
  description: string | null = null,
) {
  return {
    id,
    boardId: "board-1",
    spaceId: "space-1",
    number: 1,
    ref,
    title,
    description,
    status,
    priority: "normal",
    assigneeBotId,
    createdByBotId: null,
    createdByUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
}

async function renderBoard(stream?: AsyncIterable<{ ticketId?: string }>, refusal?: unknown) {
  api.boards.subscribe.mockReset();
  api.boards.subscribe.mockResolvedValue(
    stream ?? {
      [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
    },
  );
  if (refusal) api.boards.subscribe.mockRejectedValueOnce(refusal);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={["/app/board"]}>
        <BoardPage />
      </MemoryRouter>,
    ),
  );
  return {
    container,
    async cleanup() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

it("renders status columns and opens the ticket modal for the clicked ticket", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.bots.list.mockResolvedValue([bot("bot-1", "Helper")]);
  api.tickets.list.mockResolvedValue({
    tickets: [ticket("Ship", "ticket-1", "todo", "RAK-1", "bot-1", "Details")],
  });
  const page = await renderBoard();
  try {
    expect(
      Array.from(page.container.querySelectorAll("h2")).map((node) => node.textContent),
    ).toEqual(["To do", "In progress", "In review", "Blocked", "Done", "Won't do"]);
    expect(page.container.querySelector('[data-testid="ticket-modal"]')).toBeNull();
    await act(async () =>
      (
        page.container.querySelector('[data-testid="board-card-ticket-1"]') as HTMLButtonElement
      ).click(),
    );
    const modal = page.container.querySelector('[data-testid="ticket-modal"]') as HTMLElement;
    expect(modal.dataset.ticket).toBe("ticket-1");
    expect(modal.dataset.bots).toBe("1");
    expect(page.container.querySelector("form")).toBeNull();
    await act(async () =>
      (page.container.querySelector('[data-testid="modal-close"]') as HTMLButtonElement).click(),
    );
    expect(page.container.querySelector('[data-testid="ticket-modal"]')).toBeNull();
  } finally {
    await page.cleanup();
  }
});

it("marks only the cards that need the user", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.bots.list.mockResolvedValue([bot("bot-1", "Helper")]);
  api.tickets.list.mockResolvedValue({
    tickets: [
      { ...ticket("Pick a region", "ticket-1", "blocked", "RAK-1", "bot-1"), needsUser: true },
      { ...ticket("Ship", "ticket-2", "doing", "RAK-2", "bot-1"), needsUser: false },
    ],
  });
  const page = await renderBoard();
  try {
    const badge = (id: string) =>
      page.container.querySelector(
        `[data-testid="board-card-${id}"] [data-testid="ticket-needs-you"]`,
      );
    expect(badge("ticket-1")?.textContent).toBe("Needs you");
    expect(badge("ticket-2")).toBeNull();
  } finally {
    await page.cleanup();
  }
});

it("shows a card's dates in the user's timezone only when it has some", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers({ now: new Date("2026-10-26T16:00:00Z"), toFake: ["Date"] });
  api.bots.list.mockResolvedValue([bot("bot-1", "Helper")]);
  api.tickets.list.mockResolvedValue({
    tickets: [
      {
        ...ticket("Lease", "ticket-1", "doing", "RAK-1", "bot-1"),
        startAt: "2026-10-27T13:00:00.000Z",
        startHasTime: false,
        dueAt: "2026-10-30T19:00:00.000Z",
        dueHasTime: true,
      },
      {
        ...ticket("Late", "ticket-2", "doing", "RAK-2", "bot-1"),
        dueAt: "2026-10-25T03:59:00.000Z",
        dueHasTime: false,
      },
      ticket("Plain", "ticket-3", "doing", "RAK-3", "bot-1"),
    ],
  });
  const page = await renderBoard();
  try {
    const dates = (id: string) =>
      page.container.querySelector(`[data-testid="board-card-${id}"] [data-testid="card-dates"]`);
    expect(dates("ticket-1")?.querySelector('[data-testid="card-dates-shown"]')?.textContent).toBe(
      "Tomorrow –Fri 3 PM",
    );
    expect(dates("ticket-1")?.querySelector(".sr-only")?.textContent).toBe(
      "Start Tomorrow, Due Fri 3 PM",
    );
    expect(dates("ticket-2")?.querySelector(".text-destructive")?.textContent).toBe("Oct 24");
    expect(dates("ticket-3")).toBeNull();
  } finally {
    vi.useRealTimers();
    await page.cleanup();
  }
});

it("creates a ticket without a status picker", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.bots.list.mockResolvedValue([bot("bot-1", "Helper")]);
  api.tickets.list.mockResolvedValue({ tickets: [] });
  api.tickets.create.mockResolvedValue({});
  const page = await renderBoard();
  try {
    expect(page.container.textContent).toContain("No tickets yet");
    await act(async () =>
      Array.from(page.container.querySelectorAll("button"))
        .find((button) => button.textContent === "New ticket")!
        .click(),
    );
    expect(
      Array.from(page.container.querySelectorAll("label")).map((label) => label.textContent),
    ).not.toContain("Status");
    const input = page.container.querySelector("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input,
        "Launch",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () =>
      page.container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
    expect(api.tickets.create).toHaveBeenCalledWith({
      title: "Launch",
      description: "",
      assigneeBotId: "bot-1",
      priority: "normal",
    });
  } finally {
    await page.cleanup();
  }
});

function liveStream() {
  let deliver: ((result: IteratorResult<{ ticketId?: string }>) => void) | undefined;
  let fail: ((cause: Error) => void) | undefined;
  return {
    stream: {
      [Symbol.asyncIterator]: () => ({
        next: () =>
          new Promise<IteratorResult<{ ticketId?: string }>>((resolve, reject) => {
            deliver = resolve;
            fail = reject;
          }),
      }),
    },
    event: (ticketId: string) => deliver?.({ done: false, value: { ticketId } }),
    end: () => deliver?.({ done: true, value: undefined }),
    error: () => fail?.(new Error("Disconnected")),
  };
}

it("hands the open ticket its latest state and a revision for its own events only", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.bots.list.mockResolvedValue([bot("bot-1", "Helper"), bot("bot-2", "Other")]);
  api.tickets.list.mockResolvedValue({
    tickets: [ticket("Ship", "ticket-1", "todo", "RAK-1", "bot-1", "Details")],
  });
  const live = liveStream();
  const page = await renderBoard(live.stream);
  try {
    await act(async () =>
      (
        page.container.querySelector('[data-testid="board-card-ticket-1"]') as HTMLButtonElement
      ).click(),
    );
    const modal = () => page.container.querySelector('[data-testid="ticket-modal"]') as HTMLElement;
    const before = Number(modal().dataset.revision);
    await act(async () => live.event("ticket-2"));
    expect(Number(modal().dataset.revision)).toBe(before);
    api.tickets.list.mockResolvedValue({
      tickets: [ticket("Ship", "ticket-1", "doing", "RAK-1", "bot-2", "Details")],
    });
    await act(async () => live.event("ticket-1"));
    expect(Number(modal().dataset.revision)).toBe(before + 1);
    expect(modal().dataset.status).toBe("doing");
    expect(modal().dataset.owner).toBe("bot-2");
    api.tickets.list.mockClear();
    await act(async () =>
      (page.container.querySelector('[data-testid="modal-changed"]') as HTMLButtonElement).click(),
    );
    expect(api.tickets.list).toHaveBeenCalledTimes(1);
  } finally {
    await page.cleanup();
  }
});

it("closes the subscription before retrying a failed ticket refresh", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  api.bots.list.mockResolvedValue([bot("bot-1", "Helper")]);
  api.tickets.list
    .mockReset()
    .mockResolvedValueOnce({ tickets: [] })
    .mockRejectedValueOnce(new Error("Refresh failed"))
    .mockResolvedValue({ tickets: [ticket("After retry", "ticket-1")] });
  const next = vi.fn(() => new Promise<IteratorResult<{ ticketId?: string }>>(() => {}));
  const page = await renderBoard({ [Symbol.asyncIterator]: () => ({ next }) });
  try {
    const firstSignal = api.boards.subscribe.mock.calls[0]![1].signal as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    expect(next).not.toHaveBeenCalled();
    expect(api.boards.subscribe).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(api.boards.subscribe).toHaveBeenCalledTimes(2);
    const retrySignal = api.boards.subscribe.mock.calls[1]![1].signal as AbortSignal;
    expect(retrySignal).not.toBe(firstSignal);
    expect(retrySignal.aborted).toBe(false);
    expect(page.container.textContent).toContain("After retry");

    await page.cleanup();
    expect(retrySignal.aborted).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(api.boards.subscribe).toHaveBeenCalledTimes(2);
  } finally {
    if (page.container.isConnected) await page.cleanup();
    vi.useRealTimers();
  }
});

it.each(["end", "error"] as const)(
  "reconnects after subscription %s and stops on unmount",
  async (failure) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    api.bots.list.mockResolvedValue([bot("bot-1", "Helper")]);
    api.tickets.list.mockReset().mockResolvedValue({ tickets: [] });
    const live = liveStream();
    const page = await renderBoard(live.stream);
    try {
      const reconnected = liveStream();
      api.boards.subscribe.mockResolvedValue(reconnected.stream);
      await act(async () => live[failure]());
      const calls = api.tickets.list.mock.calls.length;
      api.tickets.list.mockResolvedValue({ tickets: [ticket("After reconnect", "ticket-1")] });
      await act(async () => vi.advanceTimersByTimeAsync(1_000));
      expect(api.boards.subscribe).toHaveBeenCalledTimes(2);
      expect(api.tickets.list).toHaveBeenCalledTimes(calls + 1);
      expect(page.container.textContent).toContain("After reconnect");
      await act(async () => reconnected.end());
      await page.cleanup();
      await act(async () => vi.advanceTimersByTimeAsync(5_000));
      expect(api.boards.subscribe).toHaveBeenCalledTimes(2);
      expect(api.boards.subscribe.mock.calls[1]![1].signal.aborted).toBe(true);
    } finally {
      if (page.container.isConnected) await page.cleanup();
      vi.useRealTimers();
    }
  },
);

it.each([
  [403, 1],
  [404, 1],
  [503, 2],
])("after a %i subscribing, reconnect attempts total %i", async (status, attempts) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  api.bots.list.mockResolvedValue([]);
  api.tickets.list.mockReset().mockResolvedValue({ tickets: [] });
  const page = await renderBoard(undefined, Object.assign(new Error("Refused"), { status }));
  try {
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(api.boards.subscribe).toHaveBeenCalledTimes(attempts);
  } finally {
    await page.cleanup();
    vi.useRealTimers();
  }
});

it("renders the back control as a plain link", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.bots.list.mockResolvedValue([]);
  api.tickets.list.mockResolvedValue({ tickets: [] });
  const page = await renderBoard();
  try {
    const back = page.container.querySelector('a[href="/app"]');
    if (!back) throw new Error("Missing back link");
    expect(back.hasAttribute("type")).toBe(false);
    expect(back.hasAttribute("role")).toBe(false);
  } finally {
    await page.cleanup();
    vi.unstubAllGlobals();
  }
});
