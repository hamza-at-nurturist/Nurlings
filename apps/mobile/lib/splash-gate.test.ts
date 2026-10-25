import { expect, it } from "vitest";
import { markSplashGone, whenSplashGone } from "./splash-gate";

it("holds callers until the splash is gone, then lets everyone through", async () => {
  const order: string[] = [];
  const early = whenSplashGone().then(() => order.push("early"));
  await Promise.resolve();
  expect(order).toEqual([]);
  order.push("splash gone");
  markSplashGone();
  await early;
  await whenSplashGone().then(() => order.push("late"));
  expect(order).toEqual(["splash gone", "early", "late"]);
});
