let gone = false;
const waiting: Array<() => void> = [];

/** Resolves once the launch splash has left the screen, so a system prompt never covers it. */
export function whenSplashGone(): Promise<void> {
  return gone ? Promise.resolve() : new Promise((resolve) => waiting.push(resolve));
}

export function markSplashGone(): void {
  gone = true;
  for (const resolve of waiting.splice(0)) resolve();
}
