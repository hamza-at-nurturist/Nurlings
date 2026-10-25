// @vitest-environment jsdom

import type { ComponentProps, ReactNode } from "react";
import { act, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  bots: { list: vi.fn() },
  artifacts: { create: vi.fn() },
  tickets: {
    update: vi.fn(),
    approve: vi.fn(),
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
vi.mock("../../../lib/bootstrap", () => ({ getMaxUploadSizeBytes: () => undefined }));
vi.mock("../../../lib/prepare-image", () => ({
  canPrepareImage: () => false,
  prepareImage: async (file: File) => file,
}));
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
  const Opens = createContext<(open: boolean) => void>(() => {});
  return {
    BotAvatar: (props: { color: string; identity?: string; status?: string; size?: number }) => (
      <span
        data-testid="bot-avatar"
        data-color={props.color}
        data-identity={props.identity}
        data-status={props.status}
      />
    ),
    Badge: (props: ComponentProps<"span">) => <span {...props} />,
    Button: (props: ComponentProps<"button"> & { size?: string }) => {
      const { size: _size, ...rest } = props;
      return <button {...rest} />;
    },
    Dialog: Container,
    DialogContent: ({
      children,
      initialFocus: _initialFocus,
      ...rest
    }: ComponentProps<"div"> & { initialFocus?: unknown }) => <div {...rest}>{children}</div>,
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
    Input: (props: ComponentProps<"input">) => <input {...props} />,
    Popover: ({
      children,
      onOpenChange,
    }: {
      children?: ReactNode;
      onOpenChange: (open: boolean) => void;
    }) => <Opens.Provider value={onOpenChange}>{children}</Opens.Provider>,
    PopoverTrigger: (props: ComponentProps<"button">) => {
      const setOpen = useContext(Opens);
      return <button type="button" {...props} onClick={() => setOpen(true)} />;
    },
    PopoverContent: Container,
    // A calendar whose one day is 4 November 2026, picked as react-day-picker hands it back.
    Calendar: ({ onSelect }: { onSelect: (day: Date) => void }) => (
      <button
        type="button"
        data-testid="calendar-day"
        onClick={() => onSelect(new Date("2026-11-04T05:00:00Z"))}
      />
    ),
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
    needsUser: false,
    startAt: null,
    startHasTime: false,
    dueAt: null,
    dueHasTime: false,
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
    mentions: [],
    attachments: [],
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
  api.tickets.approve.mockResolvedValue({});
  api.artifacts.create.mockImplementation(async ({ name }: { name: string }) => ({
    id: `art-${name}`,
  }));
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: () => "blob:preview", revokeObjectURL: () => {} }),
  );
  api.tickets.comment.mockImplementation(async ({ body }: { body: string }) =>
    comment("sent", "2026-10-24T05:00:00.000Z", { body }),
  );
}
beforeEach(() => {
  for (const group of [api.bots, api.tickets, api.artifacts])
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
          timeZone="America/New_York"
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
    // A type the shared card cannot preview gets the ticket's own card, with a short type.
    expect(text(page.container, '[data-testid="ticket-file"]')).toContain("comps.csv");
    expect(text(page.container, '[data-testid="ticket-file"]')).toContain("CSV · 10 B");
    expect(text(page.container, '[data-testid="ticket-file"]')).not.toContain("text/csv");
  } finally {
    await page.cleanup();
  }
});

const key = (el: HTMLElement, name: string) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
const options = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-testid="mention-option"]')).map(
    (node) => node.textContent,
  );

it("shows a comment's mentions as chips: tinted by each Nurling's own hex and neutral for a user", async () => {
  api.tickets.comments.mockResolvedValue([
    comment("m1", "2026-10-24T05:00:00.000Z", {
      body: "Hi @Chief and @Scout, and @Ada\nsecond line",
      mentions: [
        { kind: "bot", id: "bot-1" },
        { kind: "bot", id: "bot-2" },
        { kind: "user", id: "user-1" },
      ],
    }),
    comment("m2", "2026-10-24T05:01:00.000Z", { body: "**plain** comment" }),
  ]);
  const page = await open();
  try {
    const chips = Array.from(
      page.container.querySelectorAll<HTMLElement>('[data-testid="mention-chip"]'),
    );
    expect(chips.map((chip) => chip.textContent)).toEqual(["Chief", "Scout", "Ada"]);
    expect(chips.map((chip) => chip.dataset.mentionColor)).toEqual(["#7c3aed", "#22c55e", ""]);
    expect(chips[0]?.style.color).toBe("rgb(124, 58, 237)");
    expect(chips[0]?.style.backgroundColor).toContain("color-mix");
    expect(chips[2]?.className).toContain("bg-accent");
    const card = chips[0]!.closest("li")!;
    expect(card.querySelector("p")?.textContent).toContain("second line");
    expect(card.querySelector("p")?.className).toContain("whitespace-pre-wrap");
    // A comment without mentions is still markdown.
    const plain = Array.from(page.container.querySelectorAll("li")).find((row) =>
      row.textContent?.includes("**plain** comment"),
    )!;
    expect(plain.querySelector('[data-testid="mention-chip"]')).toBeNull();
    expect(plain.querySelector("p")).toBeNull();
  } finally {
    await page.cleanup();
  }
});

it("opens a picker of the space's Nurlings on @, narrows it, and adds a chip and the @Name text", async () => {
  const page = await open();
  try {
    const box = q(page.container, 'textarea[aria-label="Reply"]') as HTMLTextAreaElement;
    expect(q(page.container, '[data-testid="mention-picker"]')).toBeNull();
    await act(async () => type(box, "Hi @"));
    expect(options(page.container)).toEqual(["Chief", "Scout"]);
    const avatars = page.container.querySelectorAll(
      '[data-testid="mention-option"] [data-testid="bot-avatar"]',
    );
    expect(Array.from(avatars).map((node) => (node as HTMLElement).dataset.identity)).toEqual([
      "bot-1",
      "bot-2",
    ]);
    await act(async () => type(box, "Hi @sc"));
    expect(options(page.container)).toEqual(["Scout"]);
    await act(async () => key(box, "Enter"));
    expect(box.value).toBe("Hi @Scout ");
    expect(q(page.container, '[data-testid="mention-picker"]')).toBeNull();
    const chips = page.container.querySelectorAll('[data-testid="mention-chip"]');
    expect(Array.from(chips).map((chip) => chip.textContent)).toEqual(["Scout"]);
    expect(api.tickets.comment).not.toHaveBeenCalled();
  } finally {
    await page.cleanup();
  }
});

it("puts the caret right after a mention picked mid-text, before the next keystroke", async () => {
  const page = await open();
  try {
    const box = q(page.container, 'textarea[aria-label="Reply"]') as HTMLTextAreaElement;
    box.focus();
    await act(async () => type(box, "Hi @sc tail"));
    await act(async () => {
      box.setSelectionRange(6, 6);
      box.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    });
    expect(options(page.container)).toEqual(["Scout"]);
    await act(async () => key(box, "Enter"));
    expect(box.value).toBe("Hi @Scout  tail");
    // No frame has run yet: the caret is already after "@Scout ", not at the end of the text.
    expect([box.selectionStart, box.selectionEnd]).toEqual([10, 10]);
  } finally {
    await page.cleanup();
  }
});

it("moves through the picker with the arrow keys and closes it with Escape without closing the dialog", async () => {
  const page = await open();
  try {
    const box = q(page.container, 'textarea[aria-label="Reply"]') as HTMLTextAreaElement;
    await act(async () => type(box, "@"));
    const selected = () => q(page.container, '[role="option"][aria-selected="true"]')?.textContent;
    expect(selected()).toBe("Chief");
    await act(async () => key(box, "ArrowDown"));
    expect(selected()).toBe("Scout");
    await act(async () => key(box, "ArrowDown"));
    expect(selected()).toBe("Chief");
    await act(async () => key(box, "ArrowUp"));
    expect(selected()).toBe("Scout");
    await act(async () => key(box, "Escape"));
    expect(q(page.container, '[data-testid="mention-picker"]')).toBeNull();
    expect(box.value).toBe("@");
    // Enter now sends, as the picker is closed.
    await act(async () => key(box, "Enter"));
    expect(api.tickets.comment).toHaveBeenCalledWith({ ticketId: "t1", body: "@" });
  } finally {
    await page.cleanup();
  }
});

it("sends the mentions that are still in the text, and none when the @Name was deleted or the chip removed", async () => {
  const page = await open();
  try {
    const box = q(page.container, 'textarea[aria-label="Reply"]') as HTMLTextAreaElement;
    const form = () => q(page.container, "form");
    const submit = () =>
      form().dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await act(async () => type(box, "@sc"));
    await act(async () => key(box, "Tab"));
    await act(async () => type(box, `${box.value}can you check?`));
    await act(async () => submit());
    expect(api.tickets.comment).toHaveBeenLastCalledWith({
      ticketId: "t1",
      body: "@Scout can you check?",
      mentions: [{ kind: "bot", id: "bot-2" }],
    });
    expect(page.container.querySelectorAll('[data-testid="mention-chip"]')).toHaveLength(0);

    // The user deletes the @Name but leaves the chip: the mention is not sent.
    await act(async () => type(box, "@sc"));
    await act(async () => key(box, "Enter"));
    await act(async () => type(box, "just a note"));
    await act(async () => submit());
    expect(api.tickets.comment).toHaveBeenLastCalledWith({ ticketId: "t1", body: "just a note" });

    // Removing the chip drops the mention while the text stays.
    await act(async () => type(box, "@ch"));
    await act(async () => key(box, "Enter"));
    await act(async () => q(page.container, 'button[aria-label="Remove mention Chief"]').click());
    expect(page.container.querySelectorAll('[data-testid="mention-chip"]')).toHaveLength(0);
    await act(async () => submit());
    expect(api.tickets.comment).toHaveBeenLastCalledWith({ ticketId: "t1", body: "@Chief " });
  } finally {
    await page.cleanup();
  }
});

it("does not open the picker for an @ inside a word", async () => {
  const page = await open();
  try {
    const box = q(page.container, 'textarea[aria-label="Reply"]') as HTMLTextAreaElement;
    await act(async () => type(box, "write to me@"));
    expect(q(page.container, '[data-testid="mention-picker"]')).toBeNull();
  } finally {
    await page.cleanup();
  }
});

it("offers Approve only while the ticket is in review", async () => {
  const page = await open();
  try {
    expect(text(page.container, '[data-testid="ticket-approve"]')).toBe("Approve");
    for (const status of ["todo", "doing", "blocked", "done", "closed"] as const) {
      await page.render({ ticket: makeTicket({ status }) });
      expect(q(page.container, '[data-testid="ticket-approve"]')).toBeNull();
    }
  } finally {
    await page.cleanup();
  }
});

it("approves the ticket and reads it again", async () => {
  const page = await open();
  try {
    const before = api.tickets.events.mock.calls.length;
    await act(async () => q(page.container, '[data-testid="ticket-approve"]').click());
    expect(api.tickets.approve).toHaveBeenCalledWith({ id: "t1" });
    expect(api.tickets.update).not.toHaveBeenCalled();
    expect(page.onChanged).toHaveBeenCalledOnce();
    expect(api.tickets.events.mock.calls.length).toBeGreaterThan(before);
  } finally {
    await page.cleanup();
  }
});

it("shows a refused approval and still refreshes the ticket", async () => {
  api.tickets.approve.mockRejectedValue(new Error("Only a ticket in review can be approved."));
  const page = await open();
  try {
    await act(async () => q(page.container, '[data-testid="ticket-approve"]').click());
    expect(text(page.container, '[role="alert"]')).toContain("Only a ticket in review");
    expect(page.onChanged).toHaveBeenCalledOnce();
  } finally {
    await page.cleanup();
  }
});

it("says who approved it in the feed", async () => {
  api.tickets.events.mockResolvedValue([
    ...events,
    event("e4", "2026-10-24T05:00:00.000Z", {
      kind: "approved",
      status: "done",
      actorBotId: null,
      actorUserId: "user-1",
      actorName: "Ada",
    }),
  ]);
  const page = await open();
  try {
    expect(text(page.container, '[data-testid="ticket-activity"]')).toContain("You approved it");
  } finally {
    await page.cleanup();
  }
});

it("shows Needs you only while the ticket needs the user", async () => {
  const page = await open({ ticket: makeTicket({ needsUser: true }) });
  try {
    expect(text(page.container, '[data-testid="ticket-needs-you"]')).toBe("Needs you");
    await page.render({ ticket: makeTicket({ needsUser: false }) });
    expect(q(page.container, '[data-testid="ticket-needs-you"]')).toBeNull();
  } finally {
    await page.cleanup();
  }
});

const fileOf = (name: string, type = "text/plain") => new File(["data"], name, { type });
async function pick(container: HTMLElement, files: File[]) {
  const input = q(container, '[data-testid="reply-file-input"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: files, configurable: true });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
}
const submit = (container: HTMLElement) =>
  act(async () => {
    q(container, "form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
const staged = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-testid="reply-files"] span')).map(
    (node) => node.textContent,
  );

it("stages picked files, uploads them for the owner on send, then posts the comment", async () => {
  const page = await open();
  try {
    expect(q(page.container, 'button[aria-label="Attach file"]')).not.toBeNull();
    await pick(page.container, [fileOf("brief.txt"), fileOf("front.png", "image/png")]);
    expect(staged(page.container)).toEqual(["brief.txt", "front.png"]);
    expect(api.artifacts.create).not.toHaveBeenCalled();
    // Files alone are enough to send.
    expect((q(page.container, 'button[aria-label="Send"]') as HTMLButtonElement).disabled).toBe(
      false,
    );
    await submit(page.container);
    await vi.waitFor(() => expect(api.tickets.comment).toHaveBeenCalled());
    expect(
      api.artifacts.create.mock.calls.map(([input]) => [input.botId, input.name, input.mimeType]),
    ).toEqual([
      ["bot-1", "brief.txt", "text/plain"],
      ["bot-1", "front.png", "image/png"],
    ]);
    expect(api.artifacts.create.mock.invocationCallOrder[1]).toBeLessThan(
      api.tickets.comment.mock.invocationCallOrder[0]!,
    );
    expect(api.tickets.comment).toHaveBeenCalledWith({
      ticketId: "t1",
      body: "",
      artifactIds: ["art-brief.txt", "art-front.png"],
    });
    expect(q(page.container, '[data-testid="reply-files"]')).toBeNull();
  } finally {
    await page.cleanup();
  }
});

it("keeps picked files when the input is cleared before the staged list updates", async () => {
  const page = await open();
  try {
    const input = q(page.container, '[data-testid="reply-file-input"]') as HTMLInputElement;
    // As in a browser, clearing the input empties the list the change event carried.
    let current: File[] = [];
    Object.defineProperty(input, "files", { get: () => current, configurable: true });
    Object.defineProperty(input, "value", {
      get: () => "",
      set: () => {
        current.length = 0;
      },
      configurable: true,
    });
    // Two picks in one batch: the second update is not applied right away.
    await act(async () => {
      for (const name of ["first.txt", "second.txt"]) {
        current = [fileOf(name)];
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    expect(staged(page.container)).toEqual(["first.txt", "second.txt"]);
  } finally {
    await page.cleanup();
  }
});

it("skips files over the count or of unknown types, and removes a staged one", async () => {
  const page = await open();
  try {
    await pick(
      page.container,
      ["a", "b", "c", "d", "e"].map((name) => fileOf(`${name}.txt`)),
    );
    expect(staged(page.container)).toEqual(["a.txt", "b.txt", "c.txt", "d.txt"]);
    expect(page.container.textContent).toContain("Skipped e.txt (max 4 attachments)");
    await act(async () => q(page.container, 'button[aria-label="Remove b.txt"]').click());
    expect(staged(page.container)).toEqual(["a.txt", "c.txt", "d.txt"]);
    await pick(page.container, [fileOf("tool.exe", "application/x-msdownload")]);
    expect(page.container.textContent).toContain("Skipped tool.exe");
  } finally {
    await page.cleanup();
  }
});

it("keeps the draft and the files when an upload fails", async () => {
  api.artifacts.create.mockRejectedValueOnce(new Error("Upload failed"));
  const page = await open();
  try {
    await pick(page.container, [fileOf("brief.txt")]);
    await submit(page.container);
    await vi.waitFor(() =>
      expect(text(page.container, '[role="alert"]')).toContain("Upload failed"),
    );
    expect(api.tickets.comment).not.toHaveBeenCalled();
    expect(staged(page.container)).toEqual(["brief.txt"]);
    expect(text(page.container, '[role="alert"]')).toContain("Upload failed");
  } finally {
    await page.cleanup();
  }
});

function drag(target: Element, type: "dragover" | "drop", files: File[]) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { types: ["Files"], items: files.map(() => ({ kind: "file" })), files },
  });
  target.dispatchEvent(event);
  return event;
}

it("stages files dropped anywhere on the ticket and outlines it while dragging", async () => {
  const page = await open();
  try {
    const target = q(page.container, '[data-testid="ticket-description"]');
    const over = await act(async () =>
      drag(target, "dragover", [fileOf("plan.pdf", "application/pdf")]),
    );
    // Taking the drag over is what lets the browser drop here.
    expect(over.defaultPrevented).toBe(true);
    expect(page.container.querySelector("[data-dragging]")).not.toBeNull();
    await act(async () => {
      drag(target, "drop", [fileOf("plan.pdf", "application/pdf")]);
    });
    expect(page.container.querySelector("[data-dragging]")).toBeNull();
    expect(staged(page.container)).toEqual(["plan.pdf"]);
    expect(api.artifacts.create).not.toHaveBeenCalled();
  } finally {
    await page.cleanup();
  }
});

it("offers no attaching on a ticket without an owner", async () => {
  const page = await open({ ticket: makeTicket({ assigneeBotId: null }) });
  try {
    expect(q(page.container, 'button[aria-label="Attach file"]')).toBeNull();
    await act(async () => {
      drag(q(page.container, '[data-testid="ticket-description"]'), "drop", [fileOf("plan.pdf")]);
    });
    expect(q(page.container, '[data-testid="reply-files"]')).toBeNull();
  } finally {
    await page.cleanup();
  }
});

it("shows a comment's files and labels each file with who added it", async () => {
  const artifact = (id: string, runId: string | null) => ({
    id,
    botId: "bot-1",
    groupId: null,
    runId,
    name: `${id}.csv`,
    description: null,
    mimeType: "text/csv",
    size: 10,
    version: 1,
    createdAt: "2026-10-24T04:00:00.000Z",
  });
  api.tickets.files.mockResolvedValue([artifact("upload", null), artifact("report", "r1")]);
  api.tickets.comments.mockResolvedValue([
    comment("Here is the brief", "2026-10-24T03:50:00.000Z", {
      attachments: [
        { kind: "file", artifactId: "upload", name: "upload.csv", mimeType: "text/csv", size: 10 },
      ],
    }),
  ]);
  const page = await open();
  try {
    // The comment's file uses the ticket's own card, with a short type.
    const feed = text(page.container, '[data-testid="ticket-activity"]');
    expect(feed).toContain("upload.csv");
    expect(feed).toContain("CSV · 10 B");
    expect(feed).not.toContain("text/csv");
    const labels = Array.from(
      page.container.querySelectorAll('[data-testid="ticket-file"] figcaption'),
    ).map((node) => node.textContent);
    expect(labels).toEqual(["You", "Chief"]);
  } finally {
    await page.cleanup();
  }
});

describe("start and due", () => {
  // Monday 26 October 2026, noon in New York.
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-10-26T16:00:00Z"), toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());
  const button = (container: HTMLElement, label: string) =>
    [...container.querySelectorAll("button")].find((el) => el.textContent === label)!;

  it("shows dates short, with a passed due in the destructive color", async () => {
    const page = await open({
      ticket: makeTicket({
        status: "doing",
        startAt: "2026-10-27T13:00:00.000Z",
        dueAt: "2026-10-25T19:00:00.000Z",
        dueHasTime: true,
      }),
    });
    try {
      expect(text(page.container, '[data-testid="ticket-start"]')).toBe("Tomorrow");
      const due = q(page.container, '[data-testid="ticket-due"]');
      expect(due.textContent).toBe("Yesterday 3 PM");
      expect(due.className).toContain("text-destructive");
    } finally {
      await page.cleanup();
    }
  });

  it("sets a date from a quick pick or the calendar, in the user's timezone", async () => {
    const page = await open();
    try {
      await act(async () => q(page.container, '[data-testid="ticket-due"]').click());
      await act(async () => button(page.container, "Next week").click());
      expect(api.tickets.update).toHaveBeenLastCalledWith({ id: "t1", due: "2026-11-02" });
      await act(async () => q(page.container, '[data-testid="ticket-start"]').click());
      await act(async () => q(page.container, '[data-testid="calendar-day"]').click());
      expect(api.tickets.update).toHaveBeenLastCalledWith({ id: "t1", start: "2026-11-04" });
    } finally {
      await page.cleanup();
    }
  });

  it("adds a time only when asked, and clears with No date", async () => {
    const page = await open({ ticket: makeTicket({ dueAt: "2026-11-05T04:59:00.000Z" }) });
    try {
      expect(q(page.container, '[data-testid="ticket-due-time"]')).toBeNull();
      await act(async () => q(page.container, '[data-testid="ticket-due"]').click());
      await act(async () => button(page.container, "Add time").click());
      const time = q(page.container, '[data-testid="ticket-due-time"]') as HTMLInputElement;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
          time,
          "15:00",
        );
        time.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => blur(time));
      expect(api.tickets.update).toHaveBeenLastCalledWith({ id: "t1", due: "2026-11-04T15:00" });
      await act(async () => button(page.container, "No date").click());
      expect(api.tickets.update).toHaveBeenLastCalledWith({ id: "t1", due: null });
    } finally {
      await page.cleanup();
    }
  });

  it("keeps the shared card for files it previews", async () => {
    api.tickets.files.mockResolvedValue([
      {
        id: "a2",
        botId: "bot-1",
        groupId: null,
        runId: "r1",
        name: "report.pdf",
        description: null,
        mimeType: "application/pdf",
        size: 10,
        version: 1,
        createdAt: "2026-10-24T04:00:00.000Z",
      },
    ]);
    const page = await open();
    try {
      expect(text(page.container, '[data-testid="file-card"]')).toBe("report.pdf");
    } finally {
      await page.cleanup();
    }
  });
});
