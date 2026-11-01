import type { AvatarTool, LogoAvatarActivity } from "@rakazo/core";
import { logoAvatarStatusActivity } from "@rakazo/core";
import type { ReactNode } from "react";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/** What an organic avatar reads beyond the activity: the worker-categorised tool and reply writing. */
export interface BotAvatarLive {
  tool: AvatarTool;
  composing: boolean;
}
const NO_LIVE: BotAvatarLive = { tool: "none", composing: false };

export interface BotAvatarActivitySource {
  subscribe(listener: () => void): () => void;
  getActivity(botId: string, status?: string): LogoAvatarActivity;
  getLive?(botId: string): BotAvatarLive;
}
const emptySource: BotAvatarActivitySource = {
  subscribe: () => () => {},
  getActivity: (_id, status) => logoAvatarStatusActivity(status),
};
const Activity = createContext<BotAvatarActivitySource>(emptySource);

/** The app supplies its own event store; shared UI owns no global session state. */
export function BotAvatarActivityProvider({
  source,
  children,
}: {
  source: BotAvatarActivitySource;
  children: ReactNode;
}) {
  return <Activity value={source}>{children}</Activity>;
}
/** Updates as a transition: a busy thread must not starve urgent work such as navigation. */
export function useBotAvatarActivity(identity: string, status?: string): LogoAvatarActivity {
  const source = useContext(Activity);
  const [, setVersion] = useState(0);
  const activity = source.getActivity(identity, status);
  const rendered = useRef(activity);
  rendered.current = activity;
  useEffect(() => {
    const refresh = () => {
      if (source.getActivity(identity, status) !== rendered.current)
        startTransition(() => setVersion((version) => version + 1));
    };
    const unsubscribe = source.subscribe(refresh);
    refresh();
    return unsubscribe;
  }, [source, identity, status]);
  return activity;
}

/**
 * The live tool and composing flag of a bot's busy run. Only an avatar whose run is active listens;
 * a resting avatar reads the empty value and adds no subscription.
 */
export function useBotAvatarLive(identity: string, enabled: boolean): BotAvatarLive {
  const source = useContext(Activity);
  const subscribe = useCallback(
    (listener: () => void) => (enabled ? source.subscribe(listener) : () => {}),
    [source, enabled],
  );
  const snapshot = useCallback(
    () => (enabled ? (source.getLive?.(identity) ?? NO_LIVE) : NO_LIVE),
    [source, identity, enabled],
  );
  return useSyncExternalStore(subscribe, snapshot, () => NO_LIVE);
}

/** Spoken names for the avatar states; the app supplies translated ones. */
const StateNames = createContext<Record<string, string> | undefined>(undefined);
export function BotAvatarStateNamesProvider({
  names,
  children,
}: {
  names: Record<string, string>;
  children: ReactNode;
}) {
  return <StateNames value={names}>{children}</StateNames>;
}
export const useBotAvatarStateNames = () => useContext(StateNames);
