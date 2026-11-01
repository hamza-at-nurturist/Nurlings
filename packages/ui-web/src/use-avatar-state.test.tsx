// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import type { AvatarTool } from "@rakazo/core";
import { AVATAR_DONE_MS, AVATAR_LONG_RUN_MS } from "@rakazo/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarStateSource } from "./use-avatar-state.js";
import { useAvatarState, useToolSwap } from "./use-avatar-state.js";

let snapshot: unknown;
function Probe({ source, animate = true }: { source: AvatarStateSource; animate?: boolean }) {
  const { state, working } = useAvatarState(source);
  const swap = useToolSwap(working.tool, animate);
  snapshot = { state, long: working.long, look: working.look, swap };
  return null;
}
const mounted: Array<() => void> = [];
async function render(source: AvatarStateSource, animate = true) {
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<Probe source={source} animate={animate} />));
  mounted.push(() => act(() => root.unmount()));
  return (next: AvatarStateSource) => act(async () => root.render(<Probe source={next} />));
}
const read = () =>
  snapshot as {
    state: string;
    long: boolean;
    look: string;
    swap: { shown: AvatarTool; phase: string };
  };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("avatar state timers", () => {
  it("shows done for four seconds after a run completes, then idle", async () => {
    const update = await render({ status: "running" });
    await update({ status: "completed" });
    expect(read().state).toBe("done");
    await act(async () => vi.advanceTimersByTime(AVATAR_DONE_MS - 100));
    expect(read().state).toBe("done");
    await act(async () => vi.advanceTimersByTime(200));
    expect(read().state).toBe("idle");
  });

  it("does not show done for a run that was already completed when it mounted", async () => {
    await render({ status: "completed" });
    expect(read().state).toBe("idle");
  });

  it("turns long after three minutes of continuous work, and a tool swap does not reset it", async () => {
    const update = await render({ status: "running" });
    await act(async () => vi.advanceTimersByTime(AVATAR_LONG_RUN_MS - 60_000));
    await update({ status: "running", tool: "search" });
    expect(read().long).toBe(false);
    await act(async () => vi.advanceTimersByTime(60_100));
    expect(read().long).toBe(true);
    await update({ status: "waiting_input" });
    await update({ status: "running" });
    expect(read().long).toBe(false);
  });
});

describe("tool swap timing", () => {
  it("drops the old prop for 240 ms, then pops the new one in for 500 ms", async () => {
    const update = await render({ status: "running", tool: "write" });
    expect(read().swap).toMatchObject({ shown: "write", phase: "rest" });
    await update({ status: "running", tool: "computer" });
    expect(read().swap).toMatchObject({ shown: "write", phase: "out" });
    await act(async () => vi.advanceTimersByTime(240));
    expect(read().swap).toMatchObject({ shown: "computer", phase: "in" });
    await act(async () => vi.advanceTimersByTime(500));
    expect(read().swap).toMatchObject({ shown: "computer", phase: "rest" });
  });

  it("switches at once for a still avatar", async () => {
    await render({ status: "running", tool: "search" }, false);
    expect(read().swap).toMatchObject({ shown: "search", phase: "rest" });
  });
});

describe("avatar colors", () => {
  it("keeps literal colors in the illustration file only", () => {
    for (const file of [
      "organic-avatar.tsx",
      "organic-avatar-props.tsx",
      "organic-avatar.css",
      "avatar-pointer.ts",
      "use-avatar-state.ts",
    ]) {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], file).toEqual([]);
    }
  });
});
