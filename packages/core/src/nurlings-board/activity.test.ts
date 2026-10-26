import type { Ticket, TicketComment, TicketEvent } from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import { activityRows, mergeActivity } from "./activity.js";

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

it("adds files and a failed latest run, in time order before a comment at the same time", () => {
  const file = {
    id: "a1",
    botId: "bot-1",
    groupId: null,
    runId: "r1",
    name: "comps.pdf",
    description: null,
    mimeType: "application/pdf",
    size: 10,
    version: 1,
    createdAt: "2026-10-24T04:00:00.000Z",
  };
  const items = mergeActivity(
    ticket,
    [],
    [
      {
        id: "c1",
        ticketId: "t1",
        body: "Here",
        authorBotId: null,
        authorUserId: "user-1",
        authorName: "Ada",
        mentions: [],
        attachments: [],
        createdAt: "2026-10-24T04:00:00.000Z",
        updatedAt: "2026-10-24T04:00:00.000Z",
      } satisfies TicketComment,
    ],
    [file, { ...file, id: "orphan", botId: null }],
    [
      { botId: "bot-1", status: "failed", finishedAt: "2026-10-24T05:00:00.000Z" },
      { botId: "bot-2", status: "failed", finishedAt: null },
      { botId: "bot-3", status: "running", finishedAt: null },
    ],
  );
  expect(items.map((item) => item.id)).toEqual(["created-t1", "file-a1", "c1", "failed-bot-1"]);
});

describe("activityRows", () => {
  const bots = [{ id: "bot-1", name: "Chief" }];
  const rows = (items: ReturnType<typeof mergeActivity>) =>
    activityRows(items, { bots, viewerId: "user-1" });
  const comment = (id: string, createdAt: string): TicketComment => ({
    id,
    ticketId: "t1",
    body: "hi",
    authorBotId: "bot-1",
    authorUserId: null,
    authorName: "Chief",
    mentions: [],
    attachments: [],
    createdAt,
    updatedAt: createdAt,
  });

  it("opens with a separator and drops events that have no line", () => {
    const merged = mergeActivity(
      ticket,
      [event("e1", "2026-10-24T03:42:00.000Z", { kind: "owner", assigneeName: null })],
      [],
    );
    const result = rows(merged);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ line: { kind: "created" }, separated: true });
  });

  it("separates at 15 minutes and across days, not before", () => {
    const merged = mergeActivity(
      ticket,
      [],
      [
        comment("c1", "2026-10-24T03:50:00.000Z"),
        comment("c2", "2026-10-24T04:04:00.000Z"),
        comment("c3", "2026-10-24T04:19:00.000Z"),
        comment("c4", "2026-10-25T04:20:00.000Z"),
      ],
    );
    expect(rows(merged).map((row) => row.separated)).toEqual([true, false, false, true, true]);
  });

  it("says who moved a ticket, naming bots, you, and strangers", () => {
    const merged = mergeActivity(
      ticket,
      [
        event("e1", "2026-10-24T03:42:00.000Z"),
        event("e2", "2026-10-24T03:43:00.000Z", {
          actorBotId: null,
          actorUserId: "user-1",
          status: "doing",
        }),
        event("e3", "2026-10-24T03:44:00.000Z", {
          actorBotId: null,
          actorUserId: "user-2",
          actorName: "Sam",
          status: "done",
        }),
      ],
      [],
    );
    const lines = rows(merged).flatMap((row) => (row.line ? [row.line] : []));
    expect(lines.slice(1)).toEqual([
      { kind: "moved", actor: { you: false, name: "Chief" }, status: "blocked" },
      { kind: "moved", actor: { you: true, name: null }, status: "doing" },
      { kind: "moved", actor: { you: false, name: "Sam" }, status: "done" },
    ]);
  });

  it("reads a resumed event without an actor, and a failed run by the bot's name", () => {
    const merged = mergeActivity(
      ticket,
      [
        event("e1", "2026-10-24T03:42:00.000Z", {
          kind: "resumed",
          actorBotId: null,
          actorName: null,
          status: "doing",
        }),
      ],
      [],
      [],
      [{ botId: "bot-1", status: "failed", finishedAt: "2026-10-24T03:43:00.000Z" }],
    );
    const lines = rows(merged).flatMap((row) => (row.line ? [row.line] : []));
    expect(lines).toContainEqual({ kind: "resumed", status: "doing" });
    expect(lines).toContainEqual({ kind: "failed", name: "Chief" });
  });

  it("attributes an attached file to you when no run made it", () => {
    const file = {
      id: "f1",
      botId: "bot-1",
      runId: null,
      name: "a.pdf",
      createdAt: "2026-10-24T03:42:00.000Z",
    } as never;
    const lines = rows(mergeActivity(ticket, [], [], [file])).flatMap((row) =>
      row.line ? [row.line] : [],
    );
    expect(lines).toContainEqual({
      kind: "attached",
      name: "a.pdf",
      actor: { you: true, name: null },
    });
  });
});
