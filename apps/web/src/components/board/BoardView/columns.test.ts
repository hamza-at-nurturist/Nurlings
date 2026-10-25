import type { TicketListItem } from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import { boardColumns } from "./columns";

const NOW = new Date("2026-10-25T12:00:00.000Z");
const ticket = (id: string, overrides: Partial<TicketListItem> = {}) =>
  ({
    id,
    status: "todo",
    assigneeBotId: "bot-1",
    completedAt: null,
    ...overrides,
  }) as TicketListItem;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("boardColumns", () => {
  it("returns the six statuses in order, keeping the list's order inside each", () => {
    const columns = boardColumns(
      [
        ticket("a"),
        ticket("b", { status: "review" }),
        ticket("c"),
        ticket("d", { status: "closed" }),
      ],
      null,
      NOW,
    );
    expect(columns.map((column) => column.status)).toEqual([
      "todo",
      "doing",
      "review",
      "blocked",
      "done",
      "closed",
    ]);
    expect(columns[0]!.tickets.map((row) => row.id)).toEqual(["a", "c"]);
    expect(columns[2]!.tickets.map((row) => row.id)).toEqual(["b"]);
    expect(columns[5]!.tickets.map((row) => row.id)).toEqual(["d"]);
  });
  it("keeps a week of Done in view and the rest as older", () => {
    const [, , , , done] = boardColumns(
      [
        ticket("new", { status: "done", completedAt: daysAgo(1) }),
        ticket("edge", { status: "done", completedAt: daysAgo(6.9) }),
        ticket("old", { status: "done", completedAt: daysAgo(8) }),
        ticket("unknown", { status: "done", completedAt: null }),
      ],
      null,
      NOW,
    );
    expect(done!.tickets.map((row) => row.id)).toEqual(["new", "edge", "unknown"]);
    expect(done!.older.map((row) => row.id)).toEqual(["old"]);
  });
  it("shows only the picked Nurling's tickets, and unowned ones only for everyone", () => {
    const rows = [
      ticket("mine"),
      ticket("theirs", { assigneeBotId: "bot-2" }),
      ticket("none", { assigneeBotId: null }),
    ];
    expect(boardColumns(rows, "bot-2", NOW)[0]!.tickets.map((row) => row.id)).toEqual(["theirs"]);
    expect(boardColumns(rows, null, NOW)[0]!.tickets).toHaveLength(3);
  });
});
