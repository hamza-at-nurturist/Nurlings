import type { Artifact, TicketComment, TicketEvent, TicketRun } from "@rakazo/contracts";
import { WORKING_RUN_STATUSES } from "@rakazo/core";
import { useCallback, useEffect, useState } from "react";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";

const POLL_MS = 4_000;

/**
 * A ticket's comments, history, files and runs. `revision` is bumped by the board's live events; it
 * refetches without clearing what is shown, so the feed does not flash. While a Nurling has a
 * queued or running run for the ticket it also refetches every few seconds, as the avatars do.
 */
export function useTicketActivity(ticketId: string, revision: number) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [files, setFiles] = useState<Artifact[]>([]);
  const [runs, setRuns] = useState<TicketRun[]>([]);
  const [error, setError] = useState("");
  const [local, setLocal] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      rpc.tickets.comments({ ticketId }),
      rpc.tickets.events({ ticketId }),
      rpc.tickets.files({ ticketId }),
      rpc.tickets.runs({ ticketId }),
    ])
      .then(([nextComments, nextEvents, nextFiles, nextRuns]) => {
        if (!active) return;
        setComments(nextComments);
        setEvents(nextEvents);
        setFiles(nextFiles);
        setRuns(nextRuns);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(errorText(cause));
      });
    return () => {
      active = false;
    };
  }, [ticketId, revision, local]);

  const working = runs.some((run) => WORKING_RUN_STATUSES.some((status) => status === run.status));
  useEffect(() => {
    if (!working) return;
    const timer = setInterval(() => setLocal((count) => count + 1), POLL_MS);
    return () => clearInterval(timer);
  }, [working]);

  /** For the user's own changes, which do not always come back as a board event. */
  const refresh = useCallback(() => setLocal((count) => count + 1), []);
  const addComment = useCallback(
    (row: TicketComment) =>
      setComments((previous) =>
        previous.some((comment) => comment.id === row.id) ? previous : [...previous, row],
      ),
    [],
  );
  return { comments, events, files, runs, error, refresh, addComment };
}
