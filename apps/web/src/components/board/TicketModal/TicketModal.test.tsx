// @vitest-environment jsdom

import type { ComponentProps, ReactNode } from "react";
import { act, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  bots: { list: vi.fn() },
  tickets: {
    update: vi.fn(),
    comment: vi.fn(),
    comments: vi.fn(),
    events: vi.fn(),
    files: vi.fn(),
  },
}));
const session = vi.hoisted(() => ({
  data: { user: { id: "user-1", name: "Ada", image: null as string | null } },
}));
vi.mock("../../../lib/rpc", () => ({ rpc: api }));
vi.mock("../../../lib/auth", () => ({ authClient: { useSession: () => session } }));
vi.mock("../../../lib/relative-time", () => ({ formatRelativeTime: () => "5m ago" }));
vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce((text, part, index) => text + part + String(values[index] ?? ""), "");
  return { useLingui: () => ({ t }), Trans: ({ children }: { children: ReactNode }) => children };
});
vi.mock("@rakazo/chat-ui/web", () => ({
  ChatMarkdown: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../ArtifactFileCard", () => ({
  ArtifactFileCard: (props: { name: string; target: { botId: string } }) => (
    <div data-testid="file-card" data-bot={props.target.botId}>
      {props.name}
    </div>
  ),
}));
vi.mock("../../../pages/shell/chat-shared", () => ({ FALLBACK_BOT_COLOR: "#111111" }));
vi.mock("@rakazo/ui-web", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Choose = createContext<(value: string) => void>(() => {});
  return {
    BotAvatar: (props: { color: string; identity?: string; status?: string; size?: number }) => (
      <span
        data-testid="bot-avatar"
        data-color={props.color}
        data-identity={props.identity}
        data-status={props.status}
      />
    ),
    Button: (props: ComponentProps<"button"> & { size?: string }) => {
      const { size: _size, ...rest } = props;
      return <button {...rest} />;
    },
    Dialog: Container,
    DialogContent: Container,
    DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
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
    Textarea: (props: ComponentProps<"textarea">) => <textarea {...props} />,
  };
});

import type { Bot, Ticket, TicketComment, TicketEvent } from "@rakazo/contracts";
import { TicketModal } from "./TicketModal";

const bots = [
  { id: "bot-1", name: "Chief", color: "#7c3aed::shape_8", status: "running" },
  { id: "bot-2", name: "Scout", color: "#22c55e", status: "idle" },
] as unknown as Bot[];

function makeTicket(patch: Partial<Ticket> = {}): Ticket {
  return {
    id: "t1",
    boardId: "b1",
    spaceId: "s1",
    number: 1,
    ref: "NUR-1",
    title: "Comp report",
    description: "Find 3 to 5 comps.",
    status: "review",
    priority: "normal",
    assigneeBotId: "bot-1",
    createdByBotId: null,
    createdByUserId: "user-1",
    createdAt: "2026-10-24T03:41:00.000Z",
    updatedAt: "2026-10-24T03:41:00.000Z",
    completedAt: null,
    ...patch,
  };
}

function event(id: string, createdAt: string, patch: Partial<TicketEvent>): TicketEvent {
  return {
    id,
    ticketId: "t1",
    kind: "status",
    actorBotId: "bot-1",
    actorUserId: null,
    actorName: "Chief",
    status: "blocked",
    assigneeBotId: null,
    assigneeName: null,
    createdAt,
    ...patch,
  };
}

function comment(id: string, createdAt: string, patch: Partial<TicketComment>): TicketComment {
  return {
    id,
    ticketId: "t1",
    body: id,
    authorBotId: null,
    authorUserId: "user-1",
    authorName: "Ada",
    createdAt,
    updatedAt: createdAt,
    ...patch,
  };
}

const events = [
  event("e1", "2026-10-24T03:41:00.000Z", {
    kind: "created",
    actorBotId: null,
    actorUserId: "user-1",
    actorName: "Ada",
    status: null,
    assigneeBotId: "bot-1",
    assigneeName: "Chief",
  }),
  event("e2", "2026-10-24T03:42:00.000Z", {}),
  event("e3", "2026-10-24T04:17:00.000Z", { status: "review" }),
];
const comments = [
  comment("Redfin wants a check", "2026-10-24T03:42:30.000Z", {
    authorBotId: "bot-1",
    authorUserId: "user-1",
    authorName: "Chief",
  }),
  comment("Done", "2026-10-24T04:08:00.000Z", {}),
];

function setup() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.bots.list.mockResolvedValue(bots);
  api.tickets.events.mockResolvedValue(events);
  api.tickets.comments.mockResolvedValue(comments);
  api.tickets.files.mockResolvedValue([]);
  api.tickets.update.mockResolvedValue({});
  api.tickets.comment.mockImplementation(async ({ body }: { body: string }) =>
    comment("sent", "2026-10-24T05:00:00.000Z", { body }),
  );
}
beforeEach(() => {
  for (const group of [api.bots, api.tickets])
    for (const fn of Object.values(group)) fn.mockReset();
  session.data.user.image = null;
  setup();
});

async function open(props: Partial<ComponentProps<typeof TicketModal>> = {}) {
  const onClose = vi.fn();
  const onChanged = vi.fn(async () => {});
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = async (extra: Partial<ComponentProps<typeof TicketModal>> = {}) =>
    act(async () =>
      root.render(
        <TicketModal
          ticket={makeTicket()}
          bots={bots}
          revision={0}
          onClose={onClose}
          onChanged={onChanged}
          {...props}
          {...extra}
        />,
      ),
    );
  await render();
  return {
    container,
    onClose,
    onChanged,
    render,
    async cleanup() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

const q = (container: HTMLElement, selector: string) =>
  container.querySelector(selector) as HTMLElement;
const text = (container: HTMLElement, selector: string) => q(container, selector)?.textContent;
function type(el: HTMLTextAreaElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
const blur = (el: HTMLElement) => el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

it("shows the ticket's title, properties and description in the left pane", async () => {
  const page = await open();
  try {
    expect((q(page.container, '[data-testid="ticket-title"]') as HTMLTextAreaElement).value).toBe(
      "Comp report",
    );
    expect(text(page.container, "h2")).toBe("Comp report");
    expect(text(page.container, '[data-testid="ticket-status"]')).toBe("In review");
    expect(text(page.container, '[data-testid="ticket-owner"]')).toBe("Chief");
    expect(text(page.container, '[data-testid="ticket-priority"]')).toBe("Normal");
    expect(
      (q(page.container, '[data-testid="ticket-description"]') as HTMLTextAreaElement).value,
    ).toBe("Find 3 to 5 comps.");
    expect(page.container.textContent).toContain("NUR-1");
  } finally {
    await page.cleanup();
  }
});

it("renders the owner with the shared Nurling avatar, including its working state", async () => {
  const page = await open();
  try {
    const avatar = q(page.container, '[data-testid="ticket-owner"] [data-testid="bot-avatar"]');
    expect(avatar.dataset.color).toBe("#7c3aed::shape_8");
    expect(avatar.dataset.identity).toBe("bot-1");
    expect(avatar.dataset.status).toBe("running");
  } finally {
    await page.cleanup();
  }
});

it("merges status lines and comments in time order, newest at the bottom", async () => {
  const page = await open();
  try {
    const rows = Array.from(
      page.container.querySelectorAll('[data-testid="ticket-activity"] > li'),
    ).map((row) => row.textContent?.replace(/\s+/g, " ").trim());
    expect(rows).toEqual([
      "You created this and assigned it to Chief5m ago",
      "Chief moved it to Blocked5m ago",
      "Chief5m agoRedfin wants a check",
      "AYou5m agoDone",
      "Chief moved it to In review5m ago",
    ]);
  } finally {
    await page.cleanup();
  }
});

it("shows a Nurling comment with its avatar and a user comment with their initial or picture", async () => {
  const page = await open();
  try {
    const cards = Array.from(
      page.container.querySelectorAll('[data-testid="ticket-activity"] > li'),
    ).filter((row) => row.querySelector("time") && row.className.includes("rounded-xl"));
    expect(
      cards[0]?.querySelector('[data-testid="bot-avatar"]')?.getAttribute("data-identity"),
    ).toBe("bot-1");
    expect(cards[1]?.querySelector('[data-testid="bot-avatar"]')).toBeNull();
    expect(cards[1]?.textContent).toContain("A");
    session.data.user.image = "https://example.test/ada.png";
    await page.render();
    const picture = page.container.querySelectorAll('[data-testid="ticket-activity"] img');
    expect(picture).toHaveLength(1);
    expect(picture[0]?.getAttribute("src")).toBe("https://example.test/ada.png");
  } finally {
    await page.cleanup();
  }
});

it("derives a created line for a ticket that has no recorded history", async () => {
  api.tickets.events.mockResolvedValue([]);
  api.tickets.comments.mockResolvedValue([]);
  const page = await open();
  try {
    expect(text(page.container, '[data-testid="ticket-activity"]')).toContain(
      "You created this and assigned it to Chief",
    );
  } finally {
    await page.cleanup();
  }
});

it("changes status, owner and priority in place", async () => {
  const page = await open();
  try {
    await act(async () => q(page.container, '[data-testid="option-blocked"]').click());
    expect(api.tickets.update).toHaveBeenLastCalledWith({ id: "t1", status: "blocked" });
    await act(async () => q(page.container, '[data-testid="option-bot-2"]').click());
    expect(api.tickets.update).toHaveBeenLastCalledWith({ id: "t1", assigneeBotId: "bot-2" });
    await act(async () => q(page.container, '[data-testid="option-urgent"]').click());
    expect(api.tickets.update).toHaveBeenLastCalledWith({ id: "t1", priority: "urgent" });
    expect(page.onChanged).toHaveBeenCalledTimes(3);
    // The history is read again after the user's own change.
    expect(api.tickets.events.mock.calls.length).toBeGreaterThanOrEqual(4);
  } finally {
    await page.cleanup();
  }
});

it("saves the title and description when the field is left, and only if it changed", async () => {
  const page = await open();
  try {
    const title = q(page.container, '[data-testid="ticket-title"]') as HTMLTextAreaElement;
    await act(async () => blur(title));
    expect(api.tickets.update).not.toHaveBeenCalled();
    await act(async () => type(title, "  Comp report, Elmwood  "));
    await act(async () => blur(title));
    expect(api.tickets.update).toHaveBeenLastCalledWith({
      id: "t1",
      title: "Comp report, Elmwood",
    });

    const description = q(
      page.container,
      '[data-testid="ticket-description"]',
    ) as HTMLTextAreaElement;
    await act(async () => type(description, "Within 1 mile."));
    await act(async () => blur(description));
    expect(api.tickets.update).toHaveBeenLastCalledWith({
      id: "t1",
      description: "Within 1 mile.",
    });

    await act(async () => type(title, "   "));
    await act(async () => blur(title));
    expect(api.tickets.update).toHaveBeenCalledTimes(2);
    expect(title.value).toBe("Comp report");
  } finally {
    await page.cleanup();
  }
});

it("sends a reply, shows it at the bottom, and ignores an empty one", async () => {
  const page = await open();
  try {
    const box = q(page.container, 'textarea[aria-label="Reply"]') as HTMLTextAreaElement;
    const send = q(page.container, 'button[aria-label="Send"]') as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    await act(async () => type(box, "  "));
    expect(send.disabled).toBe(true);
    await act(async () => type(box, "Any update?"));
    expect(send.disabled).toBe(false);
    await act(async () =>
      q(page.container, "form").dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
    expect(api.tickets.comment).toHaveBeenCalledWith({ ticketId: "t1", body: "Any update?" });
    const rows = page.container.querySelectorAll('[data-testid="ticket-activity"] > li');
    expect(rows[rows.length - 1]?.textContent).toContain("Any update?");
    expect(box.value).toBe("");
  } finally {
    await page.cleanup();
  }
});

it("shows a failed reply and keeps the draft", async () => {
  api.tickets.comment.mockRejectedValue(new Error("Could not post"));
  const page = await open();
  try {
    const box = q(page.container, 'textarea[aria-label="Reply"]') as HTMLTextAreaElement;
    await act(async () => type(box, "Hello"));
    await act(async () =>
      q(page.container, "form").dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
    expect(text(page.container, '[role="alert"]')).toContain("Could not post");
    expect(box.value).toBe("Hello");
  } finally {
    await page.cleanup();
  }
});

it("refreshes the feed when a board event bumps the revision", async () => {
  const page = await open();
  try {
    expect(api.tickets.comments).toHaveBeenCalledTimes(1);
    api.tickets.comments.mockResolvedValue([
      ...comments,
      comment("Late news", "2026-10-24T06:00:00.000Z", {
        authorBotId: "bot-1",
        authorName: "Chief",
      }),
    ]);
    api.tickets.events.mockResolvedValue([
      ...events,
      event("e4", "2026-10-24T06:01:00.000Z", { status: "done" }),
    ]);
    await page.render({ revision: 1 });
    expect(api.tickets.comments).toHaveBeenCalledTimes(2);
    const rows = Array.from(
      page.container.querySelectorAll('[data-testid="ticket-activity"] > li'),
    );
    expect(rows.slice(-2).map((row) => row.textContent)).toEqual([
      expect.stringContaining("Late news"),
      expect.stringContaining("Chief moved it to Done"),
    ]);
  } finally {
    await page.cleanup();
  }
});

it("keeps the working state of the owner fresh", async () => {
  vi.useFakeTimers();
  const page = await open();
  try {
    api.bots.list.mockResolvedValue([{ ...bots[0], status: "idle" }, bots[1]]);
    await act(async () => vi.advanceTimersByTimeAsync(4_100));
    const avatar = q(page.container, '[data-testid="ticket-owner"] [data-testid="bot-avatar"]');
    expect(avatar.dataset.status).toBe("idle");
  } finally {
    await page.cleanup();
    vi.useRealTimers();
  }
});

it("lists attached files only when there are some", async () => {
  const page = await open();
  try {
    expect(q(page.container, '[data-testid="ticket-files"]')).toBeNull();
    api.tickets.files.mockResolvedValue([
      {
        id: "a1",
        botId: "bot-1",
        groupId: null,
        runId: "r1",
        name: "comps.csv",
        description: null,
        mimeType: "text/csv",
        size: 10,
        version: 1,
        createdAt: "2026-10-24T04:00:00.000Z",
      },
    ]);
    await page.render({ revision: 1 });
    expect(text(page.container, '[data-testid="ticket-files"]')).toContain("Files");
    const card = q(page.container, '[data-testid="file-card"]');
    expect(card.textContent).toBe("comps.csv");
    expect(card.dataset.bot).toBe("bot-1");
  } finally {
    await page.cleanup();
  }
});
