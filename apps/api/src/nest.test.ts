import type { Actor } from "@rakazo/contracts";
import { NestSnapshotSchema } from "@rakazo/contracts";
import type { PrismaClient } from "@rakazo/db";
import { describe, expect, it, vi } from "vitest";
import { buildNestSnapshot } from "./nest.js";

const actor: Actor = {
  userId: "user-1",
  spaceId: "space-1",
  email: "user@nurlings.test",
  isDeploymentOwner: false,
};
const now = new Date("2026-03-10T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

type Row = Record<string, unknown>;
function fixture(
  data: {
    bots?: Row[];
    activeRuns?: Row[];
    recentRuns?: Row[];
    routines?: Row[];
    messages?: Row[];
  } = {},
) {
  const bots = vi.fn().mockResolvedValue(data.bots ?? []);
  const runs = vi.fn().mockResolvedValue(data.activeRuns ?? []);
  const groupBy = vi.fn().mockResolvedValue(data.recentRuns ?? []);
  const routines = vi.fn().mockResolvedValue(data.routines ?? []);
  const messages = vi.fn().mockResolvedValue(data.messages ?? []);
  const prisma = {
    bot: { findMany: bots },
    run: { findMany: runs, groupBy },
    routine: { findMany: routines },
    message: { findMany: messages },
  } as unknown as PrismaClient;
  return { prisma, bots, runs, groupBy, routines, messages };
}

const bot = (id: string, latest?: string): Row => ({
  id,
  name: id.toUpperCase(),
  title: "",
  color: "#F97316::shape_1",
  runs: latest ? [{ status: latest }] : [],
});
const activeRun = (id: string, botId: string, status: string, extra: Row = {}): Row => ({
  id,
  botId,
  status,
  trigger: "user",
  createdAt: hoursAgo(1),
  task: { prompt: "  Draft the\nQ3 deck  " },
  sourceMessage: null,
  thread: { groupId: null },
  ...extra,
});
const askMessage = (id: string, runId: string, blocks: unknown[], createdAt = hoursAgo(0.5)) => ({
  id,
  runId,
  blocks,
  createdAt,
});

describe("buildNestSnapshot", () => {
  it("reads only the caller's space and user, and never archived bots", async () => {
    const { prisma, bots, runs, groupBy, routines } = fixture();
    await buildNestSnapshot(prisma, actor, now);
    expect(bots.mock.calls[0]?.[0].where).toEqual({
      spaceId: "space-1",
      userId: "user-1",
      archivedAt: null,
    });
    for (const call of [runs, groupBy, routines]) {
      expect(call.mock.calls[0]?.[0].where).toMatchObject({
        spaceId: "space-1",
        userId: "user-1",
        bot: { archivedAt: null },
      });
    }
  });

  it("returns the two named sections and parses against the contract", async () => {
    const { prisma } = fixture({ bots: [bot("ada")] });
    const snapshot = await buildNestSnapshot(prisma, actor, now);
    expect(Object.keys(snapshot).sort()).toEqual(["needsYou", "nurlings"]);
    expect(NestSnapshotSchema.parse(snapshot)).toEqual(snapshot);
  });

  it("shows the active run as the current task, on one line, only while working", async () => {
    const { prisma } = fixture({
      bots: [bot("ada"), bot("bo")],
      activeRuns: [activeRun("run-1", "ada", "running"), activeRun("run-2", "bo", "waiting_input")],
      messages: [askMessage("m-1", "run-2", [{ kind: "ask", text: "Ok?" }])],
    });
    const { nurlings } = await buildNestSnapshot(prisma, actor, now);
    expect(nurlings[0]).toMatchObject({
      mood: "working",
      currentTask: { runId: "run-1", status: "running", text: "Draft the Q3 deck" },
    });
    expect(nurlings[1]).toMatchObject({ mood: "needs_you", currentTask: null });
  });

  it("uses the newest of several active runs", async () => {
    const { prisma } = fixture({
      bots: [bot("ada")],
      activeRuns: [
        activeRun("new", "ada", "running", { task: { prompt: "newer" } }),
        activeRun("old", "ada", "queued", { task: { prompt: "older" } }),
      ],
    });
    const { nurlings } = await buildNestSnapshot(prisma, actor, now);
    expect(nurlings[0]?.currentTask?.runId).toBe("new");
  });

  it("derives error from a failed latest run unless the Nurling is waiting", async () => {
    const { prisma } = fixture({
      bots: [bot("ada", "failed"), bot("bo", "failed")],
      activeRuns: [activeRun("run-2", "bo", "waiting_takeover")],
    });
    const { nurlings } = await buildNestSnapshot(prisma, actor, now);
    expect(nurlings.map((n) => n.mood)).toEqual(["error", "needs_you"]);
  });

  it("decides idle versus sleeping from armed routines and runs in the last 24 hours", async () => {
    const { prisma } = fixture({
      bots: [bot("armed"), bot("recent"), bot("quiet")],
      recentRuns: [{ botId: "recent", _max: { createdAt: hoursAgo(23) } }],
      routines: [
        {
          id: "r-1",
          botId: "armed",
          name: "Inbox",
          nextRunAt: new Date("2026-03-10T14:00:00Z"),
          watch: null,
        },
      ],
    });
    const { nurlings } = await buildNestSnapshot(prisma, actor, now);
    expect(nurlings.map((n) => n.mood)).toEqual(["idle", "idle", "sleeping"]);
  });

  it("shows the soonest scheduled routine and ignores change-watching ones for it", async () => {
    const { prisma } = fixture({
      bots: [bot("ada"), bot("bo")],
      routines: [
        {
          id: "watch",
          botId: "ada",
          name: "Watch folder",
          nextRunAt: new Date("2026-03-10T12:05:00Z"),
          watch: { kind: "files" },
        },
        {
          id: "late",
          botId: "ada",
          name: "Digest",
          nextRunAt: new Date("2026-03-10T17:00:00Z"),
          watch: null,
        },
        {
          id: "soon",
          botId: "ada",
          name: "Inbox",
          nextRunAt: new Date("2026-03-10T14:00:00Z"),
          watch: null,
        },
        {
          id: "only-watch",
          botId: "bo",
          name: "Watch",
          nextRunAt: new Date("2026-03-10T12:05:00Z"),
          watch: { kind: "command" },
        },
      ].sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime()),
    });
    const { nurlings } = await buildNestSnapshot(prisma, actor, now);
    expect(nurlings[0]?.nextRoutine).toEqual({
      routineId: "soon",
      name: "Inbox",
      at: "2026-03-10T14:00:00.000Z",
    });
    // A watching routine still counts as armed: the Nurling is not asleep.
    expect(nurlings[1]).toMatchObject({ nextRoutine: null, mood: "idle" });
  });

  describe("needs you", () => {
    it("lists approvals and questions with their text, and group ids", async () => {
      const { prisma } = fixture({
        bots: [bot("ada"), bot("bo")],
        activeRuns: [
          activeRun("run-1", "ada", "waiting_input"),
          activeRun("run-2", "bo", "waiting_input", {
            createdAt: hoursAgo(2),
            thread: { groupId: "group-9" },
          }),
        ],
        messages: [
          askMessage("m-1", "run-1", [
            {
              kind: "ask",
              text: "Send the quote to Dana?",
              approvalEffectId: "eff-1",
              actions: [
                { id: "allow", label: "Allow" },
                { id: "deny", label: "Deny" },
              ],
            },
          ]),
          askMessage("m-2", "run-2", [{ kind: "ask", text: "Which\nfolder?" }]),
        ],
      });
      const { needsYou } = await buildNestSnapshot(prisma, actor, now);
      expect(needsYou).toHaveLength(2);
      expect(needsYou).toContainEqual({
        botId: "ada",
        groupId: null,
        runId: "run-1",
        messageId: "m-1",
        kind: "approval",
        text: "Send the quote to Dana?",
        askedAt: hoursAgo(0.5).toISOString(),
      });
      expect(needsYou).toContainEqual(
        expect.objectContaining({
          botId: "bo",
          groupId: "group-9",
          kind: "question",
          text: "Which folder?",
        }),
      );
    });

    it("omits the text of a secret request", async () => {
      const { prisma } = fixture({
        bots: [bot("ada")],
        activeRuns: [activeRun("run-1", "ada", "waiting_input")],
        messages: [
          askMessage("m-1", "run-1", [
            { kind: "ask", text: "Paste the production API key sk-live-123", input: "secret" },
          ]),
        ],
      });
      const { needsYou } = await buildNestSnapshot(prisma, actor, now);
      expect(needsYou).toEqual([expect.objectContaining({ kind: "secret", text: null })]);
      expect(JSON.stringify(needsYou)).not.toContain("sk-live");
    });

    it("lists a takeover request without a message", async () => {
      const { prisma, messages } = fixture({
        bots: [bot("ada")],
        activeRuns: [activeRun("run-1", "ada", "waiting_takeover")],
      });
      const { needsYou } = await buildNestSnapshot(prisma, actor, now);
      expect(needsYou).toEqual([
        expect.objectContaining({ kind: "takeover", messageId: null, text: null }),
      ]);
      expect(messages).not.toHaveBeenCalled();
    });

    it("skips answered and dismissed asks and runs with no ask", async () => {
      const { prisma } = fixture({
        bots: [bot("ada"), bot("bo"), bot("cy")],
        activeRuns: [
          activeRun("run-1", "ada", "waiting_input"),
          activeRun("run-2", "bo", "waiting_input"),
          activeRun("run-3", "cy", "waiting_input"),
        ],
        messages: [
          askMessage("m-1", "run-1", [{ kind: "ask", text: "Done?", status: "answered" }]),
          askMessage("m-2", "run-2", [{ kind: "ask", text: "Key?", dismissed: true }]),
        ],
      });
      const { needsYou } = await buildNestSnapshot(prisma, actor, now);
      expect(needsYou).toEqual([]);
    });

    it("uses the newest unanswered ask of a run", async () => {
      const { prisma } = fixture({
        bots: [bot("ada")],
        activeRuns: [activeRun("run-1", "ada", "waiting_input")],
        messages: [
          askMessage("newest", "run-1", [{ kind: "ask", text: "Second?" }]),
          askMessage("older", "run-1", [{ kind: "ask", text: "First?" }]),
        ],
      });
      const { needsYou } = await buildNestSnapshot(prisma, actor, now);
      expect(needsYou).toEqual([expect.objectContaining({ messageId: "newest", text: "Second?" })]);
    });

    it("never lists a waiting run of a Nurling the snapshot does not show", async () => {
      const { prisma } = fixture({
        bots: [bot("ada")],
        activeRuns: [activeRun("run-9", "ghost", "waiting_takeover")],
      });
      const { needsYou } = await buildNestSnapshot(prisma, actor, now);
      expect(needsYou).toEqual([]);
    });

    it("scopes the ask lookup to the waiting runs and the caller's space", async () => {
      const { prisma, messages } = fixture({
        bots: [bot("ada"), bot("bo")],
        activeRuns: [
          activeRun("run-1", "ada", "waiting_input"),
          activeRun("run-2", "bo", "running"),
        ],
      });
      await buildNestSnapshot(prisma, actor, now);
      expect(messages.mock.calls[0]?.[0].where).toEqual({
        runId: { in: ["run-1"] },
        role: "bot",
        thread: { spaceId: "space-1" },
      });
    });
  });
});
