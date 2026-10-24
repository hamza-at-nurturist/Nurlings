import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./helpers";

test("Chief shows the logo blob with its eyes cut out, idle and working, in both themes", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto("/e2e/fixtures/chief-avatar.html");

  const panels = page.locator(".panel");
  await expect(panels).toHaveCount(2);
  for (const theme of ["light", "dark"] as const) {
    const panel = page.locator(`.panel[data-theme="${theme}"]`);
    const idle = panel.locator('[data-row="idle"] svg[data-eye-pattern="0"]').first();
    await expect(idle).toBeVisible();
    // The eyes are cut in the disc colour, so they stay visible on the white blob in any theme.
    const eyeFill = await idle
      .locator(".rakazo-organic-avatar-eyes-idle")
      .evaluate((el) => getComputedStyle(el).fill);
    const discFill = await idle.locator("circle").evaluate((el) => getComputedStyle(el).fill);
    expect(eyeFill).toBe(discFill);

    const working = panel.locator('[data-row="working"] svg[data-working="true"]').first();
    await expect(working).toBeVisible();
    await expect(working).toHaveCSS("filter", /drop-shadow/);
  }
  await captureScreenshot(page, testInfo, "chief-avatar-idle-working-light-dark");
});
