// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarPip } from "../components/avatar-pip";
import { BotAvatar } from "../components/bot-avatar";
import { mobileLogoAvatarActivity } from "./logo-avatar-activity";

const control = vi.hoisted(() => ({ reduced: false }));

vi.mock("react-native", () => ({
  View: ({
    children,
    testID,
    accessibilityLabel,
    accessibilityRole,
    accessible,
    style,
  }: {
    children?: ReactNode;
    style?: { backgroundColor?: string; borderColor?: string };
    testID?: string;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessible?: boolean;
  }) =>
    createElement(
      "div",
      {
        "data-testid": testID,
        "data-bg": style?.backgroundColor,
        "data-border": style?.borderColor,
        "aria-label": accessibilityLabel,
        "data-role": accessibilityRole,
        "data-accessible": accessible === undefined ? undefined : String(accessible),
      },
      children,
    ),
  Pressable: ({ children }: { children?: ReactNode }) =>
    createElement("button", { type: "button" }, children),
  Image: () => null,
  AppState: { currentState: "active", addEventListener: () => ({ remove: () => undefined }) },
}));
vi.mock("react-native-reanimated", () => {
  const view = ({ children, testID }: { children?: ReactNode; testID?: string }) =>
    createElement("div", { "data-testid": testID }, children);
  return {
    default: { View: view, createAnimatedComponent: (component: unknown) => component },
    cancelAnimation: () => undefined,
    Easing: { in: 0, out: 0, inOut: (v: unknown) => v, quad: 0, cubic: 0, linear: 0 },
    ReduceMotion: { Never: "never" },
    useAnimatedProps: () => ({}),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => control.reduced,
    useSharedValue: <T,>(value: T) => ({ value }),
    withRepeat: (value: unknown) => value,
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});
vi.mock("react-native-svg", () => {
  const element =
    (tag: string) =>
    ({ children, testID, fill }: { children?: ReactNode; testID?: string; fill?: string }) =>
      createElement(tag, { "data-testid": testID, "data-fill": fill }, children);
  return {
    default: element("svg"),
    Circle: element("circle"),
    Ellipse: element("ellipse"),
    G: element("g"),
    Path: element("path"),
    Rect: element("rect"),
  };
});
vi.mock("../components/native-symbol", () => ({ NativeSymbol: () => null }));
vi.mock("./native", () => ({
  useMobileTokens: () => ({
    background: "#FFF",
    foreground: "#141414",
    secondary: "#EEE",
    warning: "#DB941E",
    destructive: "#CE2C31",
    success: "#007041",
    workingDot: "#3FA266",
  }),
}));
vi.mock("./i18n", () => ({ useI18n: () => ({ t: (text: string) => text }) }));

const COLOR = "#2A92FE";

describe("organic avatar states on mobile", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    control.reduced = false;
    mobileLogoAvatarActivity.clear();
    container = document.createElement("div");
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const render = (props: Partial<React.ComponentProps<typeof BotAvatar>> = {}) =>
    act(() =>
      root.render(
        <BotAvatar color={COLOR} identity="bot-1" size={54} motion="running" {...props} />,
      ),
    );
  const has = (id: string) => container.querySelector(`[data-testid="${id}"]`) !== null;
  const label = () => container.querySelector("[aria-label]")?.getAttribute("aria-label");

  const feedTool = (tool: string | undefined) => {
    mobileLogoAvatarActivity.hydrate("test", {
      threadId: "t1",
      cursor: 0,
      botId: "bot-1",
      run: { id: "r1", botId: "bot-1", status: "running", trigger: "user" },
    });
    act(() =>
      mobileLogoAvatarActivity.apply("test", {
        threadId: "t1",
        seq: 1,
        botId: "bot-1",
        runId: "r1",
        type: "agent.tool.called",
        payload: { name: "any_tool", executionId: "e1", ...(tool ? { tool } : {}) },
      }),
    );
  };

  it.each([
    ["waiting_input", "pip-needs", {}],
    ["failed", "pip-blocked", {}],
    ["running", "pip-review", { ticketStatus: "review" }],
    ["idle", "pip-done", { ticketStatus: "done" }],
  ] as const)("shows the %s pip as %s", (status, pip, extra) => {
    render({ status, ...extra });
    expect(has(`avatar-${pip}`)).toBe(true);
  });

  it("shows no pip for an avatar with no status, or a working or idle one", () => {
    render();
    expect(container.querySelector('[data-testid^="avatar-pip"]')).toBeNull();
    render({ status: "running" });
    expect(container.querySelector('[data-testid^="avatar-pip"]')).toBeNull();
  });

  it("shows the pip on a static avatar, with no motion", () => {
    render({ status: "waiting_input", motion: "static" });
    expect(has("avatar-pip-needs")).toBe(true);
    expect(has("avatar-orbit")).toBe(false);
  });

  it("colors the pips with the warning, destructive and success tokens only", () => {
    const fill = (pip: "needs" | "review" | "blocked" | "done") => {
      act(() => root.render(<AvatarPip pip={pip} size={54} />));
      const inner = container.querySelector(`[data-testid="avatar-pip-${pip}"]`)?.firstElementChild;
      return pip === "review" ? inner?.getAttribute("data-border") : inner?.getAttribute("data-bg");
    };
    expect(fill("needs")).toBe("#DB941E");
    expect(fill("review")).toBe("#DB941E");
    expect(fill("blocked")).toBe("#CE2C31");
    expect(fill("done")).toBe("#007041");
  });

  it("keeps the body the Nurling's own color while working", () => {
    render({ status: "running" });
    expect(container.innerHTML).toContain(COLOR);
  });

  it("draws the orbit dot for a working run with no tool, and for an unmapped tool", () => {
    render({ status: "running" });
    expect(has("avatar-orbit")).toBe(true);
    feedTool(undefined);
    render({ status: "running" });
    expect(has("avatar-orbit")).toBe(true);
    expect(has("avatar-prop-write")).toBe(false);
  });

  it.each(["write", "search", "computer"] as const)(
    "draws the %s prop from the tool category",
    (tool) => {
      feedTool(tool);
      render({ status: "running" });
      expect(has(`avatar-prop-${tool}`)).toBe(true);
      expect(has("avatar-orbit")).toBe(false);
    },
  );

  it("ripples while a run is queued", () => {
    render({ status: "queued" });
    expect(has("avatar-ripples")).toBe(true);
  });

  it("draws the progress ring only when a progress value is given", () => {
    render({ status: "running", progress: 0.4 });
    expect(has("avatar-ring")).toBe(true);
    render({ status: "running" });
    expect(has("avatar-ring")).toBe(false);
  });

  it("shows the thinking pulse while the bot writes its reply, and no working dot", () => {
    render({ status: "running", composing: true });
    expect(has("avatar-thinking")).toBe(true);
    expect(container.querySelector('[aria-label="Working"]')).toBeNull();
  });

  it("closes the eyes' state to a sleeping avatar with z's", () => {
    render({ asleep: true });
    expect(has("avatar-sleep")).toBe(true);
  });

  it("keeps a 24 pt avatar and a Reduce Motion avatar still, with only the pip", () => {
    feedTool("write");
    render({ status: "running", size: 24 });
    expect(
      container.querySelector('[data-testid^="avatar-prop"], [data-testid="avatar-orbit"]'),
    ).toBeNull();
    render({ status: "waiting_input", size: 24 });
    expect(has("avatar-pip-needs")).toBe(true);
    control.reduced = true;
    render({ status: "running", size: 54 });
    expect(
      container.querySelector('[data-testid^="avatar-prop"], [data-testid="avatar-orbit"]'),
    ).toBeNull();
    render({ status: "failed", size: 54 });
    expect(has("avatar-pip-blocked")).toBe(true);
  });

  it("draws a prop at 25 pt", () => {
    feedTool("search");
    render({ status: "running", size: 25 });
    expect(has("avatar-prop-search")).toBe(true);
  });

  it("subscribes to the activity store only while its run is active", () => {
    const subscribe = vi.spyOn(mobileLogoAvatarActivity, "subscribe");
    render();
    expect(subscribe).not.toHaveBeenCalled();
    render({ status: "running" });
    expect(subscribe).toHaveBeenCalled();
  });

  it("shows the long-run sweat drop only after three minutes of work", () => {
    vi.useFakeTimers();
    try {
      render({ status: "running" });
      expect(has("avatar-sweat")).toBe(false);
      act(() => vi.advanceTimersByTime(180_100));
      expect(has("avatar-sweat")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("names the avatar with its state, and leaves idle as the name alone", () => {
    render({ name: "Chief" });
    expect(label()).toBe("Chief");
    render({ name: "Chief", status: "running" });
    expect(label()).toBe("Chief, working");
    render({ name: "Chief", status: "running", composing: true });
    expect(label()).toBe("Chief, thinking");
    render({ name: "Chief", status: "waiting_input" });
    expect(label()).toBe("Chief, needs you");
    render({ name: "Chief", ticketStatus: "review" });
    expect(label()).toBe("Chief, in review");
    render({ name: "Chief", status: "failed" });
    expect(label()).toBe("Chief, blocked");
    render({ name: "Chief", ticketStatus: "done" });
    expect(label()).toBe("Chief, done");
    render({ name: "Chief", asleep: true });
    expect(label()).toBe("Chief, asleep");
    expect(container.querySelector("[data-role=image]")).not.toBeNull();
  });

  it("stays out of the accessibility tree without a name", () => {
    render({ status: "running" });
    expect(container.querySelector("[aria-label]")).toBeNull();
  });

  it("adds no touch handling: the gaze is calm and only a pokeable mark is tappable", () => {
    render({ status: "running" });
    expect(container.querySelector("button")).toBeNull();
    render({ status: "running", pokeable: true });
    expect(container.querySelectorAll("button")).toHaveLength(1);
  });

  it("keeps a photo avatar's working dot and gives it no state art", () => {
    render({ color: "data:image/png;base64,AAAA", status: "running", motion: "lazy" });
    expect(container.querySelector('[aria-label="Working"]')).not.toBeNull();
    expect(has("avatar-orbit")).toBe(false);
  });
});
