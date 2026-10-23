// @vitest-environment jsdom

import type { NestSnapshot } from "@rakazo/contracts";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./rpc", () => ({ rpc: { nest: { snapshot: vi.fn() } } }));

import type { NestSnapshotState } from "./nest-snapshot";
import { useNestSnapshot } from "./nest-snapshot";

const snap = (name: string): NestSnapshot => ({
  nurlings: [
    {
      id: name,
      name,
      title: "",
      color: "#F97316",
      mood: "idle",
      currentTask: null,
      nextRoutine: null,
    },
  ],
  needsYou: [],
});

let visibility: DocumentVisibilityState = "visible";
let latest: NestSnapshotState = { status: "loading" };

function Probe({ load }: { load: () => Promise<NestSnapshot> }) {
  latest = useNestSnapshot(load, 3_000);
  return null;
}

async function mount(load: () => Promise<NestSnapshot>) {
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Probe load={load} />));
  return () => act(async () => root.unmount());
}

const name = () => (latest.status === "ready" ? latest.snapshot.nurlings[0]?.name : latest.status);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  latest = { status: "loading" };
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useNestSnapshot", () => {
  it("loads on mount and refreshes every three seconds", async () => {
    const load = vi.fn().mockResolvedValueOnce(snap("one")).mockResolvedValue(snap("two"));
    const unmount = await mount(load);
    expect(name()).toBe("one");
    await act(async () => void (await vi.advanceTimersByTimeAsync(3_000)));
    expect(load).toHaveBeenCalledTimes(2);
    expect(name()).toBe("two");
    await unmount();
  });

  it("makes no requests while the tab is hidden and refreshes when it becomes visible", async () => {
    visibility = "hidden";
    const load = vi.fn().mockResolvedValue(snap("one"));
    const unmount = await mount(load);
    await act(async () => void (await vi.advanceTimersByTimeAsync(10_000)));
    expect(load).not.toHaveBeenCalled();
    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(load).toHaveBeenCalledTimes(1);
    expect(name()).toBe("one");
    await unmount();
  });

  it("refreshes on window focus", async () => {
    const load = vi.fn().mockResolvedValue(snap("one"));
    const unmount = await mount(load);
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(load).toHaveBeenCalledTimes(2);
    await unmount();
  });

  it("skips a tick while a request is in flight, so responses cannot overtake each other", async () => {
    let resolveFirst: (value: NestSnapshot) => void = () => {};
    const load = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<NestSnapshot>((resolve) => (resolveFirst = resolve)),
      )
      .mockResolvedValue(snap("later"));
    const unmount = await mount(load);
    await act(async () => void (await vi.advanceTimersByTimeAsync(9_000)));
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => resolveFirst(snap("first")));
    expect(name()).toBe("first");
    await act(async () => void (await vi.advanceTimersByTimeAsync(3_000)));
    expect(name()).toBe("later");
    await unmount();
  });

  it("keeps the last snapshot when a refresh fails for a reason that may pass", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(snap("one"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(snap("three"));
    const unmount = await mount(load);
    await act(async () => void (await vi.advanceTimersByTimeAsync(3_000)));
    expect(name()).toBe("one");
    await act(async () => void (await vi.advanceTimersByTimeAsync(3_000)));
    expect(name()).toBe("three");
    await unmount();
  });

  it("stops polling after the page unmounts", async () => {
    const load = vi.fn().mockResolvedValue(snap("one"));
    const unmount = await mount(load);
    await unmount();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
