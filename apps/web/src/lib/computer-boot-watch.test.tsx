// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMPUTER_BOOT_WATCH_MS, useComputerBootWatch } from "./computer-boot-watch";

type Props = {
  botId?: string;
  watching: boolean;
  refresh: (botId: string) => Promise<unknown>;
  maxMs?: number;
};

function Probe({ botId = "bot-1", watching, refresh, maxMs }: Props) {
  useComputerBootWatch(botId, watching, refresh, COMPUTER_BOOT_WATCH_MS, maxMs);
  return null;
}

let visibility: DocumentVisibilityState = "visible";

async function mount(initial: Props) {
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Probe {...initial} />));
  return {
    rerender: (next: Props) => act(async () => root.render(<Probe {...next} />)),
    unmount: () => act(async () => root.unmount()),
  };
}

const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useComputerBootWatch", () => {
  it("asks again every three seconds while watching, and stops when the caller stops watching", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const view = await mount({ watching: true, refresh });
    expect(refresh).not.toHaveBeenCalled();
    await advance(3_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith("bot-1");
    await advance(6_000);
    expect(refresh).toHaveBeenCalledTimes(3);
    // The status came back as running, so the caller stops watching.
    await view.rerender({ watching: false, refresh });
    await advance(30_000);
    expect(refresh).toHaveBeenCalledTimes(3);
    await view.unmount();
  });

  it("makes no requests when it is not watching", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const view = await mount({ watching: false, refresh });
    await advance(30_000);
    expect(refresh).not.toHaveBeenCalled();
    await view.unmount();
  });

  it("makes no requests without a bot", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const root = createRoot(document.createElement("div"));
    function NoBot() {
      useComputerBootWatch(undefined, true, refresh);
      return null;
    }
    await act(async () => root.render(<NoBot />));
    await advance(30_000);
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it("skips ticks while the tab is hidden and resumes when it is visible again", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    visibility = "hidden";
    const view = await mount({ watching: true, refresh });
    await advance(30_000);
    expect(refresh).not.toHaveBeenCalled();
    visibility = "visible";
    await advance(3_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  it("never overlaps requests", async () => {
    let finish: () => void = () => {};
    const refresh = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
      .mockResolvedValue(undefined);
    const view = await mount({ watching: true, refresh });
    await advance(12_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    await advance(3_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    await view.unmount();
  });

  it("keeps asking after an error that may pass, and stops after one that cannot", async () => {
    const refresh = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(Object.assign(new Error("Not signed in"), { status: 401 }))
      .mockResolvedValue(undefined);
    const view = await mount({ watching: true, refresh });
    await advance(3_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    await advance(3_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    await advance(30_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    await view.unmount();
  });

  it("stops after the bound, counting only the ticks that asked", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    visibility = "hidden";
    const view = await mount({ watching: true, refresh, maxMs: 9_000 });
    await advance(60_000);
    expect(refresh).not.toHaveBeenCalled();
    visibility = "visible";
    await advance(30_000);
    expect(refresh).toHaveBeenCalledTimes(3);
    await view.unmount();
  });

  it("starts over for another bot, and uses the latest refresh without restarting", async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(undefined);
    const view = await mount({ botId: "bot-1", watching: true, refresh: first });
    await advance(3_000);
    expect(first).toHaveBeenCalledWith("bot-1");
    await advance(1_500);
    await view.rerender({ botId: "bot-1", watching: true, refresh: second });
    // Same bot: the timer was not restarted, so the next tick is 1.5 s away and uses the new refresh.
    await advance(1_500);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
    await view.rerender({ botId: "bot-2", watching: true, refresh: second });
    await advance(3_000);
    expect(second).toHaveBeenLastCalledWith("bot-2");
    await view.unmount();
  });
});
