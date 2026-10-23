import type { NestSnapshot } from "@rakazo/contracts";
import { isRetryableError } from "@rakazo/core";
import { useEffect, useState } from "react";
import { rpc } from "./rpc";

/** Same cadence as the sidebar roster. */
export const NEST_POLL_MS = 3_000;

const loadSnapshot = () => rpc.nest.snapshot();

export type NestSnapshotState =
  | { status: "loading" }
  | { status: "ready"; snapshot: NestSnapshot }
  | { status: "failed"; error: unknown };

/**
 * Polls the snapshot only while the page is visible: on mount, on becoming visible or focused, and
 * every few seconds after that. A tick is skipped while a request is in flight, so responses
 * cannot arrive out of order. A failed refresh keeps the last snapshot and tries again; an error
 * that retrying cannot fix stops the polling.
 */
export function useNestSnapshot(
  load: () => Promise<NestSnapshot> = loadSnapshot,
  intervalMs = NEST_POLL_MS,
): NestSnapshotState {
  const [state, setState] = useState<NestSnapshotState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let timer: number | undefined;
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    const refresh = async () => {
      if (cancelled || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const snapshot = await load();
        if (!cancelled) setState({ status: "ready", snapshot });
      } catch (error) {
        if (cancelled) return;
        if (!isRetryableError(error)) {
          stop();
          setState({ status: "failed", error });
        }
      } finally {
        inFlight = false;
      }
    };
    const onVisible = () => void refresh();
    void refresh();
    timer = window.setInterval(() => void refresh(), intervalMs);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      stop();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, intervalMs]);

  return state;
}
