import { isRetryableError, retryDelayMs } from "@rakazo/core";

/** A half-open socket never reports done, so a silent stream is dropped and reopened. */
export const BOARD_IDLE_TIMEOUT_MS = 90_000;
const RECONNECT_BACKOFF_MS = 1_000;

/**
 * The JSON payloads of the `data:` lines in a Server-Sent Events body, as they arrive. Returns
 * when the body ends, the signal aborts, or nothing arrives for `idleMs`.
 */
export async function readEventData(
  body: ReadableStream<Uint8Array>,
  onData: (json: unknown) => void,
  signal: AbortSignal,
  idleMs = BOARD_IDLE_TIMEOUT_MS,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  const emit = (frame: string) => {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (!data || data === "[DONE]") return;
    try {
      const parsed = JSON.parse(data) as { json?: unknown };
      if (parsed.json !== undefined && parsed.json !== null) onData(parsed.json);
    } catch {
      // A malformed frame or a throwing callback does not end the subscription.
    }
  };
  try {
    while (!signal.aborted) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let onAbort: (() => void) | undefined;
      const read = await Promise.race([
        reader.read(),
        new Promise<"idle" | "aborted">((resolve) => {
          timer = setTimeout(() => resolve("idle"), idleMs);
          onAbort = () => resolve("aborted");
          signal.addEventListener("abort", onAbort, { once: true });
          if (signal.aborted) onAbort();
        }),
      ]).finally(() => {
        clearTimeout(timer);
        if (onAbort) signal.removeEventListener("abort", onAbort);
      });
      if (read === "idle" || read === "aborted") return;
      if (read.done) return;
      pending += decoder.decode(read.value, { stream: true }).replace(/\r\n/g, "\n");
      let end = pending.indexOf("\n\n");
      while (end !== -1) {
        emit(pending.slice(0, end));
        pending = pending.slice(end + 2);
        end = pending.indexOf("\n\n");
      }
    }
  } finally {
    void reader.cancel().catch(() => undefined);
  }
}

/**
 * Keeps a board subscription open: reopens it after a dropped or ended stream with the backoff
 * the rest of the app uses, and stops on a failure retrying cannot fix or when `signal` aborts.
 */
export async function keepBoardSubscribed(options: {
  subscribe: (
    handlers: { onOpen: () => void; onEvent: (event: unknown) => void },
    signal: AbortSignal,
  ) => Promise<void>;
  onOpen: () => void;
  onEvent: (event: unknown) => void;
  onError: (cause: unknown) => void;
  signal: AbortSignal;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
}): Promise<void> {
  const wait = options.wait ?? defaultWait;
  while (!options.signal.aborted) {
    let failure: unknown;
    try {
      await options.subscribe({ onOpen: options.onOpen, onEvent: options.onEvent }, options.signal);
    } catch (cause) {
      if (options.signal.aborted) return;
      failure = cause;
      options.onError(cause);
      if (!isRetryableError(cause)) return;
    }
    if (options.signal.aborted) return;
    await wait(retryDelayMs(failure, RECONNECT_BACKOFF_MS), options.signal);
  }
}

function defaultWait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}
