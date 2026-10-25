import { describe, expect, it } from "vitest";
import {
  ApproveTicketInput,
  CommentTicketInput,
  CreateTicketInput,
  GetTicketInput,
  isTicketCompletedStatus,
  ListTicketsOutput,
  parseTicketRef,
  TICKET_EVENT_KINDS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TicketCommentSchema,
  TicketEventSchema,
  TicketSchema,
  UpdateTicketInput,
} from "./board.js";

describe("parseTicketRef", () => {
  it("matches the prefix case-insensitively and normalizes it", () => {
    expect(parseTicketRef("rak-42")).toEqual({ prefix: "RAK", number: 42 });
    expect(parseTicketRef("  RaK-7  ")).toEqual({ prefix: "RAK", number: 7 });
  });

  it("rejects a reference whose prefix differs from the board", () => {
    expect(parseTicketRef("RAK-42", "RAK")).toEqual({ prefix: "RAK", number: 42 });
    expect(parseTicketRef("rak-42", "RAK")).toEqual({ prefix: "RAK", number: 42 });
    expect(parseTicketRef("ABC-42", "RAK")).toBeNull();
  });

  it("rejects malformed references", () => {
    for (const value of ["RAK", "RAK-", "-42", "RAK 42", "RAK-0", "RAK-007", "42-RAK", ""]) {
      expect(parseTicketRef(value)).toBeNull();
    }
  });
});

describe("ticket contracts", () => {
  const ticket = {
    id: "ticket-1",
    boardId: "board-1",
    spaceId: "space-1",
    number: 1,
    ref: "RAK-1",
    title: "Ship the board",
    description: null,
    status: "todo",
    priority: "normal",
    assigneeBotId: null,
    createdByBotId: null,
    createdByUserId: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
  };

  it("accepts a ticket document and rejects unknown statuses", () => {
    expect(TicketSchema.parse(ticket).status).toBe("todo");
    expect(TicketSchema.parse({ ...ticket, status: "closed" }).status).toBe("closed");
    expect(() => TicketSchema.parse({ ...ticket, status: "archived" })).toThrow();
  });

  it("orders statuses with closed last and treats done and closed as completed", () => {
    expect(TICKET_STATUSES).toEqual(["todo", "doing", "review", "blocked", "done", "closed"]);
    expect(isTicketCompletedStatus("done")).toBe(true);
    expect(isTicketCompletedStatus("closed")).toBe(true);
    expect(isTicketCompletedStatus("review")).toBe(false);
  });

  it("always creates tickets with a known priority and no caller-chosen status", () => {
    expect(CreateTicketInput.parse({ title: "Ship", assigneeBotId: "bot-1" })).toEqual({
      title: "Ship",
      assigneeBotId: "bot-1",
      priority: "normal",
    });
    expect(
      CreateTicketInput.parse({ title: "Ship", assigneeBotId: "bot-1", priority: "urgent" })
        .priority,
    ).toBe("urgent");
    const withoutStatus = CreateTicketInput.parse({
      title: "Ship",
      assigneeBotId: "bot-1",
      status: "doing",
    } as never);
    expect(withoutStatus).not.toHaveProperty("status");
    expect(() =>
      CreateTicketInput.parse({ title: "Ship", assigneeBotId: "bot-1", priority: "whenever" }),
    ).toThrow();
    expect(TICKET_PRIORITIES).toEqual(["low", "normal", "high", "urgent"]);
  });

  it("requires exactly one of id or ref when fetching", () => {
    expect(GetTicketInput.parse({ ref: "RAK-1" })).toEqual({ ref: "RAK-1" });
    expect(GetTicketInput.parse({ id: "ticket-1" })).toEqual({ id: "ticket-1" });
    expect(() => GetTicketInput.parse({})).toThrow();
    expect(() => GetTicketInput.parse({ id: "ticket-1", ref: "RAK-1" })).toThrow();
  });

  it("lets a ticket be created without an owner, for the server to pick", () => {
    expect(CreateTicketInput.parse({ title: "Ship" }).assigneeBotId).toBeUndefined();
  });

  it("reads a ticket list from an older server without the card fields", () => {
    const [ticket] = ListTicketsOutput.parse({
      tickets: [
        {
          id: "t1",
          boardId: "b1",
          spaceId: "s1",
          number: 1,
          ref: "NUR-1",
          title: "Ship",
          description: null,
          status: "todo",
          priority: "normal",
          assigneeBotId: null,
          createdByBotId: null,
          createdByUserId: null,
          createdAt: "2026-10-25T00:00:00.000Z",
          updatedAt: "2026-10-25T00:00:00.000Z",
          completedAt: null,
        },
      ],
    }).tickets;
    expect(ticket).toEqual(
      expect.objectContaining({ lastComment: null, fileCount: 0, workingBotId: null }),
    );
  });

  it("changes the owner without allowing it to be cleared", () => {
    expect(UpdateTicketInput.parse({ id: "ticket-1", assigneeBotId: "bot-2" }).assigneeBotId).toBe(
      "bot-2",
    );
    expect(() => UpdateTicketInput.parse({ id: "ticket-1", assigneeBotId: null })).toThrow();
  });

  it("describes a ticket event by kind, actor and the value it set", () => {
    const event = {
      id: "event-1",
      ticketId: "ticket-1",
      kind: "status",
      actorBotId: "bot-1",
      actorUserId: null,
      actorName: "Chief",
      status: "blocked",
      assigneeBotId: null,
      assigneeName: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    expect(TICKET_EVENT_KINDS).toEqual(["created", "status", "owner", "approved", "resumed"]);
    expect(TicketEventSchema.parse({ ...event, kind: "approved", status: "done" }).kind).toBe(
      "approved",
    );
    expect(TicketEventSchema.parse(event).status).toBe("blocked");
    expect(() => TicketEventSchema.parse({ ...event, kind: "priority" })).toThrow();
    expect(() => TicketEventSchema.parse({ ...event, status: "archived" })).toThrow();
  });

  it("keeps comments without mentions working and accepts typed mentions", () => {
    expect(CommentTicketInput.parse({ ticketId: "t1", body: "Hi" }).mentions).toBeUndefined();
    expect(
      CommentTicketInput.parse({
        ticketId: "t1",
        body: "@Scout hi",
        mentions: [{ kind: "bot", id: "bot-2" }],
      }).mentions,
    ).toEqual([{ kind: "bot", id: "bot-2" }]);
    expect(() =>
      CommentTicketInput.parse({
        ticketId: "t1",
        body: "x",
        mentions: [{ kind: "group", id: "g1" }],
      }),
    ).toThrow();
    expect(() =>
      CommentTicketInput.parse({
        ticketId: "t1",
        body: "x",
        mentions: Array.from({ length: 21 }, (_, index) => ({ kind: "bot", id: `bot-${index}` })),
      }),
    ).toThrow();
  });

  it("reads a comment stored before mentions existed as having none", () => {
    const comment = {
      id: "c1",
      ticketId: "t1",
      body: "Ready",
      authorBotId: null,
      authorUserId: "user-1",
      authorName: "Ada",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(TicketCommentSchema.parse(comment).mentions).toEqual([]);
  });

  it("reads a ticket without needsUser as not needing the user", () => {
    expect(TicketSchema.parse(ticket).needsUser).toBe(false);
    expect(TicketSchema.parse({ ...ticket, needsUser: true }).needsUser).toBe(true);
  });

  it("approves by id only", () => {
    expect(ApproveTicketInput.parse({ id: "ticket-1" })).toEqual({ id: "ticket-1" });
    expect(() => ApproveTicketInput.parse({})).toThrow();
  });

  it("takes a comment with text, files or both, but not neither", () => {
    expect(CommentTicketInput.safeParse({ ticketId: "t1", body: "Hi" }).success).toBe(true);
    expect(
      CommentTicketInput.safeParse({ ticketId: "t1", body: "", artifactIds: ["a1"] }).success,
    ).toBe(true);
    expect(CommentTicketInput.safeParse({ ticketId: "t1", body: " " }).success).toBe(false);
    expect(
      CommentTicketInput.safeParse({
        ticketId: "t1",
        body: "x",
        artifactIds: ["a1", "a2", "a3", "a4", "a5"],
      }).success,
    ).toBe(false);
  });

  it("reads a comment stored before attachments existed as having none", () => {
    const comment = {
      id: "c1",
      ticketId: "t1",
      body: "Ready",
      authorBotId: null,
      authorUserId: "user-1",
      authorName: "Ada",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(TicketCommentSchema.parse(comment).attachments).toEqual([]);
  });
});

describe("ticket dates", () => {
  it("accepts a local date, a local date-time or null, and nothing else", () => {
    for (const value of ["2026-10-30", "2026-10-30T15:00", null])
      expect(UpdateTicketInput.safeParse({ id: "t1", due: value }).success).toBe(true);
    for (const value of ["Friday", "2026-02-30", "2026-10-30T24:00", "2026-10-30T15:00Z"])
      expect(UpdateTicketInput.safeParse({ id: "t1", due: value }).success).toBe(false);
  });

  it("refuses a start after the due, reading a date alone as 9 AM and end of day", () => {
    const create = { title: "T", assigneeBotId: "bot-1" };
    expect(
      CreateTicketInput.safeParse({ ...create, start: "2026-10-30", due: "2026-10-30" }).success,
    ).toBe(true);
    expect(
      CreateTicketInput.safeParse({ ...create, start: "2026-10-30", due: "2026-10-30T08:00" }),
    ).toMatchObject({
      success: false,
      error: { issues: [{ message: "Start must be before due." }] },
    });
  });

  it("defaults tickets from an older server to no dates", () => {
    const ticket = TicketSchema.parse({
      id: "t1",
      boardId: "b1",
      spaceId: "s1",
      number: 1,
      ref: "RAK-1",
      title: "T",
      description: null,
      status: "todo",
      priority: "normal",
      assigneeBotId: null,
      createdByBotId: null,
      createdByUserId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
    });
    expect(ticket).toMatchObject({
      startAt: null,
      startHasTime: false,
      dueAt: null,
      dueHasTime: false,
    });
  });
});
