import type { Artifact, TicketComment, TicketEvent, TicketRun } from "@rakazo/contracts";
import { WORKING_RUN_STATUSES } from "@rakazo/core";
import { useCallback, useEffect, useState } from "react";
import { rpc } from "../api";
import { useAppForeground } from "../app-foreground";
import { errorText } from "../user-error";

const POLL_MS = 4_000;

export type TicketActivityData = {
  comments: TicketComment[];
  events: TicketEvent[];
  files: Artifact[];
  runs: TicketRun[];
};

/** A run that is queued, leased or running, whose ticket may change at any moment. */
export function hasActiveRun(runs: readonly TicketRun[]): boolean {
  return runs.some((run) => WORKING_RUN_STATUSES.some((status) => status === run.status));
}

/**
 * A ticket's comments, history, files and runs. `revision` is bumped by board events; it
 * refetches without clearing what is shown. While a Nurling has an active run for the ticket it
 * also refetches every few seconds, and only while the app is on screen.
 */
export function useTicketActivity(ticketId: string, revision: number) {
  const foreground = useAppForeground();
  const [data, setData] = useState<TicketActivityData>({
    comments: [],
    events: [],
    files: [],
    runs: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [local, setLocal] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      rpc<TicketComment[]>("tickets/comments", { ticketId }),
      rpc<TicketEvent[]>("tickets/events", { ticketId }),
      rpc<Artifact[]>("tickets/files", { ticketId }),
      rpc<TicketRun[]>("tickets/runs", { ticketId }),
    ])
      .then(([comments, events, files, runs]) => {
        if (!active) return;
        setData({ comments, events, files, runs });
        setLoaded(true);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(errorText(cause));
      });
    return () => {
      active = false;
    };
  }, [ticketId, revision, local]);

  const working = hasActiveRun(data.runs);
  useEffect(() => {
    if (!working || !foreground) return;
    const timer = setInterval(() => setLocal((count) => count + 1), POLL_MS);
    return () => clearInterval(timer);
  }, [working, foreground]);

  const refresh = useCallback(() => setLocal((count) => count + 1), []);
  const addComment = useCallback(
    (row: TicketComment) =>
      setData((previous) =>
        previous.comments.some((comment) => comment.id === row.id)
          ? previous
          : { ...previous, comments: [...previous.comments, row] },
      ),
    [],
  );
  return { ...data, loaded, error, refresh, addComment };
}
