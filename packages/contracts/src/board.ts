import * as z from "zod";
import { ATTACHMENT_MAX_COUNT } from "./attachments.js";
import { Id, RunStatus } from "./ids.js";

export const TICKET_STATUSES = ["todo", "doing", "review", "blocked", "done", "closed"] as const;
export const TicketStatusSchema = z.enum(TICKET_STATUSES);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

/** `done` is finished-but-open for review; `closed` is terminal, so both stamp completion. */
export function isTicketCompletedStatus(status: TicketStatus): boolean {
  return status === "done" || status === "closed";
}

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TicketPrioritySchema = z.enum(TICKET_PRIORITIES);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;
const DEFAULT_TICKET_PRIORITY: TicketPriority = "normal";

export const TICKET_TITLE_MAX_LENGTH = 200;
export const TICKET_DESCRIPTION_MAX_LENGTH = 20_000;
const TICKET_PREFIX_MAX_LENGTH = 12;
export const TICKET_COMMENT_MAX_LENGTH = 10_000;

const TicketPrefixSchema = z
  .string()
  .trim()
  .min(1)
  .max(TICKET_PREFIX_MAX_LENGTH)
  .regex(
    /^[A-Za-z][A-Za-z0-9]*$/,
    "Prefix must start with a letter and contain only letters and digits",
  );

export function ticketRef(prefix: string, number: number): string {
  return `${prefix}-${number}`;
}

export function parseTicketRef(
  value: string,
  expectedPrefix?: string,
): { prefix: string; number: number } | null {
  const match = /^([A-Za-z][A-Za-z0-9]*)-([1-9][0-9]*)$/.exec(value.trim());
  if (!match) return null;
  const [, rawPrefix, rawNumber] = match;
  if (!rawPrefix || !rawNumber) return null;
  const prefix = rawPrefix.toUpperCase();
  if (expectedPrefix !== undefined && prefix !== expectedPrefix.trim().toUpperCase()) return null;
  return { prefix, number: Number(rawNumber) };
}

export const BoardSchema = z.object({
  id: Id,
  spaceId: Id,
  name: z.string(),
  ticketPrefix: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Board = z.infer<typeof BoardSchema>;

export const RenameBoardInput = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    ticketPrefix: TicketPrefixSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.ticketPrefix !== undefined, {
    message: "Provide a name or ticketPrefix",
  });
export type RenameBoardInput = z.infer<typeof RenameBoardInput>;

export const TICKET_MENTION_KINDS = ["bot", "user"] as const;
/** A Nurling or a user called in by a comment. Names and colors come from the reader's own lists. */
export const TicketMentionSchema = z.object({
  kind: z.enum(TICKET_MENTION_KINDS),
  id: Id,
});
export type TicketMention = z.infer<typeof TicketMentionSchema>;
export const TICKET_MENTIONS_MAX = 20;

/** A file attached to a comment, in the shape of a chat message's file or image block. */
export const TicketAttachmentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("image"), artifactId: Id, mimeType: z.string(), name: z.string() }),
  z.object({
    kind: z.literal("file"),
    artifactId: Id,
    mimeType: z.string(),
    name: z.string(),
    size: z.number().int().nonnegative(),
  }),
]);
export type TicketAttachment = z.infer<typeof TicketAttachmentSchema>;

export const TicketCommentSchema = z.object({
  id: Id,
  ticketId: Id,
  body: z.string(),
  authorBotId: Id.nullable(),
  authorUserId: Id.nullable(),
  authorName: z.string().nullable(),
  mentions: z.array(TicketMentionSchema).default([]),
  attachments: z.array(TicketAttachmentSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TicketComment = z.infer<typeof TicketCommentSchema>;

export const TICKET_EVENT_KINDS = ["created", "status", "owner", "approved", "resumed"] as const;
export const TicketEventKindSchema = z.enum(TICKET_EVENT_KINDS);
export type TicketEventKind = z.infer<typeof TicketEventKindSchema>;

/** One step in a ticket's history. `status` is set for status, approved and resumed events (a resumed event has no actor), `assigneeBotId` for created and owner events. */
export const TicketEventSchema = z.object({
  id: Id,
  ticketId: Id,
  kind: TicketEventKindSchema,
  actorBotId: Id.nullable(),
  actorUserId: Id.nullable(),
  actorName: z.string().nullable(),
  status: TicketStatusSchema.nullable(),
  assigneeBotId: Id.nullable(),
  assigneeName: z.string().nullable(),
  createdAt: z.string(),
});
export type TicketEvent = z.infer<typeof TicketEventSchema>;

/** A Nurling's latest run started for a ticket, which the feed shows as working or failed. */
export const TicketRunSchema = z.object({
  botId: Id,
  status: RunStatus,
  finishedAt: z.string().nullable(),
});
export type TicketRun = z.infer<typeof TicketRunSchema>;

export const TicketSchema = z.object({
  id: Id,
  boardId: Id,
  spaceId: Id,
  number: z.number().int().positive(),
  ref: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  assigneeBotId: Id.nullable(),
  createdByBotId: Id.nullable(),
  createdByUserId: Id.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  /** A Nurling's latest comment calls for the user and the ticket is still open. */
  needsUser: z.boolean().default(false),
  /** Instants; without a time a start is 9 AM and a due the end of that day, local. */
  startAt: z.string().nullable().default(null),
  startHasTime: z.boolean().default(false),
  dueAt: z.string().nullable().default(null),
  dueHasTime: z.boolean().default(false),
});
export type Ticket = z.infer<typeof TicketSchema>;

export const ListTicketsInput = z.object({
  boardId: Id.optional(),
  status: TicketStatusSchema.optional(),
  assigneeBotId: Id.optional(),
  q: z.string().trim().max(200).optional(),
});
export type ListTicketsInput = z.infer<typeof ListTicketsInput>;

export const ListTicketsOutput = z.object({ tickets: z.array(TicketSchema) });
export type ListTicketsOutput = z.infer<typeof ListTicketsOutput>;

export const GetTicketInput = z
  .object({
    id: Id.optional(),
    ref: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => Boolean(value.id) !== Boolean(value.ref), {
    message: "Provide exactly one of id or ref",
  });
export type GetTicketInput = z.infer<typeof GetTicketInput>;

export type TicketDateKind = "start" | "due";
/** A date without a time starts at 9 AM and is due at the end of the day. */
const TICKET_DEFAULT_TIME: Record<TicketDateKind, string> = { start: "09:00", due: "23:59" };
export const TICKET_START_AFTER_DUE_ERROR = "Start must be before due.";

/** A local date (`2026-10-30`) or date-time (`2026-10-30T15:00`) in the user's timezone. */
export const TicketDateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, "Use YYYY-MM-DD or YYYY-MM-DDTHH:mm")
  .refine((value) => {
    const [date, time = "00:00"] = value.split("T");
    const [year, month, day] = (date ?? "").split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const check = new Date(Date.UTC(year!, month! - 1, day!));
    return (
      check.getUTCFullYear() === year &&
      check.getUTCMonth() === month! - 1 &&
      check.getUTCDate() === day &&
      hour! < 24 &&
      minute! < 60
    );
  }, "Not a real date or time");

/** The local wall-clock time a date input stands for, as `YYYY-MM-DDTHH:mm`. */
export function ticketLocalDateTime(value: string, kind: TicketDateKind): string {
  return value.includes("T") ? value : `${value}T${TICKET_DEFAULT_TIME[kind]}`;
}

function startNotAfterDue(value: { start?: string | null; due?: string | null }) {
  return (
    !value.start ||
    !value.due ||
    ticketLocalDateTime(value.start, "start") <= ticketLocalDateTime(value.due, "due")
  );
}

export const CreateTicketInput = z
  .object({
    boardId: Id.optional(),
    title: z.string().trim().min(1).max(TICKET_TITLE_MAX_LENGTH),
    description: z.string().max(TICKET_DESCRIPTION_MAX_LENGTH).optional(),
    priority: TicketPrioritySchema.default(DEFAULT_TICKET_PRIORITY),
    assigneeBotId: Id,
    start: TicketDateInputSchema.nullable().optional(),
    due: TicketDateInputSchema.nullable().optional(),
  })
  .refine(startNotAfterDue, { message: TICKET_START_AFTER_DUE_ERROR });
export type CreateTicketInput = z.infer<typeof CreateTicketInput>;

export const UpdateTicketInput = z
  .object({
    id: Id,
    title: z.string().trim().min(1).max(TICKET_TITLE_MAX_LENGTH).optional(),
    description: z.string().max(TICKET_DESCRIPTION_MAX_LENGTH).nullable().optional(),
    priority: TicketPrioritySchema.nullable().optional(),
    status: TicketStatusSchema.optional(),
    assigneeBotId: Id.optional(),
    /** Null clears the date; omitted leaves it. */
    start: TicketDateInputSchema.nullable().optional(),
    due: TicketDateInputSchema.nullable().optional(),
  })
  .refine(startNotAfterDue, { message: TICKET_START_AFTER_DUE_ERROR });
export type UpdateTicketInput = z.infer<typeof UpdateTicketInput>;

export const MoveTicketInput = z.object({
  id: Id,
  status: TicketStatusSchema,
});
export type MoveTicketInput = z.infer<typeof MoveTicketInput>;

/** Only a ticket that is In review can be approved; it moves to Done. */
export const ApproveTicketInput = z.object({ id: Id });
export type ApproveTicketInput = z.infer<typeof ApproveTicketInput>;

export const CommentTicketInput = z
  .object({
    ticketId: Id,
    body: z.string().trim().max(TICKET_COMMENT_MAX_LENGTH),
    mentions: z.array(TicketMentionSchema).max(TICKET_MENTIONS_MAX).optional(),
    /** Files uploaded with `artifacts.create` for the ticket's owner. */
    artifactIds: z.array(Id).max(ATTACHMENT_MAX_COUNT).optional(),
  })
  .refine((value) => value.body.length > 0 || Boolean(value.artifactIds?.length), {
    message: "Write a comment or attach a file",
  });
export type CommentTicketInput = z.infer<typeof CommentTicketInput>;

export const BoardEventSchema = z.object({
  spaceId: Id,
  boardId: Id.optional(),
  ticketId: Id.optional(),
  createdAt: z.string(),
});
export type BoardEvent = z.infer<typeof BoardEventSchema>;
