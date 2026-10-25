type Listener = () => void;

/** Whether this server has the ticket board on: `null` until `me` has been read. */
export function createBoardEnabledStore(fetchMe: () => Promise<{ ticketBoardEnabled?: boolean }>) {
  let value: boolean | null = null;
  let loading: Promise<void> | null = null;
  const listeners = new Set<Listener>();
  const set = (next: boolean | null) => {
    if (next === value) return;
    value = next;
    for (const listener of listeners) listener();
  };
  return {
    get: () => value,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Reads `me` again; one request at a time. A failure keeps what is known. */
    refresh(): Promise<void> {
      loading ??= fetchMe()
        .then((me) => set(me.ticketBoardEnabled === true))
        .catch(() => undefined)
        .finally(() => {
          loading = null;
        });
      return loading;
    },
    reset: () => set(null),
  };
}
