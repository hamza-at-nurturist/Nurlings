// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BotAvatar } from "./bot-avatar.js";

const mounted: Array<() => void> = [];
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
});
afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(node));
  mounted.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
}
const flush = () => {
  const run = frames;
  frames = [];
  for (const callback of run) callback(0);
};
const move = (x: number, y: number) =>
  window.dispatchEvent(new MouseEvent("pointermove", { clientX: x, clientY: y }));

describe("shared avatar pointer", () => {
  it("adds one listener for many avatars and removes it with the last one", async () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const container = await mount(
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <BotAvatar key={i} color="#14B8A6" identity={`bot-${i}`} size={48} />
        ))}
      </>,
    );
    const moves = () => add.mock.calls.filter(([type]) => type === "pointermove");
    expect(moves()).toHaveLength(1);
    expect(container.querySelectorAll("svg.rakazo-organic-avatar")).toHaveLength(12);
    mounted.pop()?.();
    expect(remove.mock.calls.filter(([type]) => type === "pointermove")).toHaveLength(1);
  });

  it("does not register avatars of 24px or less", async () => {
    const add = vi.spyOn(window, "addEventListener");
    await mount(<BotAvatar color="#14B8A6" identity="tiny" size={24} />);
    expect(add.mock.calls.filter(([type]) => type === "pointermove")).toHaveLength(0);
  });

  it("batches pointer moves into one frame and renders nothing in React", async () => {
    const renders = vi.fn();
    const container = await mount(<BotAvatar color="#14B8A6" identity="maya" size={48} />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    const observer = new MutationObserver(renders);
    observer.observe(svg, { attributes: true, subtree: true, childList: true });
    flush();
    for (let i = 0; i < 50; i += 1) move(400 + i, 300);
    expect(frames).toHaveLength(1);
    flush();
    await Promise.resolve();
    // Only the two custom properties changed; no element or attribute was rewritten by React.
    expect(svg.style.getPropertyValue("--gx")).not.toBe("");
    const records = observer.takeRecords();
    expect(records.every((record) => record.attributeName === "style")).toBe(true);
    observer.disconnect();
  });

  it("makes avatars dizzy after a shake, but not asleep or thinking ones, then calms them", async () => {
    vi.useFakeTimers();
    const container = await mount(
      <>
        <BotAvatar color="#14B8A6" identity="a" size={48} />
        <BotAvatar color="#14B8A6" identity="b" size={48} asleep />
      </>,
    );
    const [idle, asleep] = [...container.querySelectorAll("svg")];
    await act(async () => {
      for (let i = 0; i < 12; i += 1) {
        vi.advanceTimersByTime(60);
        move(i % 2 ? 100 : 160, 100);
      }
    });
    expect(idle?.getAttribute("data-dizzy")).toBe("true");
    expect(asleep?.getAttribute("data-dizzy")).toBe("false");
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(idle?.getAttribute("data-dizzy")).toBe("false");
  });
});
