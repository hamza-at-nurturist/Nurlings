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
        .locator(".rakazo-bot-avatar");
      await expect(chief).toBeVisible();
      await expect(regular).toBeVisible();
      await expect(chief).toHaveAttribute("data-working", String(row === "working"));
      await expect(regular).toHaveAttribute("data-working", String(row === "working"));
      // An organic avatar with the blob as its body: two pills in each of the idle and working eye
      // groups, and no working ring. The classic shapes keep their ring and ellipse eyes.
      await expect(chief.locator("rect")).toHaveCount(4);
      await expect(chief.locator(".rakazo-bot-avatar-ring")).toHaveCount(0);
      await expect(regular.locator(".bot-character-eyes ellipse")).toHaveCount(2);
      await expect(regular.locator(".rakazo-bot-avatar-ring")).toHaveCount(1);
    }
  }
  await captureScreenshot(page, testInfo, "chief-avatar-idle-working-light-dark");
});

test("Chief's eyes use the organic idle and working animations, and stop for reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1500, height: 760 });
  await page.goto("/e2e/fixtures/chief-avatar.html");

  const light = page.locator('.panel[data-theme="light"]');
  const idle = light.locator('[data-row="idle"]');
  const working = light.locator('[data-row="working"]');
  const eyesOf = (row: typeof idle, which: "chief" | "classic" | "organic", group: string) => {
    const item =
      which === "chief"
        ? row.locator('[data-avatar="chief"]').last()
        : which === "classic"
          ? row.locator('[data-avatar="regular"]').first()
          : row.locator('[data-avatar="regular"]').last();
    return item.locator(`.rakazo-organic-avatar-eyes-${group}`).first();
  };

  await expect(eyesOf(idle, "chief", "idle")).toHaveCSS(
    "animation-name",
    /^rakazo-eyes-idle-[0-3]$/,
  );
  await expect(eyesOf(working, "chief", "working")).toHaveCSS(
    "animation-name",
    /^rakazo-organic-eyes-loop-[0-3]$/,
  );
  // Same keyframes as an organic avatar's eyes; the classic shapes still have none.
  await expect(eyesOf(idle, "organic", "idle")).toHaveCSS(
    "animation-name",
    /^rakazo-eyes-idle-[0-3]$/,
  );
  await expect(
    idle.locator('[data-avatar="regular"]').first().locator(".rakazo-organic-avatar-eyes"),
  ).toHaveCount(0);

  // The working group shows while working, the idle one while idle.
  await expect(eyesOf(working, "chief", "working")).toHaveCSS("opacity", "1");
  await expect(eyesOf(working, "chief", "idle")).toHaveCSS("opacity", "0");
  await expect(eyesOf(idle, "chief", "idle")).toHaveCSS("opacity", "1");

  // The working eyes keep moving.
  const eyes = eyesOf(working, "chief", "working");
  const first = await eyes.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(700);
  const second = await eyes.evaluate((el) => getComputedStyle(el).transform);
  expect(second).not.toBe(first);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(eyesOf(idle, "chief", "idle")).toHaveCSS("animation-name", "none");
  await expect(eyesOf(working, "chief", "working")).toHaveCSS("animation-name", "none");
});
