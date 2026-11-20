import type { BotAvatarFinish } from "@rakazo/contracts";
import { DEFAULT_BOT_AVATAR_FINISH, resolveBotAvatarFinish } from "@rakazo/contracts";
import { useSyncExternalStore } from "react";

// The account's finish, read from the server's account record. In memory only: a launch starts on
// glint until the account is read, then every avatar redraws.
let finish: BotAvatarFinish = DEFAULT_BOT_AVATAR_FINISH;
const listeners = new Set<() => void>();

export function setAvatarFinish(value: string | null | undefined): void {
  const next = resolveBotAvatarFinish(value);
  if (next === finish) return;
  finish = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** How every avatar draws: the account's glint or flat. */
export function useAvatarFinish(): BotAvatarFinish {
  return useSyncExternalStore(
    subscribe,
    () => finish,
    () => DEFAULT_BOT_AVATAR_FINISH,
  );
}
