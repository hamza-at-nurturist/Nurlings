import type { Bot } from "@rakazo/contracts";
import { ACTIVE_RUN_STATUSES } from "@rakazo/core";
import { useEffect, useState } from "react";
import { rpc } from "../../../lib/rpc";

const POLL_MS = 4_000;

/**
 * The board loads its Nurlings once, so their run status would be stale. This keeps the status
 * fresh for the avatars: on every board event, and while any Nurling is working.
 */
export function useLiveBots(initial: Bot[], revision: number): Bot[] {
  const [bots, setBots] = useState(initial);
  const working = bots.some((bot) => ACTIVE_RUN_STATUSES.some((status) => status === bot.status));

  useEffect(() => {
    let active = true;
    const load = () =>
      void rpc.bots
        .list()
        .then((next) => {
          if (active) setBots(next);
        })
        .catch(() => undefined);
    load();
    const timer = working ? setInterval(load, POLL_MS) : undefined;
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [revision, working]);

  return bots.length ? bots : initial;
}
