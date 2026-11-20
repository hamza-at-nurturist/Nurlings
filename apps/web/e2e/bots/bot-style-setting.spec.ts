import { expect, test } from "@playwright/test";
import {
  captureScreenshot,
  completeOnboarding,
  openUserSettings,
  signup,
} from "../helpers/helpers";

test("bot style switches every avatar between Glint and Flat and keeps the choice", async ({
  page,
}, testInfo) => {
  await signup(page, `bot-style-${Date.now()}@rakazo.test`, "password12", "Tester");
  await completeOnboarding(page);
  await page.goto("/app");
  await page.waitForURL(/\/app\/[^/]+$/);

  // Avatars start in the full look, with their eye shine and gloss.
  const avatars = page.locator("svg.rakazo-organic-avatar");
  await expect(avatars.first()).toBeVisible();
  await expect(avatars.first()).toHaveAttribute("data-glint", "true");
  await expect(page.locator('svg.rakazo-organic-avatar[data-glint="false"]')).toHaveCount(0);

  const settings = await openUserSettings(page);
  const picker = settings.getByTestId("bot-style-select");
  const glint = picker.getByRole("button", { name: "Glint", exact: true });
  const flat = picker.getByRole("button", { name: "Flat", exact: true });
  // The old Original and Rakazo choices are gone; Glint is the default.
  await expect(picker.getByRole("button")).toHaveCount(2);
  await expect(glint).toHaveAttribute("aria-pressed", "true");
  await expect(flat).toHaveAttribute("aria-pressed", "false");
  await captureScreenshot(page, testInfo, "bot-style-glint");

  await flat.click();
  await expect(flat).toHaveAttribute("aria-pressed", "true");
  // Every avatar on the page loses its gloss and eye shine.
  await expect(page.locator('svg.rakazo-organic-avatar[data-glint="true"]')).toHaveCount(0);
  await expect(avatars.first()).toHaveAttribute("data-glint", "false");
  await expect(page.locator("svg.rakazo-organic-avatar .rakazo-av-gloss")).toHaveCount(0);
  await captureScreenshot(page, testInfo, "bot-style-flat");

  // The choice belongs to the account, so it survives a reload.
  await page.reload();
  const reopened = await openUserSettings(page);
  await expect(
    reopened.getByTestId("bot-style-select").getByRole("button", { name: "Flat", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(avatars.first()).toHaveAttribute("data-glint", "false");

  await reopened
    .getByTestId("bot-style-select")
    .getByRole("button", { name: "Glint", exact: true })
    .click();
  await expect(avatars.first()).toHaveAttribute("data-glint", "true");
});
