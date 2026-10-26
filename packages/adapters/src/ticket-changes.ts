import type { JobPublisher, NotificationProvider } from "@rakazo/adapter-kit";
import type { BoardEvents, PrismaClient } from "@rakazo/db";
import { getLogger } from "@rakazo/logging";
import { wakeMentionedBot } from "./ticket-mentions.js";
import { wakeTicketAssignee } from "./ticket-wake.js";

const MENTION_BODY_CHARS = 140;

export type TicketChange = {
  spaceId: string;
  boardId: string;
  ticketId: string;
  assigneeBotId: string | null;
  wakeAssignee: boolean;
  /** Replaces the owner's usual wake prompt, as Chief's triage does. */
  wakePrompt?: string;
  /** Nurlings a comment mentioned, already checked to belong to the commenting user. */
  mentionBotIds?: string[];
  /** The commenting user, whose Nurlings the mentions are. */
  userId?: string;
  /** The Nurling that commented, when it was one. */
  commentBotId?: string;
  /** Set when a Nurling's comment mentioned the user. */
  mentionedUser?: { ref: string; body: string };
};
export type TicketChangeNotifier = (change: TicketChange) => Promise<void>;

export function createTicketChangeNotifier(deps: {
  boardEvents: BoardEvents;
  prisma: PrismaClient;
  jobs: JobPublisher;
  ticketBoardEnabled?: boolean;
  /** Read when needed: the provider is built after this notifier in both composition roots. */
  notifications?: () => NotificationProvider | undefined;
}): TicketChangeNotifier {
  return async (change) => {
    if (!deps.ticketBoardEnabled) return;
    try {
      if (change.wakeAssignee && change.assigneeBotId) {
        await wakeTicketAssignee(deps, {
          spaceId: change.spaceId,
          ticketId: change.ticketId,
          botId: change.assigneeBotId,
          ...(change.wakePrompt ? { prompt: change.wakePrompt } : {}),
        });
      }
      if (change.userId) {
        for (const botId of change.mentionBotIds ?? []) {
          await wakeMentionedBot(deps, {
            spaceId: change.spaceId,
            userId: change.userId,
            ticketId: change.ticketId,
            botId,
            ...(change.commentBotId ? { byBotId: change.commentBotId } : {}),
          }).catch((error) => getLogger().warn("ticket mention wake", error));
        }
      }
    } finally {
      // After the wakes, so the board's reload already sees the queued runs.
      await deps.boardEvents
        .notify(change.spaceId, {
          boardId: change.boardId,
          ticketId: change.ticketId,
        })
        .catch(() => undefined);
    }
    if (change.mentionedUser && change.commentBotId && change.userId) {
      const { ref, body } = change.mentionedUser;
      await notifyTicketUser(deps, {
        spaceId: change.spaceId,
        userId: change.userId,
        botId: change.commentBotId,
        ticketId: change.ticketId,
        title: (name) => `${name} mentioned you on ${ref}`,
        body: [...body.trim()].slice(0, MENTION_BODY_CHARS).join(""),
      });
    }
  };
}

/** The existing push channel, honouring the Nurling's own notify-on-finish setting. */
export async function notifyTicketUser(
  deps: { prisma: PrismaClient; notifications?: () => NotificationProvider | undefined },
  input: {
    spaceId: string;
    userId: string;
    botId: string;
    /** The ticket a tap opens. */
    ticketId: string;
    /** Given the Nurling's name. */
    title: (botName: string) => string;
    body: string;
  },
) {
  const provider = deps.notifications?.();
  if (!provider) return;
  try {
    const bot = await deps.prisma.bot.findFirst({
      where: { id: input.botId, spaceId: input.spaceId, userId: input.userId },
      select: { name: true, notifyOnFinish: true, thread: { select: { id: true } } },
    });
    if (!bot?.notifyOnFinish || !bot.thread) return;
    await provider.send(
      {
        kind: "help",
        title: input.title(bot.name),
        body: input.body,
        botId: input.botId,
        threadId: bot.thread.id,
        ticketId: input.ticketId,
      },
      {
        operationId: "notify",
        traceId: input.botId,
        spaceId: input.spaceId,
        userId: input.userId,
        botId: input.botId,
        signal: new AbortController().signal,
      },
    );
  } catch (error) {
    getLogger().error("ticket notification", error);
  }
}
