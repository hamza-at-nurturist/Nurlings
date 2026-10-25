// @vitest-environment jsdom

import type { Bot, TicketListItem } from "@rakazo/contracts";
import type { ReactNode } from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const colors = {
  foreground: "#fff",
  mutedForeground: "#999",
  faintForeground: "#666",
  border: "#222",
  card: "#111",
  muted: "#333",
  warning: "#fa0",
  destructive: "#f00",
  statusWorking: "#09f",
  success: "#0f0",
};

vi.mock("react-native", () => {
  const view =
    (tag: string) => (props: { children?: ReactNode; testID?: string; style?: unknown }) =>
      createElement(
        tag,
        { "data-testid": props.testID, "data-style": JSON.stringify(props.style) },
        props.children,
      );
  return {
    View: view("div"),
    Text: (props: { children?: ReactNode; style?: unknown }) =>
      createElement("span", { "data-style": JSON.stringify(props.style) }, props.children),
    Pressable: (props: {
      children?: ReactNode;
      onPress?: () => void;
      testID?: string;
      accessibilityLabel?: string;
    }) =>
      createElement(
        "button",
        {
          type: "button",
          "data-testid": props.testID,
          "aria-label": props.accessibilityLabel,
          onClick: props.onPress,
        },
        props.children,
      ),
    RefreshControl: () => null,
    StyleSheet: { create: <T,>(styles: T) => styles, hairlineWidth: 1 },
    FlatList: (props: {
      data: unknown[];
      renderItem: (info: { item: unknown }) => ReactNode;
      ListFooterComponent?: ReactNode;
    }) =>
      createElement(
        "div",
        null,
        props.data.map((item, index) =>
          createElement("div", { key: index }, props.renderItem({ item })),
        ),
        props.ListFooterComponent,
      ),
  };
});
vi.mock("@expo/ui/community/menu", () => ({
  MenuView: (props: {
    children?: ReactNode;
    actions: Array<{
      id: string;
      title: string;
      subactions?: Array<{ id: string; title: string; state?: string }>;
    }>;
    onPressAction: (event: { nativeEvent: { event: string } }) => void;
  }) =>
    createElement(
      "div",
      { "data-menu": JSON.stringify(props.actions) },
      props.children,
      createElement("button", {
        type: "button",
        "data-testid": "menu-approve",
        onClick: () => props.onPressAction({ nativeEvent: { event: "approve" } }),
      }),
      createElement("button", {
        type: "button",
        "data-testid": "menu-move-blocked",
        onClick: () => props.onPressAction({ nativeEvent: { event: "move:blocked" } }),
      }),
    ),
}));
vi.mock("../native", () => ({
  useMobileTokens: () => colors,
  useResolvedAppearance: () => "dark",
}));
vi.mock("../i18n", () => ({
  t: (text: string, values?: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? "")),
  useI18n: () => ({
    locale: "en",
    t: (text: string, values?: Record<string, string | number>) =>
      text.replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? "")),
  }),
  dateLocaleForUi: () => "en-US",
}));
vi.mock("../../components/bot-avatar", () => ({ BotAvatar: () => null }));
vi.mock("../../components/native-symbol", () => ({ NativeSymbol: () => null }));
vi.mock("../ripple", () => ({ withAlpha: (color: string) => color }));

import { BoardColumn } from "../../components/nurlings-board/board-column";

const bots = [
  { id: "bot-1", name: "Chief", color: "#8B5CF6", status: "idle" },
  { id: "bot-2", name: "Scout", color: "#22C55E", status: "idle" },
] as unknown as Bot[];

const ticket = (overrides: Partial<TicketListItem>) =>
  ({
    id: "t1",
    ref: "NUR-7",
    title: "Comp report",
    status: "review",
    assigneeBotId: "bot-1",
    needsUser: false,
    startAt: null,
    startHasTime: false,
    dueAt: null,
    dueHasTime: false,
    lastComment: null,
    fileCount: 0,
    workingBotId: null,
    completedAt: null,
    ...overrides,
  }) as TicketListItem;

beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(() => vi.unstubAllGlobals());

function render(
  tickets: TicketListItem[],
  status: TicketListItem["status"],
  extra: Partial<Parameters<typeof BoardColumn>[0]> = {},
) {
  const onAction = vi.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() =>
    root.render(
      createElement(BoardColumn, {
        status,
        tickets,
        older: [],
        showOlder: false,
        onShowOlder: vi.fn(),
        bots,
        timeZone: "UTC",
        width: 320,
        height: 600,
        bottomInset: 0,
        refreshing: false,
        onRefresh: vi.fn(),
        onAction,
        ...extra,
      }),
    ),
  );
  return { container, onAction, unmount: () => act(() => root.unmount()) };
}

it("headlines a column with its name and count, and tints In review with Your turn", () => {
  const { container, unmount } = render([ticket({}), ticket({ id: "t2", ref: "NUR-8" })], "review");
  expect(container.textContent).toContain("In review");
  expect(container.textContent).toContain("2");
  expect(container.textContent).toContain("Your turn");
  unmount();
  const empty = render([], "review");
  expect(empty.container.textContent).not.toContain("Your turn");
  empty.unmount();
});

it("shows the card fields: ref, Needs you, last comment, owner, files, overdue due", () => {
  const { container, unmount } = render(
    [
      ticket({
        status: "blocked",
        needsUser: true,
        lastComment: "County site is down",
        fileCount: 2,
        dueAt: "2020-01-02T23:59:00.000Z",
      }),
    ],
    "blocked",
  );
  const text = container.textContent ?? "";
  for (const part of ["NUR-7", "Needs you", "Comp report", "County site is down", "Chief", "2"]) {
    expect(text).toContain(part);
  }
  expect(container.innerHTML).toContain(colors.destructive);
  unmount();
});

it("shows the working line instead of the last comment while a Nurling works", () => {
  const { container, unmount } = render(
    [ticket({ status: "doing", lastComment: "old news", workingBotId: "bot-2" })],
    "doing",
  );
  expect(container.textContent).toContain("Scout is working…");
  expect(container.textContent).not.toContain("old news");
  unmount();
});

it("offers Approve in the long-press menu only for a ticket in review", () => {
  const review = render([ticket({})], "review");
  const reviewMenu = JSON.parse(
    review.container.querySelector("[data-menu]")!.getAttribute("data-menu")!,
  );
  expect(reviewMenu.map((entry: { id: string }) => entry.id)).toEqual(["move", "approve", "open"]);
  review.unmount();
  const doing = render([ticket({ status: "doing" })], "doing");
  const doingMenu = JSON.parse(
    doing.container.querySelector("[data-menu]")!.getAttribute("data-menu")!,
  );
  expect(doingMenu.map((entry: { id: string }) => entry.id)).toEqual(["move", "open"]);
  doing.unmount();
});

it("reports a menu pick, a tap, and the older row", () => {
  const onShowOlder = vi.fn();
  const rows = render([ticket({})], "review", { older: [ticket({ id: "old" })], onShowOlder });
  act(() =>
    rows.container.querySelector<HTMLButtonElement>('[data-testid="menu-approve"]')!.click(),
  );
  expect(rows.onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: "t1" }), {
    type: "approve",
  });
  act(() =>
    rows.container.querySelector<HTMLButtonElement>('[data-testid="menu-move-blocked"]')!.click(),
  );
  expect(rows.onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: "t1" }), {
    type: "move",
    status: "blocked",
  });
  act(() =>
    rows.container.querySelector<HTMLButtonElement>('[data-testid="board-card-t1"]')!.click(),
  );
  expect(rows.onAction).toHaveBeenLastCalledWith(expect.objectContaining({ id: "t1" }), {
    type: "open",
  });
  expect(rows.container.textContent).toContain("Show 1 older");
  act(() => {
    for (const button of rows.container.querySelectorAll("button")) {
      if (button.textContent?.includes("Show 1 older")) button.click();
    }
  });
  expect(onShowOlder).toHaveBeenCalled();
  rows.unmount();
});
