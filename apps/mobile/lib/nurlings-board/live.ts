import type { BoardEvent, Bot } from "@rakazo/contracts";
import type { Viewer } from "@rakazo/core/nurlings-board";
import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { rpc } from "../api";
import { useAppForeground } from "../app-foreground";
import { keepBoardSubscribed } from "./event-stream";
import { subscribeBoard } from "./subscribe";

/**
 * Runs the board subscription while the screen is focused and the app is on screen. `onOpen`
 * fires each time it (re)connects, so the screen can reload what it missed; `onChange` fires for
 * every board event. Only the focused screen holds a connection.
 */
export function useBoardStream(handlers: {
  onOpen: () => void;
  onChange: (event: BoardEvent) => void;
  onError: (cause: unknown) => void;
}): void {
  const focused = useIsFocused();
  const foreground = useAppForeground();
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!focused || !foreground) return;
    const controller = new AbortController();
    void keepBoardSubscribed({
      subscribe: subscribeBoard,
      onOpen: () => ref.current.onOpen(),
      onEvent: (event) => ref.current.onChange(event as BoardEvent),
      onError: (cause) => ref.current.onError(cause),
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [focused, foreground]);
}

/** The space's Nurlings, reloaded whenever `revision` changes (a Nurling's status shows on cards). */
export function useBoardBots(revision: number): Bot[] {
  const [bots, setBots] = useState<Bot[]>([]);
  useEffect(() => {
    let active = true;
    void rpc<Bot[]>("bots/list")
      .then((rows) => {
        if (active) setBots(rows);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [revision]);
  return bots;
}

/** The user's saved timezone, which dates are shown and picked in, and who they are. */
export function useBoardMe(): { timeZone: string; viewer: Viewer } {
  const [me, setMe] = useState<{ timeZone: string; viewer: Viewer }>({
    timeZone: "UTC",
    viewer: { id: "", name: "" },
  });
  useEffect(() => {
    let active = true;
    void rpc<{ userId: string; name: string; timezone?: string | null }>("me")
      .then((row) => {
        if (active)
          setMe({
            timeZone: row.timezone ?? "UTC",
            viewer: { id: row.userId, name: row.name },
          });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return me;
}

/** A counter screens bump to refetch, per ticket and for everything. */
export function useRevisions() {
  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const bump = useCallback((ticketId?: string) => {
    const key = ticketId ?? "*";
    setRevisions((previous) => ({ ...previous, [key]: (previous[key] ?? 0) + 1 }));
  }, []);
  const get = useCallback(
    (ticketId?: string) => (revisions["*"] ?? 0) + (ticketId ? (revisions[ticketId] ?? 0) : 0),
    [revisions],
  );
  return { bump, get };
}
