import { describe, expect, it, vi } from "vitest";
import { keepBoardSubscribed, readEventData } from "./event-stream";

function bodyOf(chunks: string[], hang = false): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      if (!hang) controller.close();
    },
  });
}

describe("readEventData", () => {
  it("passes each frame's JSON, even when frames split across chunks", async () => {
    const seen: unknown[] = [];
    await readEventData(
      bodyOf(['data: {"json":{"ticketId":"t1"}}\n\ndata: {"js', 'on":{"ticketId":"t2"}}\n\n']),
      (json) => seen.push(json),
      new AbortController().signal,
    );
    expect(seen).toEqual([{ ticketId: "t1" }, { ticketId: "t2" }]);
  });

  it("ignores comments, [DONE], frames with no json and malformed frames", async () => {
    const seen: unknown[] = [];
    await readEventData(
      bodyOf([
        ": keep-alive\n\n",
        "data: [DONE]\n\n",
        'data: {"other":1}\n\n',
        "data: {not json\n\n",
        'event: message\r\ndata: {"json":{"ok":true}}\r\n\r\n',
      ]),
      (json) => seen.push(json),
      new AbortController().signal,
    );
    expect(seen).toEqual([{ ok: true }]);
  });

  it("returns after the idle timeout when nothing arrives", async () => {
    vi.useFakeTimers();
    const done = readEventData(bodyOf([], true), () => {}, new AbortController().signal, 50);
    await vi.advanceTimersByTimeAsync(60);
    await expect(done).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("returns when aborted", async () => {
    const controller = new AbortController();
    const done = readEventData(bodyOf([], true), () => {}, controller.signal);
    controller.abort();
    await expect(done).resolves.toBeUndefined();
  });
});

describe("keepBoardSubscribed", () => {
  const noWait = async () => {};

  it("reopens after a stream ends and after a retryable failure, then stops on abort", async () => {
    const controller = new AbortController();
    let opens = 0;
    const onError = vi.fn();
    await keepBoardSubscribed({
      subscribe: async ({ onOpen }) => {
        opens += 1;
        onOpen();
        if (opens === 1) throw Object.assign(new Error("down"), { status: 503 });
        if (opens === 3) controller.abort();
      },
      onOpen: vi.fn(),
      onEvent: vi.fn(),
      onError,
      signal: controller.signal,
      wait: noWait,
    });
    expect(opens).toBe(3);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("stops on a failure retrying cannot fix", async () => {
    const onError = vi.fn();
    const subscribe = vi.fn(async () => {
      throw Object.assign(new Error("signed out"), { status: 401 });
    });
    await keepBoardSubscribed({
      subscribe,
      onOpen: vi.fn(),
      onEvent: vi.fn(),
      onError,
      signal: new AbortController().signal,
      wait: noWait,
    });
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("waits the server's Retry-After before reopening", async () => {
    const controller = new AbortController();
    const waits: number[] = [];
    let opens = 0;
    await keepBoardSubscribed({
      subscribe: async () => {
        opens += 1;
        if (opens === 1)
          throw Object.assign(new Error("busy"), { status: 429, retryAfterMs: 5000 });
        controller.abort();
      },
      onOpen: vi.fn(),
      onEvent: vi.fn(),
      onError: vi.fn(),
      signal: controller.signal,
      wait: async (ms) => {
        waits.push(ms);
      },
    });
    expect(waits).toEqual([5000]);
  });
});
