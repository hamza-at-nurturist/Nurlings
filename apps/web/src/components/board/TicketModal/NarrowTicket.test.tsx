// @vitest-environment jsdom

import type { ComponentProps, ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  bots: { list: vi.fn() },
  artifacts: { create: vi.fn(), get: vi.fn() },
  tickets: {
    update: vi.fn(),
    approve: vi.fn(),
    comment: vi.fn(),
    comments: vi.fn(),
    events: vi.fn(),
    files: vi.fn(),
    runs: vi.fn(),
  },
}));
vi.mock("../../../lib/rpc", () => ({ rpc: api }));
vi.mock("../../../lib/bootstrap", () => ({ getMaxUploadSizeBytes: () => undefined }));
vi.mock("../../../lib/auth", () => ({
  authClient: { useSession: () => ({ data: { user: { id: "user-1", name: "Ada" } } }) },
}));
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
  ArtifactFileCard: (props: { name: string }) => <div data-testid="file-card">{props.name}</div>,
}));
vi.mock("../../../pages/shell/chat-shared", () => ({ FALLBACK_BOT_COLOR: "#111111" }));

import type { Artifact, Bot, Ticket, TicketComment } from "@rakazo/contracts";
import { ACTIVITY_SEEN_KEY } from "./activity-seen";
import { TicketModal } from "./TicketModal";

const bots = [{ id: "bot-1", name: "Chief", color: "#7c3aed", status: "idle" }] as unknown as Bot[];

function makeTicket(patch: Partial<Ticket> = {}): Ticket {
  return {
    id: "t1",
    boardId: "b1",
    spaceId: "s1",
    number: 7,
    ref: "NUR-7",
    title: "Comp report for 4521 Elmwood Ave",
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

function comment(id: string, createdAt: string, patch: Partial<TicketComment> = {}): TicketComment {
  return {
    id,
    ticketId: "t1",
    body: id,
    authorBotId: "bot-1",
    authorUserId: "user-1",
    authorName: "Chief",
    mentions: [],
    attachments: [],
    createdAt,
    updatedAt: createdAt,
    ...patch,
  };
}

function file(id: string, name: string, mimeType: string): Artifact {
  return {
    id,
    botId: "bot-1",
    runId: "run-1",
    name,
    mimeType,
    size: 10,
    createdAt: "2026-10-24T04:00:00.000Z",
  } as unknown as Artifact;
}

function stubWidth(narrow: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: narrow,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

const body = () => document.body;
const byTestId = (id: string) => body().querySelector(`[data-testid="${id}"]`);
const tabNamed = (name: string) =>
  [...body().querySelectorAll<HTMLElement>("[role='tab']")].find((tab) =>
    tab.textContent?.startsWith(name),
  );

let cleanup: (() => Promise<void>) | undefined;

async function open(props: Partial<ComponentProps<typeof TicketModal>> = {}) {
  const onClose = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (extra: Partial<ComponentProps<typeof TicketModal>> = {}) =>
    act(async () =>
      root.render(
        <TicketModal
          ticket={makeTicket()}
          bots={bots}
          timeZone="UTC"
          revision={0}
          onClose={onClose}
          onChanged={async () => {}}
          {...props}
          {...extra}
        />,
      ),
    );
  await render();
  cleanup = async () => {
    await act(async () => root.unmount());
    container.remove();
  };
  return { onClose, render };
}

async function click(element: Element | null | undefined) {
  expect(element).toBeTruthy();
  await act(async () => (element as HTMLElement).click());
}

function touch(target: Element, type: "touchstart" | "touchend", x: number) {
  const point = { clientX: x, clientY: 100, target };
  const event = new Event(type, { bubbles: true }) as Event & Record<string, unknown>;
  event.touches = type === "touchstart" ? [point] : [];
  event.changedTouches = [point];
  target.dispatchEvent(event);
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  stubWidth(true);
  window.localStorage.clear();
  api.bots.list.mockResolvedValue(bots);
  api.tickets.events.mockResolvedValue([]);
  api.tickets.comments.mockResolvedValue([
    comment("Report attached, flips marked.", "2026-10-24T04:17:00.000Z"),
  ]);
  api.tickets.files.mockResolvedValue([]);
  api.tickets.runs.mockResolvedValue([]);
  api.tickets.approve.mockResolvedValue({});
  api.tickets.comment.mockImplementation(async ({ body }: { body: string }) =>
    comment("sent", "2026-10-24T05:00:00.000Z", { body, authorBotId: null, authorName: "Ada" }),
  );
});

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("narrow ticket sheet", () => {
  it("opens on the Ticket tab with the ref, chips and no expand or close", async () => {
    await open();
    expect(byTestId("ticket-sheet")).toBeTruthy();
    expect(tabNamed("Ticket")?.getAttribute("aria-selected")).toBe("true");
    expect(byTestId("ticket-sheet")?.textContent).toContain("NUR-7");
    expect(byTestId("ticket-chips")).toBeTruthy();
    expect(byTestId("ticket-fullscreen")).toBeNull();
    expect(body().querySelector("[data-slot='dialog-close']")).toBeNull();
  });

  it("shows the ticket title in the header on Activity", async () => {
    await open();
    await click(tabNamed("Activity"));
    expect(byTestId("ticket-sheet-title")?.textContent).toBe("Comp report for 4521 Elmwood Ave");
  });

  it("switches tabs by swiping, but not from inside a field", async () => {
    await open();
    const ticketTab = byTestId("ticket-tab") as Element;
    await act(async () => {
      touch(ticketTab, "touchstart", 300);
      touch(ticketTab, "touchend", 150);
    });
    expect(tabNamed("Activity")?.getAttribute("aria-selected")).toBe("true");
    const reply = body().querySelector("textarea[aria-label='Reply']") as Element;
    await act(async () => {
      touch(reply, "touchstart", 50);
      touch(reply, "touchend", 250);
    });
    expect(tabNamed("Activity")?.getAttribute("aria-selected")).toBe("true");
  });

  it("closes from back", async () => {
    const { onClose } = await open();
    await click(byTestId("ticket-back"));
    expect(onClose).toHaveBeenCalled();
  });

  it("pins Approve only while in review", async () => {
    const { render } = await open();
    await click(byTestId("ticket-approve"));
    expect(api.tickets.approve).toHaveBeenCalledWith({ id: "t1" });
    await render({ ticket: makeTicket({ status: "doing" }) });
    expect(byTestId("ticket-approve")).toBeNull();
  });

  it("opens Activity from the latest comment", async () => {
    await open();
    const latest = byTestId("ticket-latest-activity");
    expect(latest?.textContent).toContain("Chief: Report attached, flips marked.");
    await click(latest);
    expect(tabNamed("Activity")?.getAttribute("aria-selected")).toBe("true");
  });

  it("shows no latest-activity row without comments", async () => {
    api.tickets.comments.mockResolvedValue([]);
    await open();
    expect(byTestId("ticket-latest-activity")).toBeNull();
  });

  it("keeps a reply draft across tabs", async () => {
    await open();
    await click(tabNamed("Activity"));
    const reply = body().querySelector<HTMLTextAreaElement>("textarea[aria-label='Reply']");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(reply, "Looks good");
      reply?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(tabNamed("Ticket"));
    await click(tabNamed("Activity"));
    expect(body().querySelector<HTMLTextAreaElement>("textarea[aria-label='Reply']")?.value).toBe(
      "Looks good",
    );
  });

  it("uses 16px text and 44px controls in the reply box", async () => {
    await open();
    const reply = body().querySelector("textarea[aria-label='Reply']");
    expect(reply?.className).toContain("text-base");
    expect(body().querySelector("[aria-label='Send']")?.className).toContain("size-11");
  });

  it("counts new items until Activity opens, then remembers", async () => {
    window.localStorage.setItem(
      ACTIVITY_SEEN_KEY,
      JSON.stringify({ t1: "2026-10-24T04:00:00.000Z" }),
    );
    await open();
    expect(byTestId("activity-unseen")?.textContent).toBe("1");
    await click(tabNamed("Activity"));
    expect(byTestId("activity-unseen")).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(ACTIVITY_SEEN_KEY) ?? "{}").t1).toBe(
      "2026-10-24T04:17:00.000Z",
    );
  });

  it("starts a never-opened ticket at zero", async () => {
    await open();
    expect(byTestId("activity-unseen")).toBeNull();
  });

  it("puts images in a three-column grid and other files in full-width cards", async () => {
    api.tickets.files.mockResolvedValue([
      file("a1", "front.jpg", "image/jpeg"),
      file("a2", "summary.pdf", "application/pdf"),
    ]);
    api.artifacts.get.mockResolvedValue({ contentBase64: btoa("jpg"), mimeType: "image/jpeg" });
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: () => "blob:front", revokeObjectURL: () => {} }),
    );
    await open();
    expect(byTestId("ticket-images")?.className).toContain("grid-cols-3");
    expect(byTestId("ticket-file")?.textContent).toContain("summary.pdf");
    const thumbnail = body().querySelector("[data-testid='ticket-image'][aria-label='front.jpg']");
    expect(thumbnail?.querySelector("img")?.getAttribute("src")).toBe("blob:front");
    await click(thumbnail);
    const viewer = byTestId("ticket-image-viewer");
    expect(viewer?.querySelector("img[alt='front.jpg']")).toBeTruthy();
    await click(viewer?.querySelector("[aria-label='Close image']"));
    expect(byTestId("ticket-image-viewer")).toBeNull();
  });
});

describe("wide ticket modal", () => {
  it("keeps two panes, expand and the activity always seen", async () => {
    stubWidth(false);
    window.localStorage.setItem(
      ACTIVITY_SEEN_KEY,
      JSON.stringify({ t1: "2026-10-24T04:00:00.000Z" }),
    );
    await open();
    expect(byTestId("ticket-sheet")).toBeNull();
    expect(byTestId("ticket-fullscreen")).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(ACTIVITY_SEEN_KEY) ?? "{}").t1).toBe(
      "2026-10-24T04:17:00.000Z",
    );
  });
});
