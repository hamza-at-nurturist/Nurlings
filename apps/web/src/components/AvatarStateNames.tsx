import { useLingui } from "@lingui/react/macro";
import { BotAvatarStateNamesProvider } from "@rakazo/ui-web";
import type { ReactNode } from "react";

/** Spoken state names for avatars, translated: "{name}, {state}" is the avatar's accessible name. */
export function AvatarStateNames({ children }: { children: ReactNode }) {
  const { t } = useLingui();
  const names = {
    idle: t`idle`,
    thinking: t`thinking`,
    working: t`working`,
    needs: t`needs you`,
    review: t`in review`,
    blocked: t`blocked`,
    done: t`done`,
    asleep: t`asleep`,
  };
  return <BotAvatarStateNamesProvider names={names}>{children}</BotAvatarStateNamesProvider>;
}
