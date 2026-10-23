import type {
  Actor,
  NestNeedsYouItem,
  NestNurling,
  NestSnapshot,
  RunStatus,
} from "@rakazo/contracts";
import { MessageBlock } from "@rakazo/contracts";
import {
  ACTIVE_RUN_STATUSES,
  BACKGROUND_RUN_TRIGGERS,
  isApprovalAskBlock,
  isSecretAskBlock,
  NEST_SLEEP_AFTER_MS,
  nestMood,
  WORKING_RUN_STATUSES,
} from "@rakazo/core";
import type { PrismaClient } from "@rakazo/db";
import { activityPreview } from "./runs.js";

const ASK_TEXT_MAX = 160;
/** Enough for the bot messages of every run waiting on the user at once. */
const ASK_MESSAGE_LIMIT = 500;
const WAITING_STATUSES = ["waiting_input", "waiting_takeover"] as const;

function oneLine(text: string, max = ASK_TEXT_MAX): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

function isWorking(status: string): boolean {
  return WORKING_RUN_STATUSES.some((working) => working === status);
}

type PendingAsk = { messageId: string; kind: NestNeedsYouItem["kind"]; text: string | null };

/** The newest unanswered ask in a message's blocks, if any. */
function pendingAsk(messageId: string, blocks: unknown): PendingAsk | null {
  const parsed = MessageBlock.array().safeParse(blocks);
  if (!parsed.success) return null;
  for (const block of [...parsed.data].reverse()) {
    if (block.kind !== "ask" || block.status === "answered" || block.dismissed) continue;
    if (isSecretAskBlock(block)) return { messageId, kind: "secret", text: null };
    return {
      messageId,
      kind: isApprovalAskBlock(block) ? "approval" : "question",
      text: oneLine(block.text),
    };
  }
  return null;
}

/**
 * Everything the Nest shows, for the caller's space, in one read. Each section is its own key so a
 * new one can be added without touching the others.
 */
export async function buildNestSnapshot(
  prisma: PrismaClient,
  actor: Actor,
  now = new Date(),
): Promise<NestSnapshot> {
  const owner = { spaceId: actor.spaceId, userId: actor.userId, bot: { archivedAt: null } };
  const foreground = { notIn: [...BACKGROUND_RUN_TRIGGERS] };
  const [bots, activeRuns, recentRuns, routines] = await Promise.all([
    prisma.bot.findMany({
      where: { spaceId: actor.spaceId, userId: actor.userId, archivedAt: null },
      select: {
        id: true,
        name: true,
        title: true,
        color: true,
        // Same signal the sidebar uses for its error dot: the newest conversational run.
        runs: {
          where: { trigger: { notIn: ["bot_message", ...BACKGROUND_RUN_TRIGGERS] } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { status: true },
        },
      },
      orderBy: [{ pinned: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    }),
    prisma.run.findMany({
      where: { ...owner, trigger: foreground, status: { in: [...ACTIVE_RUN_STATUSES] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        botId: true,
        status: true,
        trigger: true,
        createdAt: true,
        task: { select: { prompt: true } },
        sourceMessage: { select: { blocks: true } },
        thread: { select: { groupId: true } },
      },
    }),
    prisma.run.groupBy({
      by: ["botId"],
      where: {
        ...owner,
        trigger: foreground,
        createdAt: { gt: new Date(now.getTime() - NEST_SLEEP_AFTER_MS) },
      },
      _max: { createdAt: true },
    }),
    prisma.routine.findMany({
      where: { ...owner, active: true, nextRunAt: { not: null } },
      orderBy: [{ nextRunAt: "asc" }, { id: "asc" }],
      select: { id: true, botId: true, name: true, nextRunAt: true, watch: true },
    }),
  ]);

  const newestActive = new Map<string, (typeof activeRuns)[number]>();
  for (const run of activeRuns) if (!newestActive.has(run.botId)) newestActive.set(run.botId, run);
  const lastRunAt = new Map(recentRuns.map((row) => [row.botId, row._max.createdAt]));
  const armed = new Set(routines.map((routine) => routine.botId));
  // A watching routine's next time is a check, not a scheduled run.
  const nextRoutine = new Map<string, (typeof routines)[number]>();
  for (const routine of routines) {
    if (routine.watch === null && !nextRoutine.has(routine.botId)) {
      nextRoutine.set(routine.botId, routine);
    }
  }

  const nurlings: NestNurling[] = bots.map((bot) => {
    const active = newestActive.get(bot.id);
    const waiting = active ? WAITING_STATUSES.some((status) => status === active.status) : false;
    const mood = nestMood({
      status: active?.status ?? "idle",
      hasRunError: bot.runs[0]?.status === "failed" && !waiting,
      hasArmedRoutine: armed.has(bot.id),
      lastRunAt: lastRunAt.get(bot.id) ?? null,
      now,
    });
    const next = nextRoutine.get(bot.id);
    return {
      id: bot.id,
      name: bot.name,
      title: bot.title,
      color: bot.color,
      mood,
      currentTask:
        active && isWorking(active.status)
          ? {
              runId: active.id,
              status: active.status as RunStatus,
              text: activityPreview({
                trigger: active.trigger,
                prompt: active.task.prompt,
                sourceBlocks: active.sourceMessage?.blocks,
              }).promptSnippet,
            }
          : null,
      nextRoutine:
        next?.nextRunAt != null
          ? { routineId: next.id, name: next.name, at: next.nextRunAt.toISOString() }
          : null,
    };
  });

  const waitingRuns = activeRuns.filter((run) =>
    WAITING_STATUSES.some((status) => status === run.status),
  );
  const askRunIds = waitingRuns.filter((run) => run.status === "waiting_input").map((r) => r.id);
  const askMessages = askRunIds.length
    ? await prisma.message.findMany({
        where: { runId: { in: askRunIds }, role: "bot", thread: { spaceId: actor.spaceId } },
        orderBy: { seq: "desc" },
        take: ASK_MESSAGE_LIMIT,
        select: { id: true, runId: true, blocks: true, createdAt: true },
      })
    : [];
  const askByRun = new Map<string, PendingAsk & { createdAt: Date }>();
  for (const message of askMessages) {
    if (!message.runId || askByRun.has(message.runId)) continue;
    const ask = pendingAsk(message.id, message.blocks);
    if (ask) askByRun.set(message.runId, { ...ask, createdAt: message.createdAt });
  }

  const visibleBots = new Set(bots.map((bot) => bot.id));
  const needsYou: NestNeedsYouItem[] = [];
  for (const run of [...waitingRuns].reverse()) {
    if (!visibleBots.has(run.botId)) continue;
    const base = { botId: run.botId, groupId: run.thread.groupId, runId: run.id };
    if (run.status === "waiting_takeover") {
      needsYou.push({
        ...base,
        messageId: null,
        kind: "takeover",
        text: null,
        askedAt: run.createdAt.toISOString(),
      });
      continue;
    }
    const ask = askByRun.get(run.id);
    if (!ask) continue;
    needsYou.push({
      ...base,
      messageId: ask.messageId,
      kind: ask.kind,
      text: ask.text,
      askedAt: ask.createdAt.toISOString(),
    });
  }

  return { nurlings, needsYou };
}
