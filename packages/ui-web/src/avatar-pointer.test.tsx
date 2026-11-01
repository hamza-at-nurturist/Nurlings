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

  it("follows only a nearby pointer and eases off toward the follow radius", async () => {
    const container = await mount(<BotAvatar color="#14B8A6" identity="maya" size={48} />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 48, height: 48, right: 48, bottom: 48 }) as DOMRect;
    const gx = () => Number(svg.style.getPropertyValue("--gx"));
    flush();
    move(24 + 30, 24);
    flush();
    const near = gx();
    move(24 + 90, 24);
    flush();
    const mid = gx();
    move(24 + 400, 24);
    flush();
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(0);
    expect(gx()).toBe(0);
    expect(Number(svg.style.getPropertyValue("--gy"))).toBeCloseTo(0);
  });

  it("makes only the avatars near a shake dizzy, but not asleep ones, then calms them", async () => {
    vi.useFakeTimers();
    const container = await mount(
      <>
        <BotAvatar color="#14B8A6" identity="a" size={48} />
        <BotAvatar color="#14B8A6" identity="b" size={48} asleep />
        <BotAvatar color="#14B8A6" identity="c" size={48} />
      </>,
    );
    const [idle, asleep, far] = [...container.querySelectorAll("svg")];
    const place = (el: Element | undefined, left: number) => {
      el!.getBoundingClientRect = () =>
        ({ left, top: 80, width: 48, height: 48, right: left + 48, bottom: 128 }) as DOMRect;
    };
    place(idle, 100);
    place(asleep, 110);
    place(far, 3000);
    await act(async () => {
      for (let i = 0; i < 12; i += 1) {
        vi.advanceTimersByTime(60);
        move(i % 2 ? 100 : 160, 100);
      }
    });
    expect(idle?.getAttribute("data-dizzy")).toBe("true");
    expect(asleep?.getAttribute("data-dizzy")).toBe("false");
    expect(far?.getAttribute("data-dizzy")).toBe("false");
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(idle?.getAttribute("data-dizzy")).toBe("false");
  });
});

describe("glint on light bodies", () => {
  it("gives a white body a darker glint tone", async () => {
    const container = await mount(
      <>
        <BotAvatar color="#FFFFFF" identity="w" size={48} />
        <BotAvatar color="#14B8A6" identity="t" size={48} />
      </>,
    );
    const [white, teal] = [...container.querySelectorAll("svg")];
    expect(white?.getAttribute("data-glint-tone")).toBe("light");
    expect(teal?.getAttribute("data-glint-tone")).toBeNull();
  });
});

describe("dizzy reset", () => {
  it("calms an avatar that stops following while dizzy, even with other avatars on the page", async () => {
    vi.useFakeTimers();
    const render = (size: number) => (
      <>
        <BotAvatar color="#14B8A6" identity="a" size={size} />
        <BotAvatar color="#14B8A6" identity="b" size={48} />
      </>
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(render(48)));
    const svg = () => container.querySelector("svg") as SVGSVGElement;
    svg().getBoundingClientRect = () =>
      ({ left: 100, top: 80, width: 48, height: 48, right: 148, bottom: 128 }) as DOMRect;
    await act(async () => {
      for (let i = 0; i < 12; i += 1) {
        vi.advanceTimersByTime(60);
        move(i % 2 ? 100 : 160, 100);
      }
    });
    expect(svg().getAttribute("data-dizzy")).toBe("true");
    await act(async () => root.render(render(24)));
    await act(async () => root.render(render(48)));
    expect(svg().getAttribute("data-dizzy")).toBe("false");
    act(() => root.unmount());
    container.remove();
  });
});
