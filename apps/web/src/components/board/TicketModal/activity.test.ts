import type { Ticket, TicketComment, TicketEvent } from "@rakazo/contracts";
import { expect, it } from "vitest";
import { mergeActivity } from "./activity";

const ticket: Ticket = {
  id: "t1",
  boardId: "b1",
  spaceId: "s1",
  number: 1,
  ref: "NUR-1",
  title: "Comps",
  description: null,
  status: "doing",
  priority: "normal",
  assigneeBotId: "bot-1",
  createdByBotId: null,
  createdByUserId: "user-1",
  createdAt: "2026-10-24T03:41:00.000Z",
  updatedAt: "2026-10-24T03:41:00.000Z",
  completedAt: null,
  needsUser: false,
  startAt: null,
  startHasTime: false,
  dueAt: null,
  dueHasTime: false,
};

function event(id: string, createdAt: string, patch: Partial<TicketEvent> = {}): TicketEvent {
  return {
    id,
    ticketId: "t1",
    kind: "status",
    actorBotId: "bot-1",
    actorUserId: null,
    actorName: "Chief",
    status: "blocked",
    assigneeBotId: null,
    assigneeName: null,
    createdAt,
    ...patch,
  };
}

function comment(id: string, createdAt: string): TicketComment {
  return {
    id,
    ticketId: "t1",
    body: id,
    authorBotId: null,
    authorUserId: "user-1",
    authorName: "Ada",
    mentions: [],
    attachments: [],
    createdAt,
    updatedAt: createdAt,
  };
}

it("orders events and comments by time with the newest last", () => {
  const items = mergeActivity(
    ticket,
    [event("e2", "2026-10-24T03:42:30.000Z"), event("e1", "2026-10-24T03:42:00.000Z")],
    [comment("c1", "2026-10-24T03:42:15.000Z"), comment("c2", "2026-10-24T04:08:00.000Z")],
  );
  expect(items.map((item) => item.id)).toEqual(["created-t1", "e1", "c1", "e2", "c2"]);
});

it("puts an event before a comment made at the same moment", () => {
  const at = "2026-10-24T05:00:00.000Z";
  const items = mergeActivity(ticket, [event("e1", at)], [comment("c1", at)]);
  expect(items.map((item) => item.id)).toEqual(["created-t1", "e1", "c1"]);
});

it("derives a created line for a ticket without recorded history", () => {
  const [first] = mergeActivity(ticket, [], []);
  expect(first).toMatchObject({
    kind: "event",
    at: ticket.createdAt,
    event: { kind: "created", actorUserId: "user-1", actorBotId: null, assigneeBotId: "bot-1" },
  });
  const [byBot] = mergeActivity({ ...ticket, createdByBotId: "bot-9" }, [], []);
  expect(byBot).toMatchObject({ event: { actorBotId: "bot-9", actorUserId: null } });
});

it("keeps a recorded created event instead of deriving another", () => {
  const recorded = event("e0", "2026-10-24T03:41:00.000Z", { kind: "created", status: null });
  const items = mergeActivity(ticket, [recorded], []);
  expect(items.map((item) => item.id)).toEqual(["e0"]);
});
