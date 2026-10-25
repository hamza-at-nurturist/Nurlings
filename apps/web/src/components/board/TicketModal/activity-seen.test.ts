// @vitest-environment jsdom

import type { TicketComment, TicketEvent } from "@rakazo/contracts";
import type { ActivityItem } from "@rakazo/core/nurlings-board";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVITY_SEEN_KEY,
  readActivitySeen,
  unseenCount,
  writeActivitySeen,
} from "./activity-seen";

function comment(at: string, authorBotId: string | null): ActivityItem {
  return {
    kind: "comment",
    id: `c-${at}`,
    at,
    comment: { authorBotId, authorUserId: "user-1" } as TicketComment,
  };
}

function event(at: string, kind: TicketEvent["kind"]): ActivityItem {
  return {
    kind: "event",
    id: `e-${at}`,
    at,
    event: { kind, actorBotId: "bot-1", actorUserId: null } as TicketEvent,
  };
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("unseenCount", () => {
  const items = [
    comment("2026-10-24T04:00:00.000Z", "bot-1"),
    comment("2026-10-24T04:10:00.000Z", "bot-1"),
    comment("2026-10-24T04:11:00.000Z", null),
    event("2026-10-24T04:12:00.000Z", "status"),
  ];

  it("counts what others did after the last view", () => {
    expect(unseenCount(items, "2026-10-24T04:05:00.000Z", "user-1")).toBe(2);
  });

  it("leaves out the viewer's own comments", () => {
    expect(unseenCount([items[2] as ActivityItem], "2026-10-24T04:05:00.000Z", "user-1")).toBe(0);
  });

  it("is zero when nothing is newer", () => {
    expect(unseenCount(items, "2026-10-24T05:00:00.000Z", "user-1")).toBe(0);
  });
});

describe("last viewed", () => {
  it("is remembered per ticket", () => {
    writeActivitySeen("t1", "2026-10-24T04:00:00.000Z");
    expect(readActivitySeen("t1")).toBe("2026-10-24T04:00:00.000Z");
    expect(readActivitySeen("t2")).toBeNull();
  });

  it("keeps the 200 most recently viewed tickets", () => {
    for (let index = 0; index < 205; index += 1)
      writeActivitySeen(`t${index}`, "2026-10-24T04:00:00.000Z");
    writeActivitySeen("t0", "2026-10-24T05:00:00.000Z");
    const all = JSON.parse(window.localStorage.getItem(ACTIVITY_SEEN_KEY) ?? "{}");
    expect(Object.keys(all)).toHaveLength(200);
    expect(all.t0).toBe("2026-10-24T05:00:00.000Z");
    expect(all.t5).toBeUndefined();
    expect(all.t6).toBeDefined();
  });

  it("reads nothing and writes nothing when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writeActivitySeen("t1", "2026-10-24T04:00:00.000Z")).not.toThrow();
    expect(readActivitySeen("t1")).toBeNull();
  });
});
