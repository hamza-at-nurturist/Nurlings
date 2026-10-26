import { useEffect, useSyncExternalStore } from "react";
import { rpc, subscribeApiBase } from "../api";

import { createBoardEnabledStore } from "./enabled-store";

export const boardEnabledStore = createBoardEnabledStore(() =>
  rpc<{ ticketBoardEnabled?: boolean }>("me"),
);

// A different server may have a different setting.
subscribeApiBase(() => {
  boardEnabledStore.reset();
  void boardEnabledStore.refresh();
});

/**
 * The server's ticket board flag, read from `me` and kept for the session. `null` while unknown,
 * so a screen reached cold waits instead of flashing a board it may have to leave.
 */
export function useNurlingsBoardEnabled(): boolean | null {
  const value = useSyncExternalStore(boardEnabledStore.subscribe, boardEnabledStore.get);
  useEffect(() => {
    void boardEnabledStore.refresh();
  }, []);
  return value;
}
