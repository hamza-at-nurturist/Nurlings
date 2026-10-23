import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, createNamedBot, signup } from "./helpers";

test("the Nest shows each Nurling with its mood and opens its thread", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const stamp = Date.now();
  await signup(page, `nest-${stamp}@rakazo.test`, "password12", "Nest QA");
  await completeOnboarding(page);
  await createNamedBot(page, "Planner");

  await page.getByTestId("user-menu-trigger").click();
  await page.getByRole("button", { name: "The Nest", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/nest$/);
  await expect(page.getByRole("heading", { name: "The Nest", exact: true })).toBeVisible();

  const card = page.getByRole("link", { name: /Planner/ });
  await expect(card).toBeVisible();
  await expect(card.getByRole("img")).toHaveAccessibleName(
    /^(Working|Idle|Sleeping|Needs you|Error)$/,
  );
  // Nothing waits on the user yet, so there is no tray.
  await expect(page.getByRole("heading", { name: "Needs you", exact: true })).toHaveCount(0);

  // A run that keeps going turns the badge to Working and shows the task.
  await card.click();
  const composer = page.getByPlaceholder(/Message/);
  await composer.fill("keep working until I stop you");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.goto("/app/nest");
  const working = page.getByRole("link", { name: /Planner/ });
  await expect(working.getByRole("img", { name: "Working" })).toBeVisible({ timeout: 15_000 });
  await expect(working).toContainText("keep working until I stop you");
  await captureScreenshot(page, testInfo, "nest-dashboard");

  await working.click();
  await expect(page).toHaveURL(/\/app\/[^/]+$/);
  await expect(page).not.toHaveURL(/\/app\/nest$/);
});
