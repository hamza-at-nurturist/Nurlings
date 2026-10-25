import { captureApiRequestContext } from "../api";
import { readEventData } from "./event-stream";

/** Opens `boards.subscribe`; `onOpen` runs once the server accepted it, then each event. */
export async function subscribeBoard(
  handlers: { onOpen: () => void; onEvent: (event: unknown) => void },
  signal: AbortSignal,
): Promise<void> {
  const context = await captureApiRequestContext();
  const res = await fetch(`${context.apiBase}/rpc/boards/subscribe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      origin: "rakazo://",
      ...context.headers,
    },
    body: JSON.stringify({ json: {} }),
    signal,
  });
  if (!res.ok || !res.body) {
    void res.body?.cancel().catch(() => undefined);
    throw Object.defineProperties(new Error(`rpc boards/subscribe failed (${res.status})`), {
      status: { value: res.status },
    });
  }
  handlers.onOpen();
  await readEventData(res.body, handlers.onEvent, signal);
}
