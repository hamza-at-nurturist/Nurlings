import { describe, expect, it, vi } from "vitest";
import { createBoardEnabledStore } from "./enabled-store";

describe("board enabled store", () => {
  it("is unknown until me is read, then follows the flag", async () => {
    const store = createBoardEnabledStore(async () => ({ ticketBoardEnabled: true }));
    expect(store.get()).toBeNull();
    await store.refresh();
    expect(store.get()).toBe(true);
  });

  it("is off when the flag is false or missing", async () => {
    for (const me of [{ ticketBoardEnabled: false }, {}]) {
      const store = createBoardEnabledStore(async () => me);
      await store.refresh();
      expect(store.get()).toBe(false);
    }
  });

  it("keeps what it knew when me fails, and shares one request at a time", async () => {
    const fetchMe = vi
      .fn<() => Promise<{ ticketBoardEnabled?: boolean }>>()
      .mockResolvedValueOnce({ ticketBoardEnabled: true })
      .mockRejectedValueOnce(new Error("offline"));
    const store = createBoardEnabledStore(fetchMe);
    await Promise.all([store.refresh(), store.refresh()]);
    expect(fetchMe).toHaveBeenCalledTimes(1);
    await store.refresh();
    expect(store.get()).toBe(true);
  });

  it("tells listeners when the value changes, and resets to unknown", async () => {
    const store = createBoardEnabledStore(async () => ({ ticketBoardEnabled: true }));
    const listener = vi.fn();
    store.subscribe(listener);
    await store.refresh();
    store.reset();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.get()).toBeNull();
  });
});
