import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./helpers";

test("avatars show every state, the three tool props and the working variants", async ({
  page,
}, testInfo) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1120, height: 760 });
  await page.goto("/e2e/fixtures/avatar-states.html");

  const big = (id: string) => page.locator(`[aria-label^="${id}"]`).first();
  const stateOf = (label: string, size: 96 | 24) =>
    page.locator(`[data-row$="-${size}"] svg[aria-label^="${label},"]`).first();

  await expect(stateOf("Idle", 96)).toHaveAttribute("data-state", "idle");
  await expect(stateOf("Thinking", 96)).toHaveAttribute("data-state", "thinking");
  await expect(stateOf("Working", 96)).toHaveAttribute("data-look", "orbit");
  await expect(stateOf("Needs you", 96)).toHaveAttribute("data-state", "needs");
  await expect(stateOf("In review", 96)).toHaveAttribute("data-state", "review");
  await expect(stateOf("Blocked", 96)).toHaveAttribute("data-state", "blocked");
  await expect(stateOf("Done", 96)).toHaveAttribute("data-state", "done");
  await expect(stateOf("Asleep", 96)).toHaveAttribute("data-state", "asleep");

  // The accessible name carries the state.
  await expect(page.getByRole("img", { name: "Needs you, needs you" }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: "Idle, idle" }).first()).toBeVisible();

  // The tool props, from the category the worker sent.
  for (const [label, look, prop] of [
    ["Writing", "write", ".rakazo-av-scribble"],
    ["Searching", "search", ".rakazo-av-lens"],
    ["Computer", "computer", ".rakazo-av-lid"],
  ] as const) {
    const avatar = stateOf(label, 96);
    await expect(avatar).toHaveAttribute("data-look", look);
    await expect(avatar.locator(prop)).toHaveCount(1);
  }
  await expect(stateOf("Progress ring", 96)).toHaveAttribute("data-look", "ring");
  await expect(stateOf("Ripples", 96)).toHaveAttribute("data-look", "ripple");

  // Three minutes of continuous work make the long-run look.
  await expect(stateOf("Long run", 96)).toHaveAttribute("data-long", "false");
  await page.clock.fastForward(180_000);
  await expect(stateOf("Long run", 96)).toHaveAttribute("data-long", "true");
  await expect(big("Long run").locator(".rakazo-av-sweat")).toHaveCount(1);

  // At 24px nothing moves and no prop is drawn: only the pip tells the state.
  const small = stateOf("Needs you", 24);
  await expect(small).toHaveAttribute("data-still", "true");
  await expect(small.locator(".rakazo-av-pip-warn")).toHaveCount(1);
  await expect(small.locator(".rakazo-av-orbit")).toHaveCount(0);
  await expect(small.locator(".rakazo-av-body")).toHaveCSS("animation-name", "none");
  await expect(stateOf("Working", 24).locator(".rakazo-av-orbit")).toHaveCount(0);

  await captureScreenshot(page, testInfo, "avatar-states");
});

test("shaking the pointer makes avatars dizzy, but not sleeping or thinking ones", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1120, height: 760 });
  await page.goto("/e2e/fixtures/avatar-states.html");
  const idle = page.locator('[data-row$="-96"] svg[aria-label^="Idle,"]').first();
  const asleep = page.locator('[data-row$="-96"] svg[aria-label^="Asleep,"]').first();
  const thinking = page.locator('[data-row$="-96"] svg[aria-label^="Thinking,"]').first();
  await expect(idle).toHaveAttribute("data-dizzy", "false");

  for (let i = 0; i < 14; i += 1) {
    await page.mouse.move(i % 2 ? 300 : 420, 300);
    await page.waitForTimeout(40);
  }
  await expect(idle).toHaveAttribute("data-dizzy", "true");
  await expect(idle.locator(".rakazo-av-spiral").first()).toHaveCSS("opacity", "1");
  await expect(asleep).toHaveAttribute("data-dizzy", "false");
  await expect(thinking).toHaveAttribute("data-dizzy", "false");
  await expect(idle).toHaveAttribute("data-dizzy", "false", { timeout: 4000 });
});

test("the face follows the pointer and stays put when motion is reduced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1120, height: 760 });
  await page.goto("/e2e/fixtures/avatar-states.html");
  const idle = page.locator('[data-row$="-96"] svg[aria-label^="Idle,"]').first();
  const box = (await idle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2);
  await expect
    .poll(() => idle.evaluate((el) => (el as SVGElement).style.getPropertyValue("--gx")))
    .toMatch(/^0\.[1-9]|^1/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(idle).toHaveAttribute("data-still", "true");
  await expect(idle.locator(".rakazo-av-gaze")).toHaveCSS("transition-duration", "0s");
});
