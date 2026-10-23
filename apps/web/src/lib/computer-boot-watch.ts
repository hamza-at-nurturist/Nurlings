import { isRetryableError } from "@rakazo/core";
import { useEffect, useRef } from "react";

/** Same cadence as the sidebar roster. */
export const COMPUTER_BOOT_WATCH_MS = 3_000;
/** Time spent asking. A start this long is not a missed read; boot failure handling covers it. */
export const COMPUTER_BOOT_WATCH_MAX_MS = 5 * 60_000;

/**
 * Nothing announces that a computer finished starting, so a view whose last read caught it
 * mid-start would say "booting" for good. While `watching`, ask again every few seconds. The caller
 * turns `watching` off as soon as the state is anything else, which ends the loop. A tick is
 * skipped while a request is in flight or the tab is hidden, and hidden ticks do not use up the
 * bound. An error that retrying cannot fix ends the loop.
 */
export function useComputerBootWatch(
  botId: string | undefined,
  watching: boolean,
  refresh: (botId: string) => Promise<unknown>,
  intervalMs = COMPUTER_BOOT_WATCH_MS,
  maxMs = COMPUTER_BOOT_WATCH_MAX_MS,
): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!watching || !botId) return;
    const maxAttempts = Math.ceil(maxMs / intervalMs);
    let attempts = 0;
    let inFlight = false;
    let cancelled = false;
    const stop = () => window.clearInterval(timer);
    const tick = async () => {
      if (cancelled || inFlight || document.visibilityState !== "visible") return;
      if (attempts >= maxAttempts) {
        stop();
        return;
      }
      attempts += 1;
      inFlight = true;
      try {
        await refreshRef.current(botId);
      } catch (error) {
        if (!isRetryableError(error)) stop();
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      stop();
    };
  }, [botId, watching, intervalMs, maxMs]);
}
