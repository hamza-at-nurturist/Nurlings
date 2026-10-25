// @vitest-environment jsdom

import type { ComponentProps, ReactNode } from "react";
import { act, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  boards: { subscribe: vi.fn() },
  bots: { list: vi.fn() },
  me: vi.fn(async () => ({ timezone: "UTC" })),
  tickets: { list: vi.fn(), create: vi.fn(), move: vi.fn(), approve: vi.fn() },
}));
vi.mock("../../../lib/rpc", () => ({ rpc: api }));
vi.mock("../../../pages/WindowChrome", () => ({ WindowChrome: () => null }));
vi.mock("../TicketModal/TicketModal", () => ({
  TicketModal: (props: { ticket: { id: string } }) => (
    <div data-testid="ticket-modal" data-ticket={props.ticket.id} />
  ),
}));
vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce((text, part, index) => text + part + String(values[index] ?? ""), "");
  return { useLingui: () => ({ t }), Trans: ({ children }: { children: ReactNode }) => children };
});
vi.mock("@rakazo/ui-web", async (importOriginal) => {
  const original = await importOriginal<typeof import("@rakazo/ui-web")>();
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Choose = createContext<(value: string) => void>(() => {});
  const Toggle = createContext<(value: string[]) => void>(() => {});
  return {
    cn: original.cn,
    buttonVariants: original.buttonVariants,
    BotAvatar: (props: { identity?: string; status?: string }) => (
      <span data-testid="bot-avatar" data-identity={props.identity} data-status={props.status} />
    ),
    Badge: (props: ComponentProps<"span">) => <span {...props} />,
    Button: (props: ComponentProps<"button"> & { size?: string }) => {
      const { size: _size, ...rest } = props;
      return <button {...rest} />;
    },
    Textarea: (props: ComponentProps<"textarea">) => <textarea {...props} />,
    DropdownMenu: Container,
    DropdownMenuContent: Container,
    DropdownMenuTrigger: (props: ComponentProps<"button">) => <button type="button" {...props} />,
    DropdownMenuRadioGroup: ({
      children,
      onValueChange,
    }: {
      children?: ReactNode;
      onValueChange: (value: string) => void;
    }) => <Choose.Provider value={onValueChange}>{children}</Choose.Provider>,
    DropdownMenuRadioItem: ({ children, value }: { children?: ReactNode; value: string }) => {
      const choose = useContext(Choose);
      return (
        <button type="button" data-testid={`option-${value}`} onClick={() => choose(value)}>
          {children}
        </button>
      );
    },
    ToggleGroup: ({
      children,
      onValueChange,
    }: {
      children?: ReactNode;
      onValueChange: (value: string[]) => void;
    }) => <Toggle.Provider value={onValueChange}>{children}</Toggle.Provider>,
    ToggleGroupItem: ({
      children,
      value,
      ...rest
    }: ComponentProps<"button"> & { value: string }) => {
      const change = useContext(Toggle);
      return (
        <button type="button" aria-label={rest["aria-label"]} onClick={() => change([value])}>
          {children}
        </button>
      );
    },
  };
});

import type { Bot, TicketListItem } from "@rakazo/contracts";
import { BoardView } from "./BoardView";

const NOW = Date.parse("2026-10-25T12:00:00.000Z");
const bots = [
  { id: "chief", name: "Chief", color: "#8b5cf6", status: "idle" },
  { id: "scout", name: "Scout", color: "#22c55e", status: "running" },
] as unknown as Bot[];

function ticket(id: string, patch: Partial<TicketListItem> = {}): TicketListItem {
  return {
    id,
    boardId: "b1",
    spaceId: "s1",
    number: 1,
    ref: `NUR-${id}`,
    title: `Ticket ${id}`,
    description: null,
    status: "todo",
    priority: "normal",
    assigneeBotId: "chief",
    createdByBotId: null,
    createdByUserId: "user-1",
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
    completedAt: null,
    needsUser: false,
    startAt: null,
    startHasTime: false,
    dueAt: null,
    dueHasTime: false,
    lastComment: null,
    fileCount: 0,
    workingBotId: null,
    ...patch,
  };
}

const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const rows = () => [
  ticket("1", { lastComment: "Not started yet" }),
  ticket("2", { status: "doing", assigneeBotId: "scout", workingBotId: "scout", fileCount: 1 }),
  ticket("3", { status: "review", fileCount: 2, needsUser: true }),
  ticket("4", { status: "done", completedAt: daysAgo(1) }),
  ticket("5", { status: "done", completedAt: daysAgo(9) }),
  ticket("6", { status: "done", completedAt: daysAgo(30) }),
];

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  api.tickets.list.mockReset().mockResolvedValue({ tickets: rows() });
  api.bots.list.mockReset().mockResolvedValue(bots);
  api.tickets.create.mockReset().mockResolvedValue({});
  api.tickets.move.mockReset().mockResolvedValue({});
  api.tickets.approve.mockReset().mockResolvedValue({});
  // The live stream stays open and quiet.
  api.boards.subscribe.mockReset().mockImplementation(async () =>
    (async function* () {
      await new Promise(() => {});
    })(),
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

async function flush() {
  for (let index = 0; index < 5; index += 1) await act(async () => {});
}

async function render() {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <BoardView />
      </MemoryRouter>,
    );
  });
  await flush();
}

const column = (status: string) =>
  container.querySelector<HTMLElement>(`[data-testid='board-column-${status}']`)!;
const card = (id: string) =>
  container.querySelector<HTMLElement>(`[data-testid='board-card-${id}']`);
const count = (status: string) =>
  column(status).querySelector("[data-testid='column-count']")!.textContent;

async function click(element: Element | null) {
  await act(async () => (element as HTMLElement).click());
  await flush();
}

async function type(box: HTMLTextAreaElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(box, value);
    box.setSelectionRange(value.length, value.length);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function press(box: HTMLTextAreaElement, key: string, init: KeyboardEventInit = {}) {
  await act(async () => {
    box.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });
  await flush();
}

describe("BoardView", () => {
  it("shows six columns with counts, Your turn on review, and a week of Done", async () => {
    await render();
    for (const status of ["todo", "doing", "review", "blocked", "done", "closed"])
      expect(column(status)).toBeTruthy();
    expect(count("todo")).toBe("1");
    expect(count("blocked")).toBe("0");
    expect(column("review").textContent).toContain("Your turn");
    expect(column("todo").textContent).not.toContain("Your turn");
    expect(count("done")).toBe("3");
    expect(card("4")).toBeTruthy();
    expect(card("5")).toBeNull();
    const more = [...column("done").querySelectorAll("button")].find((button) =>
      button.textContent?.includes("older"),
    );
    expect(more?.textContent).toBe("Show 2 older");
    await click(more!);
    expect(card("5")).toBeTruthy();
    expect(card("6")).toBeTruthy();
    expect(column("done").textContent).not.toContain("older");
  });

  it("shows who is working, else the latest comment, with the owner and file count", async () => {
    await render();
    expect(card("2")!.querySelector("[data-testid='card-working']")!.textContent).toBe(
      "Scout is working…",
    );
    expect(card("2")!.querySelector("[data-testid='card-last']")).toBeNull();
    expect(
      card("2")!.querySelector("[data-testid='bot-avatar']")!.getAttribute("data-status"),
    ).toBe("running");
    expect(card("1")!.querySelector("[data-testid='card-last']")!.textContent).toBe(
      "Not started yet",
    );
    expect(card("1")!.querySelector("[data-testid='card-owner']")!.textContent).toBe("Chief");
    expect(card("1")!.querySelector("[data-testid='card-files']")).toBeNull();
    expect(card("3")!.querySelector("[data-testid='card-files']")!.textContent).toContain("2");
    expect(card("3")!.querySelector("[data-testid='ticket-needs-you']")).toBeTruthy();
  });

  it("opens the modal from a card, and approves a review card without opening it", async () => {
    await render();
    const approve = [...card("3")!.querySelectorAll("button")].find(
      (button) => button.textContent === "Approve",
    );
    expect(card("1")!.textContent).not.toContain("Approve");
    await click(approve!);
    expect(api.tickets.approve).toHaveBeenCalledWith({ id: "3" });
    expect(container.querySelector("[data-testid='ticket-modal']")).toBeNull();
    await click(card("1")!.querySelector("[data-testid='card-open']"));
    expect(
      container.querySelector("[data-testid='ticket-modal']")!.getAttribute("data-ticket"),
    ).toBe("1");
  });

  it("filters the cards and counts by Nurling", async () => {
    await render();
    await click(container.querySelector("button[aria-label='Scout']"));
    expect(card("1")).toBeNull();
    expect(card("2")).toBeTruthy();
    expect(count("todo")).toBe("0");
    expect(count("doing")).toBe("1");
    const all = [...container.querySelectorAll("button")].find((b) => b.textContent === "All");
    await click(all!);
    expect(card("1")).toBeTruthy();
  });

  it("quick-adds on Enter, with lines and an @ owner", async () => {
    await render();
    const box = container.querySelector<HTMLTextAreaElement>("[data-testid='quick-add'] textarea")!;
    await type(box, "Comp report\nTwo flips max");
    await press(box, "Enter", { shiftKey: true });
    expect(api.tickets.create).not.toHaveBeenCalled();
    await press(box, "Enter");
    expect(api.tickets.create).toHaveBeenCalledWith({
      title: "Comp report",
      description: "Two flips max",
    });
    expect(box.value).toBe("");

    await type(box, "@Sc");
    const option = container.querySelector("[data-testid='mention-option']");
    expect(option!.textContent).toBe("Scout");
    await click(option);
    expect(box.value).toBe("@Scout ");
    await type(box, "@Scout skip trace");
    await press(box, "Enter");
    expect(api.tickets.create).toHaveBeenLastCalledWith({
      title: "skip trace",
      assigneeBotId: "scout",
    });
  });

  it("keeps the quick-add text when creating fails", async () => {
    api.tickets.create.mockRejectedValueOnce(new Error("Board unavailable."));
    await render();
    const box = container.querySelector<HTMLTextAreaElement>("[data-testid='quick-add'] textarea")!;
    await type(box, "Comp report");
    await press(box, "Enter");
    expect(box.value).toBe("Comp report");
    expect(container.querySelector("[role='alert']")!.textContent).toContain("Board unavailable");
  });

  it("moves a card from its menu at once, and puts it back when refused", async () => {
    await render();
    const moved = rows().map((row) =>
      row.id === "1" ? { ...row, status: "blocked" as const } : row,
    );
    api.tickets.list.mockResolvedValue({ tickets: moved });
    await click(card("1")!.querySelector("[data-testid='option-blocked']"));
    expect(api.tickets.move).toHaveBeenCalledWith({ id: "1", status: "blocked" });
    expect(column("blocked").contains(card("1"))).toBe(true);

    let refuse!: (error: Error) => void;
    api.tickets.move.mockImplementationOnce(
      () => new Promise((_resolve, reject) => (refuse = reject)),
    );
    await click(card("4")!.querySelector("[data-testid='option-doing']"));
    expect(column("doing").contains(card("4"))).toBe(true);
    await act(async () => refuse(new Error("Not allowed.")));
    await flush();
    expect(column("done").contains(card("4"))).toBe(true);
    expect(container.querySelector("[role='alert']")!.textContent).toContain("Not allowed.");
  });

  it("moves a card dropped on another column", async () => {
    await render();
    const data = new Map<string, string>();
    const transfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? "",
      get types() {
        return [...data.keys()];
      },
      effectAllowed: "",
      dropEffect: "",
    };
    const drag = (type: string, target: Element) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", { value: transfer });
      target.dispatchEvent(event);
      return event;
    };
    await act(async () => void drag("dragstart", card("1")!));
    const over = await act(async () => drag("dragover", column("review")));
    expect(over.defaultPrevented).toBe(true);
    await act(async () => void drag("drop", column("review")));
    await flush();
    expect(api.tickets.move).toHaveBeenCalledWith({ id: "1", status: "review" });
  });
});
