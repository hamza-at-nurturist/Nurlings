// @vitest-environment jsdom

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InboxHeader } from "../../components/inbox-header";
import { notificationOpenTarget, notificationOpenTargetFromLink } from "../notification-open";
import { useHomeHeader } from "../use-home-header";
import { nurlingsBoardPath } from "./links";
import { ticketNotificationRoute } from "./notification";
import { NURLINGS_BOARD_PATH, NURLINGS_TICKET_PATH } from "./routes";

const mobileRoot = path.resolve(import.meta.dirname, "../..");

const mocks = vi.hoisted(() => ({
  enabled: { value: true },
  push: vi.fn(),
  setOptions: vi.fn(),
}));
const { labelled } = vi.hoisted(() => ({
  labelled:
    (tag: string) =>
    ({
      children,
      accessibilityLabel,
      onPress,
    }: {
      children?: ReactNode;
      accessibilityLabel?: string;
      onPress?: () => void;
    }) =>
      createElement(tag, { "aria-label": accessibilityLabel, onClick: onPress }, children),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Pressable: labelled("button"),
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: labelled("span"),
  View: labelled("div"),
}));
vi.mock("@expo/ui/community/menu", () => ({ MenuView: labelled("div") }));
vi.mock("expo-router", () => {
  const router = { push: mocks.push };
  const navigation = { setOptions: mocks.setOptions };
  return { useRouter: () => router, useNavigation: () => navigation };
});
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
vi.mock("../../components/native-symbol", () => ({ NativeSymbol: () => null }));
vi.mock("../appearance", () => ({
  mobileTokens: () => ({}),
  resolveMobileAppearance: () => "light",
}));
vi.mock("../native", () => ({ native: {}, useThemedStyles: () => ({}) }));
vi.mock("../material-icons", () => ({ materialIcons: {} }));
vi.mock("./enabled", () => ({ useNurlingsBoardEnabled: () => mocks.enabled.value }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.push.mockReset();
  mocks.setOptions.mockReset();
  mocks.enabled.value = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function HeaderHost() {
  useHomeHeader({
    nativeHeader: true,
    ready: true,
    hasSession: true,
    initials: "A",
    activityMode: false,
    toggleActivityMode: vi.fn(),
    runCreateAction: vi.fn(),
  });
  return null;
}

function nativeRightItems() {
  act(() => root.render(<HeaderHost />));
  const options = mocks.setOptions.mock.calls.at(-1)![0];
  return options.unstable_headerRightItems() as Array<{
    accessibilityLabel: string;
    onPress?: () => void;
  }>;
}

describe("entries open the Nurlings Board", () => {
  it("is a real path, not the one upstream's board owns", () => {
    expect(NURLINGS_BOARD_PATH).toBe("/nurlings/board");
    expect(NURLINGS_TICKET_PATH).toBe("/nurlings/ticket");
    expect(existsSync(path.join(mobileRoot, "app/nurlings/board.tsx"))).toBe(true);
    expect(existsSync(path.join(mobileRoot, "app/nurlings/ticket.tsx"))).toBe(true);
    expect(existsSync(path.join(mobileRoot, "app/(nurlings)"))).toBe(false);
  });

  it("opens from the native home header only while the board is enabled", () => {
    const on = nativeRightItems();
    expect(on.map((item) => item.accessibilityLabel)).toEqual([
      "Activity",
      "Search",
      "Board",
      "Create",
    ]);
    on.find((item) => item.accessibilityLabel === "Board")!.onPress!();
    expect(mocks.push).toHaveBeenCalledWith(NURLINGS_BOARD_PATH);

    mocks.enabled.value = false;
    mocks.setOptions.mockReset();
    expect(nativeRightItems().map((item) => item.accessibilityLabel)).toEqual([
      "Activity",
      "Search",
      "Create",
    ]);
  });

  it.each([true, false])("opens from the fallback home header when enabled: %s", (enabled) => {
    mocks.enabled.value = enabled;
    act(() =>
      root.render(
        <InboxHeader
          initials="A"
          activityMode={false}
          toggleActivityMode={vi.fn()}
          runCreateAction={vi.fn()}
          columnInsets={{ left: 0, right: 0 }}
        />,
      ),
    );
    const board = container.querySelector<HTMLElement>('[aria-label="Board"]');
    expect(board !== null).toBe(enabled);
    if (board) {
      act(() => board.click());
      expect(mocks.push).toHaveBeenCalledWith(NURLINGS_BOARD_PATH);
    }
  });

  it("opens from Settings, behind the same flag", () => {
    const account = readFileSync(path.join(mobileRoot, "app/(settings)/account.tsx"), "utf8");
    expect(account.replace(/\s+/g, " ")).toContain(
      `title: t\`Board\`, href: "${NURLINGS_BOARD_PATH}",`,
    );
  });

  it("opens the ticket from a push tap and from a rakazo://ticket link", () => {
    const target = { pathname: NURLINGS_TICKET_PATH, params: { ticketId: "t1", spaceId: "s1" } };
    expect(ticketNotificationRoute({ ticketId: "t1", spaceId: "s1" })).toEqual(target);
    expect(notificationOpenTarget({ ticketId: "t1", spaceId: "s1", botId: "b1" })).toEqual(target);
    expect(notificationOpenTargetFromLink("rakazo://ticket?ticketId=t1&spaceId=s1")).toEqual(
      target,
    );
  });

  it("rewrites links written before the move, and leaves everything else alone", () => {
    expect(nurlingsBoardPath("rakazo://board")).toBe("rakazo://nurlings/board");
    expect(nurlingsBoardPath("/board")).toBe("/nurlings/board");
    expect(nurlingsBoardPath("rakazo://ticket?ticketId=t1")).toBe(
      "rakazo://nurlings/ticket?ticketId=t1",
    );
    expect(nurlingsBoardPath("/ticket?ticketId=t1")).toBe("/nurlings/ticket?ticketId=t1");
    expect(nurlingsBoardPath("/nurlings/board")).toBe("/nurlings/board");
    expect(nurlingsBoardPath("/boards")).toBe("/boards");
    expect(nurlingsBoardPath("/thread?id=board")).toBe("/thread?id=board");
  });
});

/** Upstream's native board and its tests stay untouched; nothing else may point at `/board`. */
const UPSTREAM_BOARD_FILES = new Set([
  "app/board.tsx",
  "components/board-list.tsx",
  "components/board-list.ios.tsx",
  "lib/board.ts",
  "lib/board.test.ts",
]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("upstream's board stays unlinked", () => {
  it("nothing in the app navigates to /board or /ticket", () => {
    const offenders = ["app", "components", "lib"]
      .flatMap((dir) => sources(path.join(mobileRoot, dir)))
      .map((file) => path.relative(mobileRoot, file))
      .filter(
        (file) =>
          !UPSTREAM_BOARD_FILES.has(file) &&
          file !== path.join("lib/nurlings-board", "board-links.test.tsx") &&
          file !== path.join("lib/nurlings-board", "links.ts"),
      )
      .filter((file) =>
        /["'](?:\/board|\/ticket)["'?]|href:\s*["']\/(?:board|ticket)/.test(
          readFileSync(path.join(mobileRoot, file), "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });

  it("keeps the upstream board screen in the tree", () => {
    for (const file of UPSTREAM_BOARD_FILES) {
      expect(existsSync(path.join(mobileRoot, file)), file).toBe(true);
    }
  });
});
