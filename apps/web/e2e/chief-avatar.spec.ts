import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./helpers";

test("Chief wears the brand blob as an organic avatar, idle and working, in both themes", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1500, height: 760 });
  await page.goto("/e2e/fixtures/chief-avatar.html");

  await expect(page.locator(".panel")).toHaveCount(2);
  for (const theme of ["light", "dark"] as const) {
    for (const row of ["idle", "working"] as const) {
      const scope = page.locator(`.panel[data-theme="${theme}"] [data-row="${row}"]`);
      const chief = scope.locator('[data-avatar="chief"]').last().locator(".rakazo-organic-avatar");
      const regular = scope
        .locator('[data-avatar="regular"]')
        .first()
        .locator(".rakazo-organic-avatar");
      await expect(chief).toBeVisible();
      await expect(regular).toBeVisible();
      await expect(chief).toHaveAttribute("data-working", String(row === "working"));
      await expect(regular).toHaveAttribute("data-working", String(row === "working"));
      // An organic avatar with the blob as its body: two pill eyes and no working ring. Retired
      // static shapes draw the bot's own organic body the same way.
      await expect(chief.locator("rect")).toHaveCount(2);
      await expect(chief.locator(".rakazo-bot-avatar-ring")).toHaveCount(0);
      await expect(regular.locator("rect")).toHaveCount(2);
      await expect(regular.locator(".rakazo-bot-avatar-ring")).toHaveCount(0);
    }
  }
  await captureScreenshot(page, testInfo, "chief-avatar-idle-working-light-dark");
});

test("Chief's eyes follow the state animations, and stop for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1500, height: 760 });
  await page.goto("/e2e/fixtures/chief-avatar.html");

  const light = page.locator('.panel[data-theme="light"]');
  const eyesOf = (row: "idle" | "working") =>
    light
      .locator(`[data-row="${row}"] [data-avatar="chief"]`)
      .last()
      .locator(".rakazo-av-eyes")
      .first();

  // Idle eyes drift; working eyes scan.
  await expect(eyesOf("idle")).toHaveCSS("animation-name", "rakazo-av-drift");
  await expect(eyesOf("working")).toHaveCSS("animation-name", "rakazo-av-scan");
  const eyes = eyesOf("working");
  const first = await eyes.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(700);
  const second = await eyes.evaluate((el) => getComputedStyle(el).transform);
  expect(second).not.toBe(first);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(eyesOf("idle")).toHaveCSS("animation-name", "none");
  await expect(eyesOf("working")).toHaveCSS("animation-name", "none");
});
