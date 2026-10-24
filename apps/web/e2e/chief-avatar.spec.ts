import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./helpers";

test("Chief wears the brand blob as an ordinary avatar shape, idle and working, in both themes", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1500, height: 760 });
  await page.goto("/e2e/fixtures/chief-avatar.html");

  await expect(page.locator(".panel")).toHaveCount(2);
  for (const theme of ["light", "dark"] as const) {
    for (const row of ["idle", "working"] as const) {
      const scope = page.locator(`.panel[data-theme="${theme}"] [data-row="${row}"]`);
      const chief = scope.locator('[data-avatar="chief"]').last().locator(".rakazo-bot-avatar");
      const regular = scope
        .locator('[data-avatar="regular"]')
        .first()
        .locator(".rakazo-bot-avatar");
      await expect(chief).toBeVisible();
      await expect(regular).toBeVisible();
      await expect(chief).toHaveAttribute("data-working", String(row === "working"));
      await expect(regular).toHaveAttribute("data-working", String(row === "working"));
      // Same container, ring and eye group as any other shape; only the eyes' geometry differs.
      await expect(chief.locator(".bot-character-eyes rect")).toHaveCount(2);
      await expect(regular.locator(".bot-character-eyes ellipse")).toHaveCount(2);
      await expect(chief.locator(".rakazo-bot-avatar-ring")).toHaveCount(1);
      await expect(chief.locator("circle[r='60']")).toHaveCount(0);
    }
  }
  await captureScreenshot(page, testInfo, "chief-avatar-idle-working-light-dark");
});
