import * as z from "zod";
import { Id, IsoDate, RunStatus } from "./ids.js";

export const NEST_MOODS = ["working", "idle", "sleeping", "needs_you", "error"] as const;
export const NestMoodSchema = z.enum(NEST_MOODS);
export type NestMood = z.infer<typeof NestMoodSchema>;

export const NestNurlingSchema = z.object({
  id: Id,
  name: z.string(),
  title: z.string(),
  /** The bot's avatar value, rendered by the existing avatar component. */
  color: z.string(),
  mood: NestMoodSchema,
  /** The run being worked on right now, one line. Null unless the Nurling is working. */
  currentTask: z.object({ runId: Id, status: RunStatus, text: z.string() }).nullable(),
  /** The next armed scheduled routine. Change-watching routines are not scheduled runs. */
  nextRoutine: z.object({ routineId: Id, name: z.string(), at: IsoDate }).nullable(),
});
export type NestNurling = z.infer<typeof NestNurlingSchema>;

export const NEST_ASK_KINDS = ["approval", "question", "secret", "takeover"] as const;

export const NestNeedsYouItemSchema = z.object({
  botId: Id,
  /** Set when the ask was made in a group thread. */
  groupId: Id.nullable(),
  runId: Id,
  /** Null for a computer takeover, which has no message. */
  messageId: Id.nullable(),
  kind: z.enum(NEST_ASK_KINDS),
  /** The question, one line. Null for a secret request, whose content stays in the thread. */
  text: z.string().nullable(),
  askedAt: IsoDate,
});
export type NestNeedsYouItem = z.infer<typeof NestNeedsYouItemSchema>;

/**
 * Named sections: a new section is a new key, existing keys keep their shape.
 * Unknown keys are ignored by clients that do not render them.
 */
export const NestSnapshotSchema = z.object({
  nurlings: z.array(NestNurlingSchema),
  needsYou: z.array(NestNeedsYouItemSchema),
});
export type NestSnapshot = z.infer<typeof NestSnapshotSchema>;
