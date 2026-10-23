import type { NestMood } from "@rakazo/contracts";
import { WAITING_ON_USER_RUN_STATUSES, WORKING_RUN_STATUSES } from "./run-state.js";

/** A Nurling with nothing armed and no run for this long is asleep. */
export const NEST_SLEEP_AFTER_MS = 24 * 60 * 60 * 1000;

export type NestMoodInput = {
  /** Status of the newest foreground run that is still active, or "idle" when there is none. */
  status: string;
  /** The newest foreground run failed and the Nurling is not waiting on the user. */
  hasRunError: boolean;
  /** An active routine has a next run or check scheduled. */
  hasArmedRoutine: boolean;
  /** When the newest foreground run was created, or null when there is none to count. */
  lastRunAt: Date | null;
  now: Date;
};

/** The one place a Nurling's mood is decided. Precedence: needs you, error, working, idle, sleeping. */
export function nestMood(input: NestMoodInput): NestMood {
  if (WAITING_ON_USER_RUN_STATUSES.some((status) => status === input.status)) return "needs_you";
  if (input.hasRunError) return "error";
  if (WORKING_RUN_STATUSES.some((status) => status === input.status)) return "working";
  if (input.hasArmedRoutine) return "idle";
  if (input.lastRunAt && input.now.getTime() - input.lastRunAt.getTime() < NEST_SLEEP_AFTER_MS) {
    return "idle";
  }
  return "sleeping";
}
