import { useEffect, useState } from "react";
import type { ActivityItem } from "./activity";

/** When each ticket's activity was last viewed, remembered per browser for the latest tickets. */
export const ACTIVITY_SEEN_KEY = "rakazo.ticket-activity-seen";
const KEEP = 200;

function readAll(): Record<string, string> {
  const raw = window.localStorage.getItem(ACTIVITY_SEEN_KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : {};
  return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
}

export function readActivitySeen(ticketId: string): string | null {
  try {
    const at = readAll()[ticketId];
    return typeof at === "string" ? at : null;
  } catch {
    return null;
  }
}

export function writeActivitySeen(ticketId: string, at: string): void {
  try {
    const all = readAll();
    delete all[ticketId];
    all[ticketId] = at;
    // Insertion order is write order, so the oldest writes go first.
    const keys = Object.keys(all);
    for (const key of keys.slice(0, Math.max(0, keys.length - KEEP))) delete all[key];
    window.localStorage.setItem(ACTIVITY_SEEN_KEY, JSON.stringify(all));
  } catch {
    // Blocked storage: the count lasts until the modal closes.
  }
}

const SHOWN_EVENTS = new Set(["created", "status", "owner", "approved", "resumed"]);

function byViewer(item: ActivityItem, viewerId: string): boolean {
  if (item.kind === "comment")
    return !item.comment.authorBotId && item.comment.authorUserId === viewerId;
  if (item.kind === "event") return !item.event.actorBotId && item.event.actorUserId === viewerId;
  if (item.kind === "file") return !item.file.runId;
  return false;
}

/** Feed rows newer than `seenAt` that someone other than the viewer made. */
export function unseenCount(items: ActivityItem[], seenAt: string, viewerId: string): number {
  const since = Date.parse(seenAt);
  return items.filter(
    (item) =>
      Date.parse(item.at) > since &&
      (item.kind !== "event" || SHOWN_EVENTS.has(item.event.kind)) &&
      !byViewer(item, viewerId),
  ).length;
}

/**
 * How many feed rows arrived since the viewer last looked. While `viewing`, everything is marked
 * seen. A ticket never opened here starts seen once its activity has loaded.
 */
export function useActivitySeen(
  ticketId: string,
  items: ActivityItem[],
  viewerId: string,
  loaded: boolean,
  viewing: boolean,
): number {
  const [seenAt, setSeenAt] = useState(() => readActivitySeen(ticketId));
  const newest = items.at(-1)?.at;
  useEffect(() => {
    if (!loaded || !newest || (seenAt !== null && !viewing) || seenAt === newest) return;
    setSeenAt(newest);
    writeActivitySeen(ticketId, newest);
  }, [ticketId, loaded, newest, viewing, seenAt]);
  if (!loaded || seenAt === null || viewing) return 0;
  return unseenCount(items, seenAt, viewerId);
}
