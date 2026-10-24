import type { Artifact, TicketComment, TicketEvent } from "@rakazo/contracts";
import { useCallback, useEffect, useState } from "react";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";

/**
 * A ticket's comments, history and files. `revision` is bumped by the board's live events; it
 * refetches without clearing what is shown, so the feed does not flash.
 */
export function useTicketActivity(ticketId: string, revision: number) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [files, setFiles] = useState<Artifact[]>([]);
  const [error, setError] = useState("");
  const [local, setLocal] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      rpc.tickets.comments({ ticketId }),
      rpc.tickets.events({ ticketId }),
      rpc.tickets.files({ ticketId }),
    ])
      .then(([nextComments, nextEvents, nextFiles]) => {
        if (!active) return;
        setComments(nextComments);
        setEvents(nextEvents);
        setFiles(nextFiles);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(errorText(cause));
      });
    return () => {
      active = false;
    };
  }, [ticketId, revision, local]);

  /** For the user's own changes, which do not always come back as a board event. */
  const refresh = useCallback(() => setLocal((count) => count + 1), []);
  const addComment = useCallback(
    (row: TicketComment) =>
      setComments((previous) =>
        previous.some((comment) => comment.id === row.id) ? previous : [...previous, row],
      ),
    [],
  );
  return { comments, events, files, error, refresh, addComment };
}
