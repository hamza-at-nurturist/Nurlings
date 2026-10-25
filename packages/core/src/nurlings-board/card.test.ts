import type { Bot, TicketListItem } from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import { ticketCard } from "./card.js";

const NOW = new Date("2026-10-25T12:00:00.000Z");
const LABELS = { today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday" };
const bots = [
  { id: "bot-1", name: "Chief", color: "#8B5CF6" },
  { id: "bot-2", name: "Scout", color: "#22C55E" },
] as Bot[];
const ticket = (overrides: Partial<TicketListItem> = {}) =>
  ({
    id: "t1",
    ref: "NUR-7",
    title: "Comps",
    status: "doing",
    assigneeBotId: "bot-1",
    needsUser: false,
    startAt: null,
    startHasTime: false,
    dueAt: null,
    dueHasTime: false,
    lastComment: null,
    fileCount: 0,
    workingBotId: null,
    ...overrides,
  }) as TicketListItem;
const card = (overrides: Partial<TicketListItem> = {}) =>
  ticketCard(ticket(overrides), { bots, now: NOW, timeZone: "UTC", labels: LABELS });

describe("ticketCard", () => {
  it("names the owner and the worker, and marks the owner working only when it is the worker", () => {
    expect(card({ workingBotId: "bot-1" })).toMatchObject({
      owner: { name: "Chief" },
      worker: { name: "Chief" },
      ownerWorking: true,
    });
    expect(card({ workingBotId: "bot-2" })).toMatchObject({
      worker: { name: "Scout" },
      ownerWorking: false,
    });
    expect(card().worker).toBeUndefined();
  });

  it("carries the last comment, file count and needs-you flag", () => {
    expect(card({ lastComment: "Report attached", fileCount: 2, needsUser: true })).toMatchObject({
      lastComment: "Report attached",
      fileCount: 2,
      needsUser: true,
    });
  });

  it("formats dates and flags a passed due only while work is open", () => {
    const due = { dueAt: "2026-10-23T23:59:00.000Z", dueHasTime: false };
    expect(card(due).dates).toEqual({ start: null, due: "Oct 23", overdue: true });
    expect(card({ ...due, status: "done" }).dates.overdue).toBe(false);
    expect(card().hasDates).toBe(false);
    expect(card(due).hasDates).toBe(true);
  });

  it("dims finished tickets and allows Approve only in review", () => {
    expect(card({ status: "done" }).finished).toBe(true);
    expect(card({ status: "closed" }).finished).toBe(true);
    expect(card({ status: "review" })).toMatchObject({ finished: false, canApprove: true });
    expect(card({ status: "doing" }).canApprove).toBe(false);
  });
});
