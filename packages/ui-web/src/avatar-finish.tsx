import type { BotAvatarFinish } from "@rakazo/contracts";
import { DEFAULT_BOT_AVATAR_FINISH } from "@rakazo/contracts";
import { createContext, useContext } from "react";

const AvatarFinishContext = createContext<BotAvatarFinish>(DEFAULT_BOT_AVATAR_FINISH);

/** How every avatar below draws: the account's glint or flat. Without one, glint. */
export const AvatarFinishProvider = AvatarFinishContext.Provider;

export function useAvatarFinish(): BotAvatarFinish {
  return useContext(AvatarFinishContext);
}
