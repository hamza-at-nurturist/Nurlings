import { useEffect, useState } from "react";
import { selectedSpaceId, selectSpace } from "../api";
import { threadSpaceRequest, threadSpaceSwitchResult } from "../notification-open";

/**
 * Moves the app into the space a notification belongs to before its ticket loads, with the same
 * rules the thread screen uses. No space param means the current one.
 */
export function useTicketSpace(
  spaceId: string | string[] | undefined,
): "ready" | "switching" | "failed" {
  const [active, setActive] = useState<string | null>(() => selectedSpaceId());
  const [failed, setFailed] = useState(false);
  const request = threadSpaceRequest(spaceId, active);
  useEffect(() => {
    if (request.action === "show") {
      setFailed(false);
      return;
    }
    if (request.action === "unavailable") {
      setFailed(true);
      return;
    }
    let cancelled = false;
    const requested = request.spaceId;
    void selectSpace(requested).then((switched) => {
      if (cancelled) return;
      if (threadSpaceSwitchResult(requested, switched, selectedSpaceId()) === "ready") {
        setActive(requested);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [spaceId, active]);
  if (failed) return "failed";
  return request.action === "show" ? "ready" : "switching";
}
